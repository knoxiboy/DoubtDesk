import { inngest } from "./client";
import type { NonRetriableError } from "inngest";
import fs from "fs";
import path from "path";
import { db } from "../configs/db";
import { doubtsTable, usersTable, pendingNotificationsTable, repliesTable, videoJobsTable, classroomsTable, classroomFaqsTable, webhooksTable } from "../configs/schema";
import { eq, inArray, and, lt, gte, sql } from "drizzle-orm";
import { emailNotificationLimiter, redisClient } from "@/lib/ratelimit/ratelimit";
import { sendReplyNotificationEmail, sendDigestEmail } from "@/lib/email/email";
import { getAnonymousHandle } from "@/lib/anonymity/anonymity";
import { runVideoPipeline } from "../lib/video/pipeline";
import { groq } from "@/lib/ai/groq-client";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";
import { TEMP_ROOT } from "../lib/video/temp";

interface InngestEvent {
    data: Record<string, unknown>;
}

type InngestStep = {
    sleep: (id: string, duration: string) => Promise<void>;
    run: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
};

type EventData = {
    doubtId?: number;
    replyId?: number;
    replierName?: string;
    replierEmail?: string;
    replyContent?: string;
};

export const helloWorld = inngest.createFunction(
  { id: "hello-world", triggers: [{ event: "test/hello.world" }] },
  async ({ event, step }: { event: InngestEvent; step: InngestStep }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${(event.data as { email?: string }).email}!` };
  }
);

export const cleanupTempAssets = inngest.createFunction(
  { id: "cleanup-temp-assets", triggers: [{ cron: "0 * * * *" }] },
  async ({ step }: { step: InngestStep }) => {
    const deletedFiles = await step.run("delete-old-files", async () => {
      const retentionMs = 24 * 60 * 60 * 1000; // 24 hours
      const now = Date.now();
      let count = 0;

      const tmpRoot = TEMP_ROOT;
      if (fs.existsSync(tmpRoot)) {
        const entries = fs.readdirSync(tmpRoot);
        for (const entry of entries) {
          const entryPath = path.join(tmpRoot, entry);
          const stats = fs.statSync(entryPath);
          const isStale = now - stats.mtimeMs > retentionMs;

          if (entry.startsWith("doubtdesk-audio-") && stats.isDirectory() && isStale) {
            fs.rmSync(entryPath, { recursive: true, force: true });
            count++;
            continue;
          }

          if (/^video-.*\.mp4$/i.test(entry) && stats.isFile() && isStale) {
            fs.unlinkSync(entryPath);
            count++;
          }
        }
      }

      return count;
    });

    return { message: `Successfully cleaned up ${deletedFiles} old media files.` };
  }
);

export const sendReplyNotification = inngest.createFunction(
  { id: "send-reply-notification", triggers: [{ event: "reply.created" }] },
  async ({ event, step }: { event: InngestEvent; step: InngestStep }) => {
    const { doubtId, replyId, replierName, replierEmail, replyContent } = event.data as EventData;

    if (!doubtId || !replyId) {
        return { success: false, reason: "Missing doubtId or replyId in event data." };
    }

    // 1. Fetch parent doubt and original author details
    const doubt = await step.run("fetch-doubt-and-author", async () => {
      const [d] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId)).limit(1);
      if (!d || !d.userEmail) return null;

      // Get original author preferences from db
      const [u] = await db.select().from(usersTable).where(eq(usersTable.email, d.userEmail)).limit(1);
      return {
        email: d.userEmail,
        subject: d.subject,
        content: d.content || "",
        authorName: d.userEmail?.split('@')[0] || "Student",
        notificationsEnabled: u ? u.emailNotificationsEnabled : true,
        notificationPreference: u ? u.notificationPreference : "instant",
      };
    });

    if (!doubt) {
      return { success: false, reason: "Doubt or user email not found." };
    }

    // 2. Security Check: Avoid notifying if author themselves replied
    if (doubt.email && replierEmail === doubt.email) {
      return { success: true, reason: "Skipped: Replier is the doubt author." };
    }

    // 3. User preference check: Opt-out verification
    if (!doubt.notificationsEnabled || doubt.notificationPreference === "none") {
      return { success: true, reason: "Skipped: User has disabled email notifications." };
    }

    // 3.5. Queue digest notifications instead of sending immediately
    if (doubt.notificationPreference === "daily" || doubt.notificationPreference === "weekly") {
      const queueResult = await step.run("queue-pending-notification", async () => {
        await db.insert(pendingNotificationsTable).values({
          userEmail: doubt.email,
          doubtId,
          replyId,
        });
        return { success: true };
      });
      return { success: true, reason: "Queued for digest notification.", queueResult };
    }

    // 4. Rate-limiting check: Prevents spamming emails for rapid replies
    const rateLimitKey = `email_notify:${doubtId}:${replierEmail}`;
    const limitResult = await step.run("check-rate-limit", async () => {
      const result = await emailNotificationLimiter.limit(rateLimitKey);
      return {
        success: result.success,
        reset: result.reset,
      };
    });

    if (!limitResult.success) {
      console.log(`[RATE LIMIT EXCEEDED] Notification skipped for doubt ${doubtId} to prevent email spam.`);
      return { success: false, reason: "Rate limit exceeded. Notification skipped." };
    }

    // 5. Send notification email
    const sendResult = await step.run("send-email", async () => {
      return await sendReplyNotificationEmail({
        toEmail: doubt.email,
        doubtId,
        doubtSubject: doubt.subject,
        doubtContent: doubt.content,
        replierName: replierName || "Someone",
        replyContent: replyContent || "",
      });
    });

    return { success: true, sendResult };
  }
);

export const sendDailyDigest = inngest.createFunction(
  { id: "send-daily-digest", triggers: [{ cron: "0 8 * * *" }] },
  async ({ step }: { step: InngestStep }) => {
    // Step 1: fetch the target user list — this checkpoint is memoised by Inngest on retry.
    const dailyUsers = await step.run("fetch-daily-users", async () => {
      return db
        .select()
        .from(usersTable)
        .where(eq(usersTable.notificationPreference, "daily"));
    });

    if (dailyUsers.length === 0) {
      return { message: "No users with daily digest preference." };
    }

    let digestedCount = 0;

    // Step 2: one isolated step per user — Inngest memoises completed steps,
    // so a mid-run crash only retries the failed user, not the whole batch.
    for (const user of dailyUsers) {
      const result = await step.run(`send-daily-digest-${user.email}`, async () => {
        const pending = await db
          .select({
            id: pendingNotificationsTable.id,
            doubtId: pendingNotificationsTable.doubtId,
            doubtSubject: doubtsTable.subject,
            doubtContent: doubtsTable.content,
            replyId: pendingNotificationsTable.replyId,
            replierName: repliesTable.userEmail,
            replyContent: repliesTable.content,
          })
          .from(pendingNotificationsTable)
          .innerJoin(doubtsTable, eq(pendingNotificationsTable.doubtId, doubtsTable.id))
          .innerJoin(repliesTable, eq(pendingNotificationsTable.replyId, repliesTable.id))
          .where(eq(pendingNotificationsTable.userEmail, user.email));

        if (pending.length === 0) return { skipped: true };

        const doubtsMap = new Map<number, {
          id: number;
          subject: string;
          content: string;
          replies: Array<{ replierName: string; content: string }>;
        }>();

        for (const p of pending) {

          if (!doubtsMap.has(p.doubtId)) {

            doubtsMap.set(p.doubtId, {
              id: p.doubtId,
              subject: p.doubtSubject,
              content: p.doubtContent || "",
              replies: [],
            });
          }
          doubtsMap.get(p.doubtId)!.replies.push({
            replierName: getAnonymousHandle(p.replierName),
            content: p.replyContent || "",
          });
        }

        // Send first; only delete on confirmed provider acceptance.
        // Simulated / unconfigured delivery must NOT clear the queue.
        const emailResult = await sendDigestEmail({
          toEmail: user.email,
          subject: "[DoubtDesk] Your Daily Doubt Updates Digest",
          totalReplies: pending.length,
          totalDoubts: doubtsMap.size,
          doubts: Array.from(doubtsMap.values()),
        });

        if (!emailResult?.success || emailResult.simulated) {
          const error = emailResult?.error ?? "unknown error";
          console.error(
            `Daily digest email failed for ${user.email}; retaining pending rows: ${error}`,
          );
          // Do not throw — isolate failure so later users in the batch still run.
          return { skipped: true, retained: true, error };
        }

        // Delete only after confirmed send.
        const notificationIds = pending.map(p => p.id);
        await db
          .delete(pendingNotificationsTable)
          .where(inArray(pendingNotificationsTable.id, notificationIds));
        return { skipped: false };
      });

      if (!result.skipped) digestedCount++;
    }

    return { message: `Successfully sent daily digest to ${digestedCount} users.` };
  }
);

export const sendWeeklyDigest = inngest.createFunction(
  { id: "send-weekly-digest", triggers: [{ cron: "0 8 * * 1" }] },
  async ({ step }: { step: InngestStep }) => {
    const weeklyUsers = await step.run("fetch-weekly-users", async () => {
      return db
        .select()
        .from(usersTable)
        .where(eq(usersTable.notificationPreference, "weekly"));
    });

    if (weeklyUsers.length === 0) {
      return { message: "No users with weekly digest preference." };
    }

    let digestedCount = 0;

    for (const user of weeklyUsers) {
      const result = await step.run(`send-weekly-digest-${user.email}`, async () => {
        const pending = await db
          .select({
            id: pendingNotificationsTable.id,
            doubtId: pendingNotificationsTable.doubtId,
            doubtSubject: doubtsTable.subject,
            doubtContent: doubtsTable.content,
            replyId: pendingNotificationsTable.replyId,
            replierName: repliesTable.userEmail,
            replyContent: repliesTable.content,
          })
          .from(pendingNotificationsTable)
          .innerJoin(doubtsTable, eq(pendingNotificationsTable.doubtId, doubtsTable.id))
          .innerJoin(repliesTable, eq(pendingNotificationsTable.replyId, repliesTable.id))
          .where(eq(pendingNotificationsTable.userEmail, user.email));

        if (pending.length === 0) return { skipped: true };

        const doubtsMap = new Map<number, {
          id: number;
          subject: string;
          content: string;
          replies: Array<{ replierName: string; content: string }>;
        }>();

        for (const p of pending) {
          if (!doubtsMap.has(p.doubtId)) {
            doubtsMap.set(p.doubtId, {
              id: p.doubtId,
              subject: p.doubtSubject,
              content: p.doubtContent || "",
              replies: [],
            });
          }
          doubtsMap.get(p.doubtId)!.replies.push({
            replierName: getAnonymousHandle(p.replierName),
            content: p.replyContent || "",
          });
        }

        const emailResult = await sendDigestEmail({
          toEmail: user.email,
          subject: "[DoubtDesk] Your Weekly Doubt Updates Digest",
          totalReplies: pending.length,
          totalDoubts: doubtsMap.size,
          doubts: Array.from(doubtsMap.values()),
        });

        if (!emailResult?.success || emailResult.simulated) {
          const error = emailResult?.error ?? "unknown error";
          console.error(
            `Weekly digest email failed for ${user.email}; retaining pending rows: ${error}`,
          );
          // Do not throw — isolate failure so later users in the batch still run.
          return { skipped: true, retained: true, error };
        }

        const notificationIds = pending.map(p => p.id);
        await db
          .delete(pendingNotificationsTable)
          .where(inArray(pendingNotificationsTable.id, notificationIds));

        return { skipped: false };
      });

      if (!result.skipped) digestedCount++;
    }

    return { message: `Successfully sent weekly digest to ${digestedCount} users.` };
  }
);

export { detectConfusionSpikes } from "../app/api/inngest/ConfusionSpikeDetector";
export { checkUrgentClassroomActivity, notifyFlaggedContentHidden } from "../app/api/inngest/UrgentActivityDetector";
// ── Async video generation (issue #321) ──────────────────────────────────────
// Runs the OCR -> AI script -> TTS -> Remotion render pipeline off the request
// path, persisting progress to the video_jobs row so clients can stream it.
export const generateVideo = inngest.createFunction(
  { id: "generate-video", retries: 0, triggers: [{ event: "video/generate.requested" }] },
  async ({ event, step }: { event: InngestEvent; step: InngestStep }) => {
    const { jobId, content, imageUrl, lockKey } = event.data as {
      jobId: string;
      content: string | null;
      imageUrl: string | null;
      lockKey?: string;
    };

    if (!jobId) {
      throw new Error("generateVideo: missing jobId in event payload");
    }

    try {
      const result = await step.run("run-video-pipeline", async () => {
        return await runVideoPipeline(
          { content, imageUrl },
          async ({ progress, step: label }) => {
            await db
              .update(videoJobsTable)
              .set({ status: "processing", progress, step: label, updatedAt: new Date() })
              .where(eq(videoJobsTable.id, jobId));
          },
        );
      });

      await step.run("mark-video-complete", async () => {
        await db
          .update(videoJobsTable)
          .set({
            status: "completed",
            progress: 100,
            step: "Done",
            videoUrl: result.videoUrl,
            videoType: result.videoType,
            updatedAt: new Date(),
          })
          .where(eq(videoJobsTable.id, jobId));
      });

      return { jobId, videoUrl: result.videoUrl, type: result.videoType };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Rendering failed";
      await db
        .update(videoJobsTable)
        .set({ status: "failed", error: message, updatedAt: new Date() })
        .where(eq(videoJobsTable.id, jobId));
      throw error;
    } finally {
      // Release the per-user generation lock so the user can start another video.
      if (lockKey) {
        await redisClient.del(lockKey).catch(() => {});
      }
    }
  },
);

// Mark video jobs that have been stuck in queued/processing for too long as
// failed, so the UI doesn't spin forever if a background run was lost.
export const cleanupStaleVideoJobs = inngest.createFunction(
  { id: "cleanup-stale-video-jobs", triggers: [{ cron: "*/15 * * * *" }] },
  async ({ step }: { step: InngestStep }) => {
    return await step.run("fail-stale-video-jobs", async () => {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes
      const failed = await db
        .update(videoJobsTable)
        .set({
          status: "failed",
          error: "Video generation timed out",
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(videoJobsTable.status, ["queued", "processing"]),
            lt(videoJobsTable.updatedAt, cutoff),
          ),
        )
        .returning({ id: videoJobsTable.id });
      return { failedStaleJobs: failed.length };
    });
  },
);

export const generateClassroomFaqs = inngest.createFunction(
  { id: "generate-classroom-faqs", triggers: [{ cron: "0 0 * * 0" }] },
  async ({ step }: { step: InngestStep }) => {
    const classrooms = await step.run("fetch-classrooms", async () => {
      return await db.select({ id: classroomsTable.id }).from(classroomsTable);
    });

    let generatedCount = 0;

    for (const room of classrooms) {
      await step.run(`process-classroom-${room.id}`, async () => {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const resolvedDoubts = await db
          .select({ id: doubtsTable.id, subject: doubtsTable.subject, content: doubtsTable.content })
          .from(doubtsTable)
          .where(
            and(
              eq(doubtsTable.classroomId, room.id),
              eq(doubtsTable.isSolved, 'solved'),
              gte(doubtsTable.createdAt, oneWeekAgo)
            )
          );

        if (resolvedDoubts.length === 0) return;

        const doubtsText = resolvedDoubts.map(d => `ID: ${d.id}\nSubject: ${d.subject}\nContent: ${d.content}`).join('\n\n');

        const systemPrompt = `Cluster the following resolved student doubts into 3-5 distinct FAQ topics.
Return JSON: [{ "topic": "...", "question": "...", "answer": "...", "sourceDoubtIds": [...] }]
The sourceDoubtIds should be an array of integers corresponding to the IDs of the doubts that fall into that topic.`;

        const response = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: doubtsText }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const resultText = response.choices[0]?.message?.content || "{}";
        let faqs: any[] = [];
        try {
            const parsed = JSON.parse(resultText);
            // sometimes it's an array, sometimes it's wrapped in an object like { faqs: [...] }
            faqs = Array.isArray(parsed) ? parsed : (parsed.faqs || parsed.topics || Object.values(parsed)[0] || []);
        } catch (e) {
            console.error("Failed to parse FAQ JSON", e);
            return;
        }

        if (!Array.isArray(faqs) || faqs.length === 0) return;

        const formattedFaqs = faqs.map(faq => ({
            classroomId: room.id,
            topic: faq.topic || "General",
            question: faq.question || "Unknown question",
            answer: faq.answer || "Unknown answer",
            sourceDoubtIds: Array.isArray(faq.sourceDoubtIds) ? faq.sourceDoubtIds.map(Number) : [],
            isPublished: false
        }));

        await db.insert(classroomFaqsTable).values(formattedFaqs);
        generatedCount += formattedFaqs.length;
      });
    }

    return { message: `Generated ${generatedCount} FAQs across ${classrooms.length} classrooms.` };
  }
);

export const dispatchWebhooksOnCreate = inngest.createFunction(
    { id: "dispatch-webhooks-on-create", triggers: [{ event: "doubt/created" }] },
    async ({ event, step }: { event: any; step: InngestStep }) => {
        const { classroomId, doubtId } = event.data;
        await step.run("dispatch-webhooks", async () => {
            const webhooks = await db.select().from(webhooksTable).where(and(eq(webhooksTable.classroomId, classroomId), eq(webhooksTable.isActive, true)));
            
            const doubtData = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId)).limit(1);
            const doubt = doubtData[0];
            if (!doubt) return;

            const matchingWebhooks = webhooks.filter(w => w.events.includes('doubt.created'));
            
            for (const webhook of matchingWebhooks) {
                await dispatchWebhook(webhook.url, webhook.secret, webhook.platform as any, {
                    event: 'doubt.created',
                    data: {
                        subject: doubt.subject,
                        difficulty: doubt.difficulty,
                        content: doubt.content,
                        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://doubtdesk.com'}/rooms/${classroomId}?tab=community`
                    }
                }).catch(err => console.error(`Failed to dispatch webhook ${webhook.id}`, err));
            }
        });
    }
);

export const dispatchWebhooksOnFlag = inngest.createFunction(
    { id: "dispatch-webhooks-on-flag", triggers: [{ event: "doubt/auto-hidden" }] },
    async ({ event, step }: { event: any; step: InngestStep }) => {
        const { classroomId, doubtId } = event.data;
        await step.run("dispatch-webhooks", async () => {
            const webhooks = await db.select().from(webhooksTable).where(and(eq(webhooksTable.classroomId, classroomId), eq(webhooksTable.isActive, true)));
            
            const doubtData = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId)).limit(1);
            const doubt = doubtData[0];
            if (!doubt) return;

            const matchingWebhooks = webhooks.filter(w => w.events.includes('doubt.flagged'));
            
            for (const webhook of matchingWebhooks) {
                await dispatchWebhook(webhook.url, webhook.secret, webhook.platform as any, {
                    event: 'doubt.flagged',
                    data: {
                        subject: doubt.subject,
                        difficulty: doubt.difficulty,
                        content: doubt.content,
                        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://doubtdesk.com'}/rooms/${classroomId}?tab=community`
                    }
                }).catch(err => console.error(`Failed to dispatch webhook ${webhook.id}`, err));
            }
        });
    }
);