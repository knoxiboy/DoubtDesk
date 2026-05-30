import { inngest } from "./client";
import fs from "fs";
import path from "path";
import { db } from "../configs/db";
import { doubtsTable, usersTable, pendingNotificationsTable, repliesTable } from "../configs/schema";
import { eq, inArray } from "drizzle-orm";
import { emailNotificationLimiter } from "../lib/ratelimit";
import { sendReplyNotificationEmail, sendDigestEmail } from "../lib/email";
export const helloWorld = inngest.createFunction(
  { id: "hello-world", triggers: [{ event: "test/hello.world" }] },
  async ({ event, step }: { event: any; step: any }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${(event.data as any).email}!` };
  }
);

export const cleanupTempAssets = inngest.createFunction(
  { id: "cleanup-temp-assets", triggers: [{ cron: "0 * * * *" }] },
  async ({ step }: { step: any }) => {
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
  async ({ event, step }: { event: any; step: any }) => {
    const { doubtId, replyId, replierName, replierEmail, replyContent } = event.data;

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
        authorName: d.userName,
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
        replierName,
        replyContent,
      });
    });

    return { success: true, sendResult };
  }
);

export const sendDailyDigest = inngest.createFunction(
  { id: "send-daily-digest", triggers: [{ cron: "0 8 * * *" }] },
  async ({ step }: { step: any }) => {
    const digestedCount = await step.run("process-daily-digest", async () => {
      // 1. Get all users with daily digest preference
      const dailyUsers = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.notificationPreference, "daily"));

      if (dailyUsers.length === 0) return 0;

      let sentCount = 0;

      for (const user of dailyUsers) {
        // Fetch all pending notifications for this user
        const pending = await db
          .select({
            id: pendingNotificationsTable.id,
            doubtId: pendingNotificationsTable.doubtId,
            doubtSubject: doubtsTable.subject,
            doubtContent: doubtsTable.content,
            replyId: pendingNotificationsTable.replyId,
            replierName: repliesTable.userName,
            replyContent: repliesTable.content,
          })
          .from(pendingNotificationsTable)
          .innerJoin(doubtsTable, eq(pendingNotificationsTable.doubtId, doubtsTable.id))
          .innerJoin(repliesTable, eq(pendingNotificationsTable.replyId, repliesTable.id))
          .where(eq(pendingNotificationsTable.userEmail, user.email));

        if (pending.length === 0) continue;

        // Group notifications by doubt
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
              replies: []
            });
          }
          doubtsMap.get(p.doubtId)!.replies.push({
            replierName: p.replierName,
            content: p.replyContent || ""
          });
        }

        // Send digest email
        await sendDigestEmail({
          toEmail: user.email,
          subject: "[DoubtDesk] Your Daily Doubt Updates Digest",
          totalReplies: pending.length,
          totalDoubts: doubtsMap.size,
          doubts: Array.from(doubtsMap.values()),
        });

        // Delete processed pending notifications for this user
        const notificationIds = pending.map(p => p.id);
        await db
          .delete(pendingNotificationsTable)
          .where(inArray(pendingNotificationsTable.id, notificationIds));

        sentCount++;
      }

      return sentCount;
    });

    return { message: `Successfully sent daily digest to ${digestedCount} users.` };
  }
);

export const sendWeeklyDigest = inngest.createFunction(
  { id: "send-weekly-digest", triggers: [{ cron: "0 8 * * 1" }] },
  async ({ step }: { step: any }) => {
    const digestedCount = await step.run("process-weekly-digest", async () => {
      // 1. Get all users with weekly digest preference
      const weeklyUsers = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.notificationPreference, "weekly"));

      if (weeklyUsers.length === 0) return 0;

      let sentCount = 0;

      for (const user of weeklyUsers) {
        // Fetch all pending notifications for this user
        const pending = await db
          .select({
            id: pendingNotificationsTable.id,
            doubtId: pendingNotificationsTable.doubtId,
            doubtSubject: doubtsTable.subject,
            doubtContent: doubtsTable.content,
            replyId: pendingNotificationsTable.replyId,
            replierName: repliesTable.userName,
            replyContent: repliesTable.content,
          })
          .from(pendingNotificationsTable)
          .innerJoin(doubtsTable, eq(pendingNotificationsTable.doubtId, doubtsTable.id))
          .innerJoin(repliesTable, eq(pendingNotificationsTable.replyId, repliesTable.id))
          .where(eq(pendingNotificationsTable.userEmail, user.email));

        if (pending.length === 0) continue;

        // Group notifications by doubt
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
              replies: []
            });
          }
          doubtsMap.get(p.doubtId)!.replies.push({
            replierName: p.replierName,
            content: p.replyContent || ""
          });
        }

        // Send digest email
        await sendDigestEmail({
          toEmail: user.email,
          subject: "[DoubtDesk] Your Weekly Doubt Updates Digest",
          totalReplies: pending.length,
          totalDoubts: doubtsMap.size,
          doubts: Array.from(doubtsMap.values()),
        });

        // Delete processed pending notifications for this user
        const notificationIds = pending.map(p => p.id);
        await db
          .delete(pendingNotificationsTable)
          .where(inArray(pendingNotificationsTable.id, notificationIds));

        sentCount++;
      }

      return sentCount;
    });

    return { message: `Successfully sent weekly digest to ${digestedCount} users.` };
  }
);