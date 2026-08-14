import { requireAdmin } from "@/lib/auth/requireAdmin";
import { db } from "@/configs/db";
import { moderationLogsTable, usersTable } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendWarningEmail, sendBlockEmail } from "@/lib/email/email";
import { auditLog, AUDIT_ACTIONS } from "@/lib/audit/audit";
import { currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { parseAndValidateRequest } from "@/lib/validations/validate";

const moderationActionSchema = z.object({
  logId: z.number().int().positive(),
  userEmail: z.string().email(),
  action: z.enum(["dismiss", "warn", "block"]),
});

export async function POST(req: Request) {
    try {
        const adminUser = await currentUser();
        const adminEmail = adminUser?.primaryEmailAddress?.emailAddress || "admin";
        await requireAdmin();

        const { errorResponse, data } = await parseAndValidateRequest(req, moderationActionSchema);
        if (errorResponse) return errorResponse;

        const { logId, userEmail, action } = data;

        const [user] = await db.select().from(usersTable).where(eq(usersTable.email, userEmail));
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (action === "dismiss") {
            await db.update(moderationLogsTable)
                .set({ status: "dismissed" })
                .where(eq(moderationLogsTable.id, logId));

            void auditLog({
                actorEmail: adminEmail,
                targetEmail: userEmail,
                action: AUDIT_ACTIONS.MODERATION_DISMISSED,
                resourceType: "moderation_log",
                resourceId: logId,
            });

            return NextResponse.json({ success: true, message: "Log dismissed" });
        }

        if (action === "warn") {
            const newViolationCount = user.violationCount + 1;
            const shouldBlock = newViolationCount >= 3;

            if (shouldBlock) {
                const newBlockCount = user.blockCount + 1;
                let durationDays = 3;
                if (newBlockCount === 2) durationDays = 7;
                else if (newBlockCount >= 3) durationDays = 14 * Math.pow(2, newBlockCount - 3);

                const blockedUntil = new Date();
                blockedUntil.setDate(blockedUntil.getDate() + durationDays);

                await db.update(usersTable)
                    .set({
                        violationCount: 0,
                        isBlocked: true,
                        blockedUntil,
                        blockCount: newBlockCount,
                    })
                    .where(eq(usersTable.email, userEmail));

                await sendBlockEmail(userEmail, durationDays, newBlockCount);
            } else {
                await db.update(usersTable)
                    .set({ violationCount: newViolationCount })
                    .where(eq(usersTable.email, userEmail));
            }

            await db.update(moderationLogsTable)
                .set({ status: "warned" })
                .where(eq(moderationLogsTable.id, logId));

            const [log] = await db.select().from(moderationLogsTable).where(eq(moderationLogsTable.id, logId));
            const emailResult = log
                ? await sendWarningEmail(userEmail, log.reason, newViolationCount)
                : { success: false, error: "Moderation log not found for email notification" };

            void auditLog({
                actorEmail: adminEmail,
                targetEmail: userEmail,
                action: shouldBlock ? AUDIT_ACTIONS.USER_BLOCKED : AUDIT_ACTIONS.USER_WARNED,
                resourceType: "user",
                resourceId: userEmail,
                metadata: {
                    violationCount: shouldBlock ? 0 : newViolationCount,
                    ...(shouldBlock && {
                        blockCount: user.blockCount + 1,
                    }),
                    moderationLogId: logId,
                    emailDelivery: emailResult.success
                        ? "accepted"
                        : emailResult.simulated
                          ? "unavailable"
                          : "failed",
                    emailError: emailResult.error,
                    providerMessageId: emailResult.providerMessageId,
                },
            });

            if (emailResult.success) {
                return NextResponse.json({
                    success: true,
                    emailDelivery: "accepted",
                    providerMessageId: emailResult.providerMessageId,
                    message: "User warned and notification email accepted by provider",
                });
            }

            return NextResponse.json({
                success: true,
                emailDelivery: emailResult.simulated ? "unavailable" : "failed",
                message: emailResult.simulated
                    ? "User warned, but email was not sent: email provider is not configured"
                    : `User warned, but email delivery failed: ${emailResult.error ?? "unknown error"}`,
            });
        }

        if (action === "block") {
            const newBlockCount = user.blockCount + 1;
            // Maximum block duration: 365 days (1 year). Without a cap the formula
            // 14 * 2^(blockCount - 3) overflows JavaScript's safe integer range at
            // blockCount >= 53, producing Infinity or an Invalid Date that may
            // clear the block entirely depending on the database driver behaviour.
            const MAX_BLOCK_DAYS = 365;
            let durationDays = 3;
            if (newBlockCount === 2) durationDays = 7;
            else if (newBlockCount >= 3) durationDays = Math.min(14 * Math.pow(2, newBlockCount - 3), MAX_BLOCK_DAYS);

            const blockedUntil = new Date();
            blockedUntil.setDate(blockedUntil.getDate() + durationDays);

            await db.update(usersTable)
                .set({
                    isBlocked: true,
                    blockedUntil,
                    blockCount: newBlockCount
                })
                .where(eq(usersTable.email, userEmail));

            await db.update(moderationLogsTable)
                .set({ status: "blocked" })
                .where(eq(moderationLogsTable.id, logId));

            const emailResult = await sendBlockEmail(userEmail, durationDays, newBlockCount);

            void auditLog({
                actorEmail: adminEmail,
                targetEmail: userEmail,
                action: AUDIT_ACTIONS.USER_BLOCKED,
                resourceType: "user",
                resourceId: userEmail,
                metadata: {
                    durationDays,
                    blockCount: newBlockCount,
                    moderationLogId: logId,
                    emailDelivery: emailResult.success
                        ? "accepted"
                        : emailResult.simulated
                          ? "unavailable"
                          : "failed",
                    emailError: emailResult.error,
                    providerMessageId: emailResult.providerMessageId,
                },
            });

            if (emailResult.success) {
                return NextResponse.json({
                    success: true,
                    emailDelivery: "accepted",
                    providerMessageId: emailResult.providerMessageId,
                    message: "User blocked and notification email accepted by provider",
                });
            }

            return NextResponse.json({
                success: true,
                emailDelivery: emailResult.simulated ? "unavailable" : "failed",
                message: emailResult.simulated
                    ? "User blocked, but email was not sent: email provider is not configured"
                    : `User blocked, but email delivery failed: ${emailResult.error ?? "unknown error"}`,
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: unknown) {
        console.error("Moderation action error:", error);
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
            throw error; 
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
