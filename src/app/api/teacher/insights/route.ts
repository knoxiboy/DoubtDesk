export const dynamic = "force-dynamic";

import { db } from "@/configs/db";
import { doubtsTable } from "@/configs/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { buildErrorResponse } from "@/lib/error-handler";
import {
    parseClassroomId,
    requireAuth,
    requireTeacher,
} from "@/lib/auth/membership-guard";

export async function GET(req: Request) {
    try {
        const { email } = await requireAuth();

        const { searchParams } = new URL(req.url);
        const classroomIdStr = searchParams.get("classroomId");
        if (!classroomIdStr) {
            return NextResponse.json({ error: "classroomId is required" }, { status: 400 });
        }

        const classroomId = parseClassroomId(classroomIdStr);
        await requireTeacher(email, classroomId);

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
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
