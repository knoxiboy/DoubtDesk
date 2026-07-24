import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { contentFlagsTable, doubtsTable } from "@/configs/schema";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { requireTeacher, parseClassroomId } from "@/lib/auth/membership-guard";
import { buildErrorResponse } from "@/lib/errors/error-handler";

const AUTO_HIDE_FLAG_THRESHOLD = 3;
const AUTO_HIDE_WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user?.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const reporterEmail = user.primaryEmailAddress.emailAddress;

        const body = await req.json();
        const { doubtId, reason } = body as { doubtId: number; reason: "spam" | "inappropriate" | "off_topic" };

        if (!doubtId || !Number.isInteger(doubtId) || !reason || !["spam", "inappropriate", "off_topic"].includes(reason)) {
            return NextResponse.json({ error: "Invalid doubtId or reason" }, { status: 400 });
        }

        const [doubt] = await db
            .select({ id: doubtsTable.id })
            .from(doubtsTable)
            .where(eq(doubtsTable.id, doubtId));

        if (!doubt) {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }

        try {
            await db.insert(contentFlagsTable).values({
                doubtId,
                reporterEmail,
                reason,
            });
        } catch (error: unknown) {
            // Unique constraint on (doubtId, reporterEmail) — same user can't flag twice.
            const dbError = error as { code?: string };
            if (dbError?.code === "23505") {
                return NextResponse.json({ error: "You have already flagged this doubt" }, { status: 409 });
            }
            throw error;
        }

        const windowStart = new Date(Date.now() - AUTO_HIDE_WINDOW_MS);
        const [{ value: recentFlagCount }] = await db
            .select({ value: count() })
            .from(contentFlagsTable)
            .where(
                and(
                    eq(contentFlagsTable.doubtId, doubtId),
                    eq(contentFlagsTable.status, "open"),
                    gte(contentFlagsTable.createdAt, windowStart),
                ),
            );

        let autoHidden = false;
        if (recentFlagCount >= AUTO_HIDE_FLAG_THRESHOLD) {
            await db.update(doubtsTable).set({ isHidden: true }).where(eq(doubtsTable.id, doubtId));
            autoHidden = true;
        }

        return NextResponse.json({
            success: true,
            message: "Doubt flagged successfully",
            reason,
            autoHidden,
        });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}

export async function GET(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user?.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const email = user.primaryEmailAddress.emailAddress;

        const { searchParams } = new URL(req.url);
        const classroomIdParam = searchParams.get("classroomId");

        if (!classroomIdParam) {
            return NextResponse.json({ error: "classroomId required" }, { status: 400 });
        }

        const classroomId = parseClassroomId(classroomIdParam);
        await requireTeacher(email, classroomId);

        const flaggedDoubts = await db
            .select({
                doubtId: doubtsTable.id,
                content: doubtsTable.content,
                subject: doubtsTable.subject,
                isHidden: doubtsTable.isHidden,
                flagCount: count(contentFlagsTable.id),
            })
            .from(contentFlagsTable)
            .innerJoin(doubtsTable, eq(contentFlagsTable.doubtId, doubtsTable.id))
            .where(and(eq(doubtsTable.classroomId, classroomId), eq(contentFlagsTable.status, "open")))
            .groupBy(doubtsTable.id, doubtsTable.content, doubtsTable.subject, doubtsTable.isHidden)
            .orderBy(desc(count(contentFlagsTable.id)));

        return NextResponse.json({
            success: true,
            data: flaggedDoubts,
        });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}

// PATCH: teacher moderation actions on a flagged doubt — dismiss the open
// flags (doubt stays as-is), or re-show a doubt that was auto-hidden or
// hidden in error, resolving its flags either way so it drops out of the
// queue.
export async function PATCH(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user?.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const email = user.primaryEmailAddress.emailAddress;

        const body = await req.json();
        const { doubtId, action } = body as { doubtId: number; action: "dismiss" | "reshow" };

        if (!doubtId || !Number.isInteger(doubtId) || !["dismiss", "reshow"].includes(action)) {
            return NextResponse.json({ error: "Invalid doubtId or action" }, { status: 400 });
        }

        const [doubt] = await db
            .select({ id: doubtsTable.id, classroomId: doubtsTable.classroomId })
            .from(doubtsTable)
            .where(eq(doubtsTable.id, doubtId));

        if (!doubt || !doubt.classroomId) {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }

        await requireTeacher(email, doubt.classroomId);

        await db
            .update(contentFlagsTable)
            .set({ status: "resolved" })
            .where(and(eq(contentFlagsTable.doubtId, doubtId), eq(contentFlagsTable.status, "open")));

        if (action === "reshow") {
            await db.update(doubtsTable).set({ isHidden: false }).where(eq(doubtsTable.id, doubtId));
        }

        return NextResponse.json({ success: true, action });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
