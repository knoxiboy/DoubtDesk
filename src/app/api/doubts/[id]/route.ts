import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import {
  bookmarksTable,
  doubtTagsTable,
  doubtsTable,
  likesTable,
  membershipsTable,
  repliesTable,
  replyLikesTable,
  tagsTable,
} from "@/configs/schema";
import { and, eq, asc, desc, inArray, isNull, getTableColumns, sql } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { buildErrorResponse } from "@/lib/error-handler";
import type { Doubt, Tag } from "@/types";

interface ReplyRow {
  id: number;
  doubtId: number;
  userName: string;
  userEmail: string | null;
  type: string;
  content: string | null;
  imageUrl: string | null;
  upvotes: number;
  createdAt: Date | string;
  hasUpvoted?: boolean;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doubtId = parseInt(id);

    if (isNaN(doubtId)) {
      return NextResponse.json({ error: "Invalid doubt ID" }, { status: 400 });
    }

    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress ?? null;

    const [doubt] = await db
      .select({ ...getTableColumns(doubtsTable) })
      .from(doubtsTable)
      .where(eq(doubtsTable.id, doubtId))
      .limit(1);

    if (!doubt) {
      return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
    }

    if (doubt.classroomId && email) {
      const [membership] = await db
        .select()
        .from(membershipsTable)
        .where(
          and(
            eq(membershipsTable.userEmail, email),
            eq(membershipsTable.classroomId, doubt.classroomId)
          )
        )
        .limit(1);

      if (!membership) {
        return NextResponse.json(
          { error: "Access denied to this classroom's doubt" },
          { status: 403 }
        );
      }
    } else if (doubt.classroomId && !email) {
      return NextResponse.json(
        { error: "Authentication required for classroom doubts" },
        { status: 401 }
      );
    }

    const replyCountSql = sql<number>`coalesce((SELECT count(*)::int FROM ${repliesTable} WHERE ${repliesTable.doubtId} = ${doubtsTable.id}), 0)`.mapWith(Number);

    const [countResult] = await db
      .select({ count: replyCountSql })
      .from(doubtsTable)
      .where(eq(doubtsTable.id, doubtId));

    const replyCount = countResult?.count ?? 0;

    let hasLiked = false;
    let hasBookmarked = false;

    if (email) {
      const [like] = await db
        .select()
        .from(likesTable)
        .where(
          and(eq(likesTable.userName, email), eq(likesTable.doubtId, doubtId))
        )
        .limit(1);
      hasLiked = !!like;

      const [bookmark] = await db
        .select()
        .from(bookmarksTable)
        .where(
          and(
            eq(bookmarksTable.userEmail, email),
            eq(bookmarksTable.doubtId, doubtId)
          )
        )
        .limit(1);
      hasBookmarked = !!bookmark;
    }

    const tagRows = await db
      .select({
        id: tagsTable.id,
        name: tagsTable.name,
        normalizedName: tagsTable.normalizedName,
      })
      .from(doubtTagsTable)
      .innerJoin(tagsTable, eq(doubtTagsTable.tagId, tagsTable.id))
      .where(eq(doubtTagsTable.doubtId, doubtId));

    const rawReplies = await db
      .select({ ...getTableColumns(repliesTable) })
      .from(repliesTable)
      .where(eq(repliesTable.doubtId, doubtId))
      .orderBy(asc(repliesTable.createdAt));

    let replies: ReplyRow[] = rawReplies.map((r) => ({
      ...r,
      upvotes: r.upvotes ?? 0,
      hasUpvoted: false,
    }));

    if (email && replies.length > 0) {
      const userUpvotes = await db
        .select({ replyId: replyLikesTable.replyId })
        .from(replyLikesTable)
        .where(eq(replyLikesTable.userName, email));

      const upvotedIds = new Set(userUpvotes.map((u) => u.replyId));
      replies = replies.map((r) => ({
        ...r,
        hasUpvoted: upvotedIds.has(r.id),
      }));
    }

    return NextResponse.json({
      doubt: {
        ...doubt,
        tags: tagRows as Tag[],
        replyCount,
        hasLiked,
        hasBookmarked,
      },
      replies,
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
