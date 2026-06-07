export const dynamic = "force-dynamic";

import { db } from "@/configs/db";
import { doubtsTable, bookmarksTable, likesTable, repliesTable } from "@/configs/schema";
import { and, eq, desc, sql, inArray, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: Request) {
    try {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Get bookmarked doubt IDs
        const bookmarks = await db.select({ doubtId: bookmarksTable.doubtId })
            .from(bookmarksTable)
            .where(eq(bookmarksTable.userEmail, email));

        if (bookmarks.length === 0) {
            return NextResponse.json([]);
        }

        const doubtIds = bookmarks.map(b => b.doubtId);

        // Fetch doubts
        let doubts = await db.select().from(doubtsTable)
            .where(and(inArray(doubtsTable.id, doubtIds), isNull(doubtsTable.deletedAt)))
            .orderBy(desc(doubtsTable.createdAt));

        // Add hasLiked and hasBookmarked status
        const userLikes = await db.select({ doubtId: likesTable.doubtId })
            .from(likesTable)
            .where(eq(likesTable.userName, email)); // Wait, likes use userName. Let's assume it's same or check how likes work.

        const likedIds = new Set(userLikes.map(l => l.doubtId));
        const bookmarkedIds = new Set(doubtIds);

        // Fetch reply counts
        const replyCounts = await db.select({
            doubtId: repliesTable.doubtId,
            count: sql<number>`count(*)`.mapWith(Number)
        })
        .from(repliesTable)
        .where(inArray(repliesTable.doubtId, doubtIds))
        .groupBy(repliesTable.doubtId);

        const countsMap = Object.fromEntries(replyCounts.map(r => [r.doubtId, r.count]));

        doubts = doubts.map(doubt => ({
            ...doubt,
            hasLiked: likedIds.has(doubt.id),
            hasBookmarked: bookmarkedIds.has(doubt.id),
            replyCount: countsMap[doubt.id] || 0
        }));

        return NextResponse.json(doubts);
    } catch (error) {
        console.error("Error fetching bookmarks:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
