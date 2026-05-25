import { requireAdmin } from "@/lib/auth/requireAdmin";
import { db } from "@/configs/db";
import { moderationLogsTable, usersTable } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sendWarningEmail, sendBlockEmail } from "@/lib/email";

export async function POST(request: Request) {
    try {
        await requireAdmin();

        const body = await request.json();
        const { logId, userEmail, action } = body;

        if (!logId || !userEmail || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const [user] = await db.select().from(usersTable).where(eq(usersTable.email, userEmail));
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (action === "dismiss") {
            await db.update(moderationLogsTable)
                .set({ status: "dismissed" })
                .where(eq(moderationLogsTable.id, logId));
            
            return NextResponse.json({ success: true, message: "Log dismissed" });
        }

        if (action === "warn") {
            const newViolationCount = user.violationCount + 1;
            await db.update(usersTable)
                .set({ violationCount: newViolationCount })
                .where(eq(usersTable.email, userEmail));

            await db.update(moderationLogsTable)
                .set({ status: "warned" })
                .where(eq(moderationLogsTable.id, logId));

            const [log] = await db.select().from(moderationLogsTable).where(eq(moderationLogsTable.id, logId));
            if (log) {
                await sendWarningEmail(userEmail, log.reason, newViolationCount);
            }

            return NextResponse.json({ success: true, message: "User warned successfully" });
        }

        if (action === "block") {
            const newBlockCount = user.blockCount + 1;
            let durationDays = 3;
            if (newBlockCount === 2) durationDays = 7;
            else if (newBlockCount >= 3) durationDays = 14 * Math.pow(2, newBlockCount - 3);

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

            await sendBlockEmail(userEmail, durationDays, newBlockCount);

            return NextResponse.json({ success: true, message: "User blocked successfully" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error: any) {
        console.error("Moderation action error:", error);
        if (error.message === 'NEXT_REDIRECT') {
            throw error; 
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
