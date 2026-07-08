// app/api/doubts/[id]/upvote/route.ts
import { db } from "@/configs/db";
import { repliesTable, replyLikesTable } from "@/configs/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { inngest } from "@/inngest/client";
import { checkUserBlock } from "@/lib/auth/auth-utils";
import { buildErrorResponse } from "@/lib/errors/error-handler";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { voteReplySchema } from "@/lib/validations/reply";

export async function POST(req: Request) {
    try {
        const { errorResponse, data } = await parseAndValidateRequest(req, voteReplySchema);
        if (errorResponse) return errorResponse;

        const { replyId } = data;

        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        const { isBlocked, errorResponse: blockResponse } = await checkUserBlock(email);
        if (blockResponse) return blockResponse;
        if (isBlocked) return blockResponse;

        // ── 1. FETCH TARGET REPLY & VALIDATE EXISTENCE ──────────────────────
        const [reply] = await db
            .select()
            .from(repliesTable)
            .where(eq(repliesTable.id, replyId))
            .limit(1);

        if (!reply) {
            return NextResponse.json({ error: "Reply not found" }, { status: 404 });
        }

        // Capture the author email up front. The karma event must credit
        // whoever owned the reply at the moment the vote was cast, never the
        // post-update returning() row — that row is trusted output of a write
        // we just performed, so any later corruption to repliesTable.userEmail
        // would otherwise leak karma to the wrong account.
        const originalReplyAuthorEmail = reply.userEmail;

        // ── 2. FIX: ANTI-SELF-UPVOTE GUARD ──────────────────────────────────
        // Blocks authors from liking their own replies and exploiting the karma event trigger
        if (email && originalReplyAuthorEmail === email) {
            return NextResponse.json(
                { error: "Forbidden: You cannot upvote your own reply." },
                { status: 403 }
            );
        }

        // ── 3. ATOMIC TRANSACTION FLOW ──────────────────────────────────────
        const result = await db.transaction(async (tx) => {

            // Check existing vote inside transaction
            const existingLike = await tx.select()
                .from(replyLikesTable)
                .where(
                    and(
                        eq(replyLikesTable.userEmail, email),
                        eq(replyLikesTable.replyId, replyId)
                    )
                )
                .limit(1);

            if (existingLike.length > 0) {
                // Remove vote
                await tx.delete(replyLikesTable)
                    .where(
                        and(
                            eq(replyLikesTable.userEmail, email),
                            eq(replyLikesTable.replyId, replyId)
                        )
                    );

                // Prevent negative vote counts
                const updated = await tx.update(repliesTable)
                    .set({
                        upvotes: sql`GREATEST(${repliesTable.upvotes} - 1, 0)`
                    })
                    .where(eq(repliesTable.id, replyId))
                    .returning();

                return {
                    ...updated[0],
                    hasUpvoted: false
                };

            } else {
                // Add vote
                await tx.insert(replyLikesTable)
                    .values({
                        userEmail: email,
                        replyId
                    });

                // Atomic increment
                const updated = await tx.update(repliesTable)
                    .set({
                        upvotes: sql`${repliesTable.upvotes} + 1`
                    })
                    .where(eq(repliesTable.id, replyId))
                    .returning();

                return {
                    ...updated[0],
                    hasUpvoted: true
                };
            }
        });

        // ── 4. BACKGROUND SYSTEM EMISSION ───────────────────────────────────
        if (result && result.hasUpvoted && result.userEmail && originalReplyAuthorEmail) {
            if (result.userEmail !== originalReplyAuthorEmail) {
                console.error(
                    "[replies/vote] reply author email diverged between fetch and update",
                    {
                        replyId,
                        original: originalReplyAuthorEmail,
                        postUpdate: result.userEmail,
                    }
                );
            } else {
                await inngest.send({
                    name: "karma/answer.upvoted",
                    data: {
                        replyAuthorEmail: originalReplyAuthorEmail,
                        replyId: result.id || replyId,
                        doubtId: result.doubtId,
                    },
                });
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
