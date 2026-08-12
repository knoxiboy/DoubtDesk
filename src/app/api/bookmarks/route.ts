export const dynamic = "force-dynamic";

import { db } from "@/configs/db";
import { doubtsTable, bookmarksTable, likesTable, repliesTable } from "@/configs/schema";
import { and, eq, desc, sql, inArray, isNull, count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { buildErrorResponse, errorResponse } from "@/lib/errors/error-handler";
import { parsePositiveInt } from "@/lib/utils/utils";

export async function GET(req: Request) {
    try {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) return errorResponse("Unauthorized", 401);

        const { searchParams } = new URL(req.url);
        const pageStr = searchParams.get("page") || "1";
        const limitStr = searchParams.get("limit") || "20";

        const page = parsePositiveInt(pageStr, 1);
        const limit = Math.min(parsePositiveInt(limitStr, 20), 100); // Cap at 100 max
        const offset = (page - 1) * limit;

        const [totalCountResult] = await db
            .select({ total: count() })
            .from(bookmarksTable)
            .innerJoin(doubtsTable, eq(bookmarksTable.doubtId, doubtsTable.id))
            .where(and(
                eq(bookmarksTable.userEmail, email),
                isNull(doubtsTable.deletedAt),
            ));
        const totalBookmarks = totalCountResult?.total || 0;

        if (totalBookmarks === 0) {
            return NextResponse.json({
                data: [],
                pagination: { page, limit, total: 0 }
            });
        }

        // Stable page membership: newest bookmarks first, id as tie-breaker.
        const bookmarks = await db
            .select({
                id: bookmarksTable.id,
                doubtId: bookmarksTable.doubtId,
            })
            .from(bookmarksTable)
            .innerJoin(doubtsTable, eq(bookmarksTable.doubtId, doubtsTable.id))
            .where(and(
                eq(bookmarksTable.userEmail, email),
                isNull(doubtsTable.deletedAt),
            ))
            .orderBy(desc(bookmarksTable.createdAt), desc(bookmarksTable.id))
            .limit(limit)
            .offset(offset);

        if (bookmarks.length === 0) {
            return NextResponse.json({
                data: [],
                pagination: { page, limit, total: totalBookmarks }
            });
        }

        const doubtIds = bookmarks.map((b) => b.doubtId);
        const bookmarkOrder = new Map<number, number>(doubtIds.map((id, index) => [id, index]));

        const doubts = await db.select().from(doubtsTable)
            .where(and(inArray(doubtsTable.id, doubtIds), isNull(doubtsTable.deletedAt)));

        const userLikes = await db.select({ doubtId: likesTable.doubtId })
            .from(likesTable)
            .where(eq(likesTable.userEmail, email));

        const likedIds = new Set(userLikes.map((l) => l.doubtId));
        const bookmarkedIds = new Set(doubtIds);

        const replyCounts = await db.select({
            doubtId: repliesTable.doubtId,
            count: sql<number>`count(*)`.mapWith(Number)
        })
            .from(repliesTable)
            .where(inArray(repliesTable.doubtId, doubtIds))
            .groupBy(repliesTable.doubtId);

        const countsMap = Object.fromEntries(replyCounts.map((r) => [r.doubtId, r.count]));

        const orderedDoubts = [...doubts]
            .sort((a, b) => Number(bookmarkOrder.get(a.id) ?? 0) - Number(bookmarkOrder.get(b.id) ?? 0))
            .map((doubt) => ({
                ...doubt,
                hasLiked: likedIds.has(doubt.id),
                hasBookmarked: bookmarkedIds.has(doubt.id),
                replyCount: countsMap[doubt.id] || 0
            }));

        return NextResponse.json({
            data: orderedDoubts,
            pagination: {
                page,
                limit,
                total: totalBookmarks
            }
        });
    } catch (error) {
        console.error("Error fetching bookmarks:", error);
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
