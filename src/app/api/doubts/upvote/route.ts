import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { doubtsTable, doubtUpvotesTable } from "@/configs/schema";
import { eq, sql, and } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    try {
        // ── 1. SERVER-SIDE AUTHENTICATION GUARD ──────────────────────────────
        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json(
                { error: "Unauthorized! Missing active session profile properties." },
                { status: 401 }
            );
        }

        const userEmail = user.primaryEmailAddress.emailAddress;

        // ── 2. REQUEST BODY VALIDATION ───────────────────────────────────────
        const body = await req.json();
        const { doubtId } = body as { doubtId: number };

        if (!doubtId || isNaN(doubtId)) {
            return NextResponse.json(
                { error: "Invalid doubt id" },
                { status: 400 }
            );
        }

        // ── 3. DATA INTEGRITY CHECK (DOUBT EXISTS) ──────────────────────────
        const [targetDoubt] = await db
            .select({
                id: doubtsTable.id,
                userEmail: doubtsTable.userEmail,
                likes: doubtsTable.likes,
            })
            .from(doubtsTable)
            .where(eq(doubtsTable.id, doubtId))
            .limit(1);

        if (!targetDoubt) {
            return NextResponse.json(
                { error: "Doubt not found" },
                { status: 404 }
            );
        }

        if (targetDoubt.userEmail === userEmail) {
            return NextResponse.json(
                { error: "Forbidden: You cannot upvote your own doubt." },
                { status: 403 }
            );
        }

        // ── 4 & 5. ATOMIC TRANSACTION: INSERT UPVOTE & INCREMENT COUNTER ────
        let updatedDoubt;

        try {
            updatedDoubt = await db.transaction(async (tx) => {
                // A. Record the upvote
                await tx.insert(doubtUpvotesTable).values({
                    doubtId,
                    userEmail,
                });

                // B. Increment the likes counter
                const [result] = await tx
                    .update(doubtsTable)
                    .set({ likes: sql`${doubtsTable.likes} + 1` })
                    .where(eq(doubtsTable.id, doubtId))
                    .returning({
                        id: doubtsTable.id,
                        likes: doubtsTable.likes,
                        userEmail: doubtsTable.userEmail,
                    });

                return result;
            });
        } catch (error: any) {
            // Trap unique-constraint violation (already upvoted)
            if (error?.code === "23505") {
                return NextResponse.json(
                    { error: "You have already upvoted this doubt" },
                    { status: 409 }
                );
            }
            if (error?.code === "23503") {
                return NextResponse.json(
                    { error: "Data Integrity Failure: The target doubt references a record that no longer exists." },
                    { status: 400 }
                );
            }
            throw error;
        }

        if (!updatedDoubt) {
            return NextResponse.json(
                { error: "Integrity Error: Counter increment rejected. Doubt validation failed at database write." },
                { status: 400 }
            );
        }

        // ── 6. DISPATCH BACKGROUND SYSTEM EVENT VIA INNGEST ─────────────────
        if (targetDoubt.userEmail) {
            await inngest.send({
                name: "karma/doubt.upvoted",
                data: {
                    doubtAuthorEmail: targetDoubt.userEmail,
                    doubtId,
                    upvoteCount: (updatedDoubt.likes ?? 0),
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: "Upvote tracked successfully",
            currentUpvotes: updatedDoubt.likes ?? 0,
            isTrending: (updatedDoubt.likes ?? 0) >= 5,
        });
    } catch (error) {
        console.error("CRITICAL: Doubt upvote endpoint execution exception:", error);
        return NextResponse.json(
            {
                error: "Internal Server Error",
                details: error instanceof Error ? error.message : "Database connection or structural query exception",
            },
            { status: 500 }
        );
    }
}
