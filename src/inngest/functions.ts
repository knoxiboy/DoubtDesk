import { inngest } from "./client";
import type { NonRetriableError } from "inngest";
import fs from "fs";
import path from "path";
import { db } from "../configs/db";
import { doubtsTable, usersTable, pendingNotificationsTable, repliesTable, videoJobsTable } from "../configs/schema";
import { eq, inArray, and, lt } from "drizzle-orm";
import { emailNotificationLimiter, redisClient } from "../lib/ratelimit";
import { sendReplyNotificationEmail, sendDigestEmail } from "../lib/email";
import { runVideoPipeline } from "../lib/video/pipeline";

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
      const tempDir = path.resolve("./public/temp-assets");
      const videosDir = path.resolve("./public/videos");
      const now = Date.now();
      const retentionMs = 24 * 60 * 60 * 1000; // 24 hours
      let count = 0;

      const cleanDir = (dirPath: string) => {
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > retentionMs) {
              fs.unlinkSync(filePath);
              count++;
            }
          }
        }
      };

      cleanDir(tempDir);
      cleanDir(videosDir);
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
    const rateLimitKey = `email_notify:${doubtId}`;
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
            replierName: p.replierName,
            content: p.replyContent || "",
          });
        }

        // Send first; only delete on confirmed success.
        // If sendDigestEmail throws, the catch lets the step fail so Inngest
        // retries it — pending rows are intentionally NOT deleted.
          const emailResult = await sendDigestEmail({
          toEmail: user.email,
          subject: "[DoubtDesk] Your Daily Doubt Updates Digest",
          totalReplies: pending.length,
          totalDoubts: doubtsMap.size,
          doubts: Array.from(doubtsMap.values()),
        });

        if (!emailResult?.success) {
          // Email failed — throw so the step is retried and pending rows are preserved.
          throw new Error(`Daily digest email failed for user: ${emailResult?.error ?? "unknown error"}`);
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
            replierName: p.replierName,
            content: p.replyContent || "",
          });
        }

        try {
          await sendDigestEmail({
            toEmail: user.email,
            subject: "[DoubtDesk] Your Weekly Doubt Updates Digest",
            totalReplies: pending.length,
            totalDoubts: doubtsMap.size,
            doubts: Array.from(doubtsMap.values()),
          });
        } catch (emailErr) {
          console.error(`[sendWeeklyDigest] Email failed for ${user.email}:`, emailErr);
          throw emailErr;
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
// ── Async video generation (issue #321) ──────────────────────────────────────
// Runs the OCR -> AI script -> TTS -> Remotion render pipeline off the request
// path, persisting progress to the video_jobs row so clients can stream it.
export const generateVideo = inngest.createFunction(
  { id: "generate-video", retries: 0, triggers: [{ event: "video/generate.requested" }] },
  async ({ event, step }: { event: InngestEvent; step: InngestStep }) => {
    const { jobId, content, imageUrl, baseUrl, lockKey } = event.data as {
      jobId: string;
      content: string | null;
      imageUrl: string | null;
      baseUrl: string;
      lockKey?: string;
    };

    if (!jobId) {
      throw new Error("generateVideo: missing jobId in event payload");
    }

    try {
      const result = await step.run("run-video-pipeline", async () => {
        return await runVideoPipeline(
          { content, imageUrl, baseUrl },
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