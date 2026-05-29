import { requireAdmin } from "@/lib/auth/requireAdmin";
import { db } from "@/configs/db";
import { moderationLogsTable, usersTable } from "@/configs/schema";
import { count, eq, desc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        await requireAdmin();

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        // Analytics queries
        const totalFlagsResult = await db.select({ value: count() }).from(moderationLogsTable);
        const totalFlags = totalFlagsResult[0].value;

        const pendingReviewsResult = await db.select({ value: count() }).from(moderationLogsTable).where(eq(moderationLogsTable.status, "pending"));
        const pendingReviews = pendingReviewsResult[0].value;

        const blockedUsersResult = await db.select({ value: count() }).from(usersTable).where(eq(usersTable.isBlocked, true));
        const blockedUsers = blockedUsersResult[0].value;

        const flagsTodayResult = await db.select({ value: count() }).from(moderationLogsTable)
            .where(sql`DATE(${moderationLogsTable.createdAt}) = CURRENT_DATE`);
        const flagsToday = flagsTodayResult[0].value;

        const violationCategories = await db.select({
            name: moderationLogsTable.violationType,
            value: count(),
        }).from(moderationLogsTable).groupBy(moderationLogsTable.violationType);

        const flagsPerDay = await db.select({
            date: sql<string>`DATE(${moderationLogsTable.createdAt})`.as('date_val'),
            count: count(),
        }).from(moderationLogsTable).groupBy(sql`DATE(${moderationLogsTable.createdAt})`).orderBy(sql`DATE(${moderationLogsTable.createdAt}) ASC`).limit(30);

        const formattedFlagsPerDay = flagsPerDay.map(f => ({
            date: typeof f.date === 'string' ? f.date : new Date(f.date).toISOString().split('T')[0],
            count: f.count
        }));

        // Fetch paginated logs
        const logs = await db.select({
            id: moderationLogsTable.id,
            userEmail: moderationLogsTable.userEmail,
            reason: moderationLogsTable.reason,
            violationType: moderationLogsTable.violationType,
            contentSnippet: moderationLogsTable.contentSnippet,
            status: moderationLogsTable.status,
            createdAt: moderationLogsTable.createdAt,
            userName: usersTable.name,
            violationCount: usersTable.violationCount,
            isBlocked: usersTable.isBlocked,
        })
        .from(moderationLogsTable)
        .leftJoin(usersTable, eq(moderationLogsTable.userEmail, usersTable.email))
        .orderBy(desc(moderationLogsTable.createdAt))
        .limit(limit)
        .offset(offset);

        return NextResponse.json({
            stats: {
                totalFlags,
                pendingReviews,
                blockedUsers,
                flagsToday,
                violationCategories,
                flagsPerDay: formattedFlagsPerDay
            },
            logs,
            pagination: {
                page,
                limit,
                total: totalFlags
            }
        });
    } catch (error: any) {
        console.error("Error fetching moderation data:", error);
        if (error.message === 'NEXT_REDIRECT') {
            throw error; 
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
