// src/app/api/admin/overview/route.ts
export const dynamic = "force-dynamic";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { db } from "@/configs/db";
import {
    usersTable,
    classroomsTable,
    membershipsTable,
    doubtsTable,
    repliesTable,
    confusionAlertsTable,
    moderationLogsTable
} from "@/configs/schema";
import { count, eq, and, gte, sql, desc, isNotNull, isNull } from "drizzle-orm";
import { successResponse, buildErrorResponse } from "@/lib/error-handler";

export async function GET(request: Request) {
    try {
        // 1. Guard route: redirect or throw if not an authorized admin
        await requireAdmin();

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        // 2. Platform-level KPIs
        const totalUsersResult = await db.select({ value: count() }).from(usersTable);
        const totalUsers = totalUsersResult[0]?.value || 0;

        const totalClassroomsResult = await db.select({ value: count() }).from(classroomsTable);
        const totalClassrooms = totalClassroomsResult[0]?.value || 0;

        const totalDoubtsResult = await db.select({ value: count() }).from(doubtsTable).where(isNull(doubtsTable.deletedAt));
        const totalDoubts = totalDoubtsResult[0]?.value || 0;

        const totalAiCallsResult = await db.select({ value: count() }).from(doubtsTable).where(
            and(eq(doubtsTable.type, "ai"), isNull(doubtsTable.deletedAt))
        );
        const totalAiCalls = totalAiCallsResult[0]?.value || 0;

        const activeConfusionAlertsResult = await db.select({ value: count() }).from(confusionAlertsTable).where(eq(confusionAlertsTable.status, "active"));
        const activeConfusionAlerts = activeConfusionAlertsResult[0]?.value || 0;

        // 3. User roles breakdown
        const rolesBreakdown = await db.select({
            role: usersTable.role,
            count: count(),
        })
        .from(usersTable)
        .groupBy(usersTable.role);

        // 4. Active classrooms count (classroom with at least 1 doubt in the last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const activeClassroomsResult = await db.selectDistinct({ id: doubtsTable.classroomId })
            .from(doubtsTable)
            .where(
                and(
                    isNotNull(doubtsTable.classroomId),
                    gte(doubtsTable.createdAt, thirtyDaysAgo),
                    isNull(doubtsTable.deletedAt)
                )
            );
        const activeClassrooms = activeClassroomsResult.length;
        const inactiveClassrooms = Math.max(0, totalClassrooms - activeClassrooms);

        // 5. Subject popularity breakdown
        const subjectVolume = await db.select({
            subject: doubtsTable.subject,
            count: count(),
        })
        .from(doubtsTable)
        .where(isNull(doubtsTable.deletedAt))
        .groupBy(doubtsTable.subject);

        // 6. Detailed classroom health stats
        const classrooms = await db.select({
            id: classroomsTable.id,
            name: classroomsTable.name,
            university: classroomsTable.university,
            year: classroomsTable.year,
            teacherEmail: classroomsTable.teacherEmail,
            teacherName: usersTable.name,
        })
        .from(classroomsTable)
        .leftJoin(usersTable, eq(classroomsTable.teacherEmail, usersTable.email))
        .limit(limit)
        .offset(offset);

        // Sub-queries/Aggregates mapped in JS to stay highly optimized
        const studentCounts = await db.select({
            classroomId: membershipsTable.classroomId,
            count: count(),
        })
        .from(membershipsTable)
        .where(eq(membershipsTable.role, "student"))
        .groupBy(membershipsTable.classroomId);

        const doubtStats = await db.select({
            classroomId: doubtsTable.classroomId,
            total: count(),
            solved: sql<number>`sum(case when ${doubtsTable.isSolved} = 'solved' then 1 else 0 end)::int`,
        })
        .from(doubtsTable)
        .where(isNull(doubtsTable.deletedAt))
        .groupBy(doubtsTable.classroomId);

        const pedagogyStats = await db.select({
            classroomId: doubtsTable.classroomId,
            totalReplies: count(repliesTable.id),
            driftedReplies: sql<number>`sum(case when ${repliesTable.pedagogyDrifted} = true then 1 else 0 end)::int`,
        })
        .from(repliesTable)
        .innerJoin(doubtsTable, eq(repliesTable.doubtId, doubtsTable.id))
        .groupBy(doubtsTable.classroomId);

        const activeAlertsPerClassroom = await db.select({
            classroomId: confusionAlertsTable.classroomId,
            count: count(),
        })
        .from(confusionAlertsTable)
        .where(eq(confusionAlertsTable.status, "active"))
        .groupBy(confusionAlertsTable.classroomId);

        const resolutionTimes = await db.select({
            classroomId: doubtsTable.classroomId,
            avgTimeMins: sql<number>`avg(extract(epoch from (${repliesTable.createdAt} - ${doubtsTable.createdAt})) / 60)::int`,
        })
        .from(doubtsTable)
        .innerJoin(repliesTable, eq(doubtsTable.solvedReplyId, repliesTable.id))
        .where(isNull(doubtsTable.deletedAt))
        .groupBy(doubtsTable.classroomId);

        // Build mapping helpers
        const studentCountMap = new Map(studentCounts.map(c => [c.classroomId, c.count]));
        const doubtStatsMap = new Map(doubtStats.map(d => [d.classroomId, d]));
        const pedagogyStatsMap = new Map(pedagogyStats.map(p => [p.classroomId, p]));
        const alertsCountMap = new Map(activeAlertsPerClassroom.map(a => [a.classroomId, a.count]));
        const resolutionTimeMap = new Map(resolutionTimes.map(r => [r.classroomId, r.avgTimeMins]));

        const classroomHealth = classrooms.map(classroom => {
            const cId = classroom.id;
            const enrolledStudents = studentCountMap.get(cId) || 0;
            const dStats = doubtStatsMap.get(cId) || { total: 0, solved: 0 };
            const pStats = pedagogyStatsMap.get(cId) || { totalReplies: 0, driftedReplies: 0 };
            const alertsCount = alertsCountMap.get(cId) || 0;
            const avgResolutionTime = resolutionTimeMap.get(cId) || 0;

            const driftRate = pStats.totalReplies > 0
                ? Math.round((pStats.driftedReplies / pStats.totalReplies) * 100)
                : 0;

            const resolutionRate = dStats.total > 0
                ? Math.round((dStats.solved / dStats.total) * 100)
                : 0;

            return {
                id: classroom.id,
                name: classroom.name,
                university: classroom.university,
                year: classroom.year,
                teacherEmail: classroom.teacherEmail,
                teacherName: classroom.teacherName || "Unregistered User",
                enrolledStudents,
                totalDoubts: dStats.total,
                solvedDoubts: dStats.solved,
                resolutionRate,
                avgResolutionTime,
                driftRate,
                alertsCount
            };
        });

        // 7. Active confusion alerts details
        const confusionAlerts = await db.select({
            id: confusionAlertsTable.id,
            classroomId: confusionAlertsTable.classroomId,
            classroomName: classroomsTable.name,
            topic: confusionAlertsTable.topic,
            summary: confusionAlertsTable.summary,
            suggestedAction: confusionAlertsTable.suggestedAction,
            confidence: confusionAlertsTable.confidence,
            doubtCount: confusionAlertsTable.doubtCount,
            createdAt: confusionAlertsTable.createdAt,
        })
        .from(confusionAlertsTable)
        .innerJoin(classroomsTable, eq(confusionAlertsTable.classroomId, classroomsTable.id))
        .where(eq(confusionAlertsTable.status, "active"))
        .orderBy(desc(confusionAlertsTable.createdAt));

        // 8. Moderation overview
        const pendingFlagsResult = await db.select({ value: count() }).from(moderationLogsTable).where(eq(moderationLogsTable.status, "pending"));
        const pendingFlags = pendingFlagsResult[0]?.value || 0;

        const totalFlagsResult = await db.select({ value: count() }).from(moderationLogsTable);
        const totalFlags = totalFlagsResult[0]?.value || 0;

        // return compiled JSON response
        return successResponse({
            stats: {
                totalUsers,
                totalClassrooms,
                totalDoubts,
                totalAiCalls,
                activeConfusionAlerts,
                activeClassrooms,
                inactiveClassrooms,
                rolesBreakdown,
                subjectVolume,
                moderationQueue: {
                    pendingFlags,
                    totalFlags
                }
            },
            classroomHealth,
            confusionAlerts
        });

    } catch (error: unknown) {
        console.error("Error generating admin dashboard metrics:", error);
        // Bubble up Next.js redirect calls cleanly
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
            throw error;
        }
        const { status, body } = buildErrorResponse(error);
        return new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" }
        });
    }
}
