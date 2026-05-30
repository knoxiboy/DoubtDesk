export const dynamic = "force-dynamic";

import { db } from "@/configs/db";
import { classroomsTable, doubtsTable } from "@/configs/schema";
import { and, eq, sql } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const clerkUser = await currentUser();
        const email = clerkUser?.primaryEmailAddress?.emailAddress;

        if (!email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const classroomIdStr = searchParams.get("classroomId");
        if (!classroomIdStr || !/^[1-9]\d*$/.test(classroomIdStr)) {
            return NextResponse.json({ error: "classroomId is required" }, { status: 400 });
        }

        const classroomId = Number(classroomIdStr);

        const [classroom] = await db
            .select({ id: classroomsTable.id })
            .from(classroomsTable)
            .where(and(eq(classroomsTable.id, classroomId), eq(classroomsTable.teacherEmail, email)));

        if (!classroom) {
            return NextResponse.json({ error: "Forbidden: not the teacher of this classroom" }, { status: 403 });
        }

        const classroomFilter = eq(doubtsTable.classroomId, classroomId);

        // 1. Top Confusion Topics (by doubt count)
        const topTopics = await db
            .select({
                topic: doubtsTable.subTopic,
                subject: doubtsTable.subject,
                count: sql<number>`count(*)::int`,
            })
            .from(doubtsTable)
            .where(and(classroomFilter, sql`${doubtsTable.subTopic} IS NOT NULL`))
            .groupBy(doubtsTable.subTopic, doubtsTable.subject)
            .orderBy(sql`count(*) DESC`)
            .limit(5);

        // 2. Solved vs Unsolved Status
        const statusDistribution = await db
            .select({
                status: doubtsTable.isSolved,
                count: sql<number>`count(*)::int`,
            })
            .from(doubtsTable)
            .where(classroomFilter)
            .groupBy(doubtsTable.isSolved);

        // 3. Subject-wise Volume
        const subjectVolume = await db
            .select({
                subject: doubtsTable.subject,
                count: sql<number>`count(*)::int`,
            })
            .from(doubtsTable)
            .where(classroomFilter)
            .groupBy(doubtsTable.subject);

        return NextResponse.json({
            topTopics,
            statusDistribution,
            subjectVolume,
        });
    } catch (error) {
        console.error("Teacher Insights failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
