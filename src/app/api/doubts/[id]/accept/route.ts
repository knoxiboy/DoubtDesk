// app/api/doubts/[id]/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { doubtsTable, repliesTable } from "@/configs/schema";
import { eq, and, or, isNull, ne } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // ── 1. AUTHENTICATION ─────────────────────────────────────────────────
        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json(
                { error: "Unauthorized! Please log in first." },
                { status: 401 }
            );
        }
        const loggedInUserEmail = user.primaryEmailAddress.emailAddress;

        const resolvedParams = "then" in params ? await params : params;
        const doubtId = parseInt(resolvedParams.id);

        if (isNaN(doubtId)) {
            return NextResponse.json({ error: "Invalid doubt id" }, { status: 400 });
        }

        const body = await req.json();
        const { replyId } = body as { replyId: number };

        if (!replyId) {
            return NextResponse.json({ error: "replyId is required" }, { status: 400 });
        }

        // ── 2. AUTHORIZATION (OWNERSHIP) ─────────────────────────────────────
        const [existingDoubt] = await db
            .select({ userEmail: doubtsTable.userEmail })
            .from(doubtsTable)
            .where(eq(doubtsTable.id, doubtId))
            .limit(1);

        if (!existingDoubt) {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }

        if (existingDoubt.userEmail !== loggedInUserEmail) {
            return NextResponse.json(
                { error: "Forbidden! You can only accept answers for your own doubts." },
                { status: 403 }
            );
        }

        // ── 3. VERIFY REPLY BELONGS TO THIS DOUBT ────────────────────────────
        const [reply] = await db
            .select({
                userEmail: repliesTable.userEmail,
                doubtId: repliesTable.doubtId,
            })
            .from(repliesTable)
            .where(eq(repliesTable.id, replyId))
            .limit(1);

        if (!reply) {
            return NextResponse.json({ error: "Reply not found" }, { status: 404 });
        }

        if (reply.doubtId !== doubtId) {
            return NextResponse.json(
                { error: "Integrity Error! The provided reply does not belong to this doubt thread." },
                { status: 400 }
            );
        }

        if (reply.userEmail === loggedInUserEmail) {
            return NextResponse.json(
                { error: "Forbidden! You cannot accept your own reply." },
                { status: 403 }
            );
        }

        // ── 4. ATOMIC IDEMPOTENT UPDATE ───────────────────────────────────────
        const [updatedDoubt] = await db
            .update(doubtsTable)
            .set({
                isSolved: "solved",
                solvedReplyId: replyId,
            })
            .where(
                and(
                    eq(doubtsTable.id, doubtId),
                    eq(doubtsTable.userEmail, loggedInUserEmail),
                    or(
                        ne(doubtsTable.isSolved, "solved"),
                        isNull(doubtsTable.solvedReplyId),
                        ne(doubtsTable.solvedReplyId, replyId)
                    )
                )
            )
            .returning({ id: doubtsTable.id });

        // ── 5. IDEMPOTENT RESPONSE ────────────────────────────────────────────
        if (!updatedDoubt) {
            return NextResponse.json({
                success: true,
                message: "Answer was already accepted (no-op)",
                doubtId,
                solvedReplyId: replyId,
            });
        }

        // ── 6. EMIT KARMA EVENT — only on genuine state transition ───────────
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
            solvedReplyId: replyId,
        });

    } catch (error) {
        console.error("Error in accept-route:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}