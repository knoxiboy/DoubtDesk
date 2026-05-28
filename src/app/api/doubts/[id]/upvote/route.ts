// app/api/doubts/[id]/upvote/route.ts
// POST /api/doubts/[id]/upvote
// Body: { replyId: number, userName: string }
//
// What this does:
//   1. Inserts a row in reply_likes (prevents duplicate upvotes)
//   2. Increments reply.upvotes count
//   3. Fires inngest event → karma/answer.upvoted (+10 karma for reply author)

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { repliesTable, replyLikesTable } from "@/configs/schema";
import { eq, sql } from "drizzle-orm";
import { inngest } from "@/inngest/client";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const doubtId = parseInt(params.id);
    if (isNaN(doubtId)) {
        return NextResponse.json({ error: "Invalid doubt id" }, { status: 400 });
    }

    const body = await req.json();
    const { replyId, userName } = body as { replyId: number; userName: string };

    if (!replyId || !userName) {
        return NextResponse.json(
            { error: "replyId and userName are required" },
            { status: 400 }
        );
    }

    // ── 1. Prevent duplicate upvotes ─────────────────────────────────────────
    // replyLikesTable already has a unique constraint on (userName, replyId)
    // so if user already upvoted, the insert will throw a unique violation.
    try {
        await db.insert(replyLikesTable).values({ userName, replyId });
    } catch {
        return NextResponse.json(
            { error: "You have already upvoted this answer" },
            { status: 409 }
        );
    }

    // ── 2. Increment upvotes counter on the reply ────────────────────────────
    const [updatedReply] = await db
        .update(repliesTable)
        .set({ upvotes: sql`${repliesTable.upvotes} + 1` })
        .where(eq(repliesTable.id, replyId))
        .returning({
            upvotes:   repliesTable.upvotes,
            userEmail: repliesTable.userEmail,
        });

    if (!updatedReply) {
        return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    // ── 3. Fire karma event (only if reply author is a registered user) ──────
    if (updatedReply.userEmail) {
        await inngest.send({
            name: "karma/answer.upvoted",
            data: {
                replyAuthorEmail: updatedReply.userEmail,
                replyId,
                doubtId,
            },
        });
    }

    return NextResponse.json({
        success: true,
        upvotes: updatedReply.upvotes,
    });
}