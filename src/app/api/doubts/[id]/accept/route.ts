// app/api/doubts/[id]/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { doubtsTable, repliesTable } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // ── 1. SERVER-SIDE AUTHENTICATION CHECK ──────────────────────────────
        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized! Please log in first." }, { status: 401 });
        }
        const loggedInUserEmail = user.primaryEmailAddress.emailAddress;

        const resolvedParams = 'then' in params ? await params : params;
        const doubtId = parseInt(resolvedParams.id);

        if (isNaN(doubtId)) {
            return NextResponse.json({ error: "Invalid doubt id" }, { status: 400 });
        }

        const body = await req.json();
        const { replyId } = body as { replyId: number };

        if (!replyId) {
            return NextResponse.json({ error: "replyId is required" }, { status: 400 });
        }

        // ── 2. AUTHORIZATION CHECK (VERIFY OWNERSHIP) ────────────────────────
        const [existingDoubt] = await db
            .select({
                userEmail: doubtsTable.userEmail,
                isSolved: doubtsTable.isSolved,
                solvedReplyId: doubtsTable.solvedReplyId,
            })
            .from(doubtsTable)
            .where(eq(doubtsTable.id, doubtId))
            .limit(1);

        if (!existingDoubt) {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }

        // Security Guardrail: Only the user who created the doubt can accept an answer
        if (existingDoubt.userEmail !== loggedInUserEmail) {
            return NextResponse.json({
                error: "Forbidden! You can only accept answers for your own doubts."
            }, { status: 403 });
        }

        // ── 2a. IDEMPOTENCY GUARD ────────────────────────────────────────────
        // If this exact reply is already the accepted answer, return success
        // immediately without re-emitting the karma event.
        if (existingDoubt.isSolved === "solved" && existingDoubt.solvedReplyId === replyId) {
            return NextResponse.json({
                success: true,
                message: "Answer was already accepted (no-op)",
                doubtId,
                solvedReplyId: replyId,
            });
        }

        // ── 3. FETCH & VERIFY THE REPLY RELATIONSHIP ─────────────────────────
        const [reply] = await db
            .select({
                userEmail: repliesTable.userEmail,
                doubtId: repliesTable.doubtId
            })
            .from(repliesTable)
            .where(eq(repliesTable.id, replyId))
            .limit(1);

        if (!reply) {
            return NextResponse.json({ error: "Reply not found" }, { status: 404 });
        }

        if (reply.doubtId !== doubtId) {
            return NextResponse.json({
                error: "Integrity Error! The provided reply does not belong to this doubt thread."
            }, { status: 400 });
        }

        // ── 4. EXECUTE THE ACCEPT ACTION SECURELY ───────────────────────────
        const [updatedDoubt] = await db
            .update(doubtsTable)
            .set({
                isSolved: "solved",
                solvedReplyId: replyId,
            })
            .where(and(eq(doubtsTable.id, doubtId), eq(doubtsTable.userEmail, loggedInUserEmail)))
            .returning({ id: doubtsTable.id });

        if (!updatedDoubt) {
            return NextResponse.json({ error: "Failed to update doubt state" }, { status: 500 });
        }

        // ── 5. EMIT THE CORRECT BUSINESS EVENT TO INNGEST ───────────────────
        if (reply.userEmail) {
            await inngest.send({
                name: "karma/answer.accepted",
                data: {
                    replyAuthorEmail: reply.userEmail,
                    replyId,
                    doubtId,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: "Answer accepted successfully",
            doubtId,
            solvedReplyId: replyId
        });

    } catch (error) {
        console.error("Error in accept-route:", error);
        return NextResponse.json(
            { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}