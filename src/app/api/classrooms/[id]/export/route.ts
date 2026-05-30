import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { doubtsTable, classroomsTable, membershipsTable, repliesTable } from "@/configs/schema";
import { and, eq, desc, gte, lte, sql } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Authenticate via Clerk
        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const email = user.primaryEmailAddress.emailAddress;
        const { id } = await params;
        const classroomId = parseInt(id);

        if (isNaN(classroomId)) {
            return NextResponse.json({ error: "Invalid classroom ID" }, { status: 400 });
        }

        // 2. Verify user is a teacher of this classroom
        const [membership] = await db
            .select()
            .from(membershipsTable)
            .where(
                and(
                    eq(membershipsTable.userEmail, email),
                    eq(membershipsTable.classroomId, classroomId)
                )
            );

        if (!membership || membership.role !== "teacher") {
            return NextResponse.json(
                { error: "Forbidden: Only teachers can export classroom doubts" },
                { status: 403 }
            );
        }

        // 3. Get classroom info
        const [classroom] = await db
            .select()
            .from(classroomsTable)
            .where(eq(classroomsTable.id, classroomId));

        if (!classroom) {
            return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
        }

        // 4. Parse optional query parameters
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "all"; // "resolved" | "unresolved" | "all"
        const from = searchParams.get("from"); // ISO date string
        const to = searchParams.get("to"); // ISO date string

        // 5. Build query conditions
        const conditions = [eq(doubtsTable.classroomId, classroomId)];

        if (status === "resolved") {
            conditions.push(eq(doubtsTable.isSolved, "solved"));
        } else if (status === "unresolved") {
            conditions.push(eq(doubtsTable.isSolved, "unsolved"));
        }

        if (from) {
            const fromDate = new Date(from);
            if (!isNaN(fromDate.getTime())) {
                conditions.push(gte(doubtsTable.createdAt, fromDate));
            }
        }

        if (to) {
            const toDate = new Date(to);
            if (!isNaN(toDate.getTime())) {
                conditions.push(lte(doubtsTable.createdAt, toDate));
            }
        }

        // 6. Query doubts
        const doubts = await db
            .select()
            .from(doubtsTable)
            .where(and(...conditions))
            .orderBy(desc(doubtsTable.createdAt));

        // 7. Fetch reply counts for these doubts
        const replyCounts = await db
            .select({
                doubtId: repliesTable.doubtId,
                count: sql<number>`count(*)`.mapWith(Number),
            })
            .from(repliesTable)
            .groupBy(repliesTable.doubtId);

        const countsMap = Object.fromEntries(
            replyCounts.map((r) => [r.doubtId, r.count])
        );

        const doubtsWithReplies = doubts.map((doubt) => ({
            ...doubt,
            replyCount: countsMap[doubt.id] || 0,
        }));

        return NextResponse.json({
            classroomName: classroom.name,
            doubts: doubtsWithReplies,
        });
    } catch (error: unknown) {
        console.error("Error exporting doubts:", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
