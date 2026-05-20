import { inngest } from "./client";
import fs from "fs";                  
import path from "path";
import { db } from "../configs/db";
import { doubtsTable, usersTable } from "../configs/schema";
import { eq } from "drizzle-orm";
import { emailNotificationLimiter } from "../lib/ratelimit";
import { sendReplyNotificationEmail } from "../lib/email";

export const helloWorld = inngest.createFunction(
    { id: "hello-world", triggers: [{ event: "test/hello.world" }] }, 
    async ({ event, step }: { event: any, step: any }) => {                
        await step.sleep("wait-a-moment", "1s");
        return { message: `Hello ${(event.data as any).email}!` };
    },
);

export const cleanupTempAssets = inngest.createFunction(
    { id: "cleanup-temp-assets", triggers: [{ cron: "0 * * * *" }] },
    async ({ step }) => {
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
    async ({ event, step }: { event: any, step: any }) => {                    
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
                notificationsEnabled: u ? u.emailNotificationsEnabled : true
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
        if (!doubt.notificationsEnabled) {
            return { success: true, reason: "Skipped: User has disabled email notifications." };
        }

        // 4. Rate-limiting check: Prevents spamming emails for rapid replies
        const rateLimitKey = `email_notify:${doubtId}`;
        const limitResult = await step.run("check-rate-limit", async () => {
            const result = await emailNotificationLimiter.limit(rateLimitKey);
            return {
                success: result.success,
                reset: result.reset
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
                replyContent
            });
        });

        return { success: true, sendResult };
    }
);