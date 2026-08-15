import { db } from "@/configs/db";
import { doubtsTable, repliesTable, replyLikesTable } from "@/configs/schema";
import { and, eq, sql, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { inngest } from "@/inngest/client";
import { checkUserBlock } from "@/lib/auth/auth-utils";
import { requireMembership } from "@/lib/auth/membership-guard";
import { buildErrorResponse } from "@/lib/errors/error-handler";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { voteReplySchema } from "@/lib/validations/reply";
import { enforceApiRateLimit } from "@/lib/ratelimit/api-rate-limit";
import { generalLimiter } from "@/lib/ratelimit/ratelimit";

export async function POST(req: Request) {
    try {
        const { errorResponse, data } = await parseAndValidateRequest(req, voteReplySchema);
        if (errorResponse) return errorResponse;

        const { replyId } = data;

        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        const rateLimitResponse = await enforceApiRateLimit(generalLimiter, email, "general");
        if (rateLimitResponse) return rateLimitResponse;

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

        const [doubt] = await db
            .select({ classroomId: doubtsTable.classroomId })
            .from(doubtsTable)
            .where(and(eq(doubtsTable.id, reply.doubtId), isNull(doubtsTable.deletedAt)))
            .limit(1);

        if (!doubt) {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }

        // Validate the active parent before revealing that the authenticated
        // user owns the reply.
        if (originalReplyAuthorEmail === email) {
            return NextResponse.json(
                { error: "Forbidden: You cannot upvote your own reply." },
                { status: 403 }
            );
        }

        if (doubt.classroomId) {
            await requireMembership(email, doubt.classroomId);
        }

        // ── 3. ATOMIC TRANSACTION FLOW ──────────────────────────────────────
        const result = await db.transaction(async (tx) => {
            const lockedParent = await tx.execute(
                sql`SELECT ${doubtsTable.id} FROM ${doubtsTable} WHERE ${doubtsTable.id} = ${reply.doubtId} AND ${doubtsTable.deletedAt} IS NULL FOR UPDATE`,
            );
            if (!lockedParent.rows?.length) return null;

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

        if (!result) {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }

        // ── 4. BACKGROUND SYSTEM EMISSION ───────────────────────────────────
        if (result && result.userEmail && originalReplyAuthorEmail) {
            if (result.userEmail !== originalReplyAuthorEmail) {
                console.error(
                    "[replies/vote] reply author email diverged between fetch and update",
                    {
                        replyId,
                        original: originalReplyAuthorEmail,
                        postUpdate: result.userEmail,
                    }
                );
            } else if (result.hasUpvoted) {
                await inngest.send({
                    name: "karma/answer.upvoted",
                    data: {
                        replyAuthorEmail: originalReplyAuthorEmail,
                        replyId: result.id || replyId,
                        doubtId: result.doubtId,
                    },
                });
            } else {
                // Vote removed - revoke the +10 karma that was awarded when the vote was added
                await inngest.send({
                    name: "karma/answer.unupvoted",
                    data: {
                        replyAuthorEmail: originalReplyAuthorEmail,
                        replyId: result.id || replyId,
                        doubtId: result.doubtId,
                    },
                });
            }
        }

        // Strip the author's real email before returning — identity must
        // stay server-side only (see src/lib/anonymity/anonymity.ts).
        const { userEmail: _, ...safeResult } = result;
        return NextResponse.json(safeResult);
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
