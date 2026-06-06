// app/api/doubts/[id]/upvote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { repliesTable, replyLikesTable } from "@/configs/schema";
import { eq, and, sql } from "drizzle-orm"; 
import { inngest } from "@/inngest/client";

import { currentUser } from "@clerk/nextjs/server";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // ── 1. SERVER-SIDE AUTHENTICATION GUARD ──────────────────────────────
        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ 
                error: "Unauthorized! Missing active session profile properties." 
            }, { status: 401 });
        }
        
        // FIX: Normalized actor key to use the stable, unique identifier (email)
        // instead of the non-unique display name (userName) to align with global vote endpoints.
        const stableUserIdentifier = user.primaryEmailAddress.emailAddress; 

        // ── 2. NEXT.JS 15 ASYNC PARAMS RESOLUTION ────────────────────────────
        const { id } = await params;
        const doubtId = parseInt(id);
        
        if (isNaN(doubtId)) {
            return NextResponse.json({ error: "Invalid doubt id" }, { status: 400 });
        }

        const body = await req.json();
        const { replyId } = body as { replyId: number };

        if (!replyId) {
            return NextResponse.json({ error: "replyId is required" }, { status: 400 });
        }

        // ── 3. DATA INTEGRITY CHECK (THREAD VALIDATION) ──────────────────────
        const [targetReply] = await db
            .select({ 
                userEmail: repliesTable.userEmail,
                doubtId: repliesTable.doubtId 
            })
            .from(repliesTable)
            .where(eq(repliesTable.id, replyId))
            .limit(1);

        if (!targetReply) {
            return NextResponse.json({ error: "Reply not found" }, { status: 404 });
        }

        if (targetReply.doubtId !== doubtId) {
            return NextResponse.json({ 
                error: "Integrity Error: The provided reply does not belong to this doubt thread." 
            }, { status: 400 });
        }

        if (targetReply.userEmail === stableUserIdentifier) {
            return NextResponse.json({ error: "Forbidden: You cannot upvote your own answer." }, { status: 403 });
        }

        // ── 4 & 5. ATOMIC TRANSACTION: INSERT LIKE & INCREMENT COUNTER ───────
        let updatedReply;

        try {
            updatedReply = await db.transaction(async (tx) => {
                
                // A. FIX: Standardized column input across all vote handlers to use the stable identifier.
                // Note: If your Drizzle schema explicitly names the column field `userName`, we map the unique 
                // email string directly into it to preserve the unique multi-column compound index layout.
                await tx.insert(replyLikesTable).values({ 
                    userName: stableUserIdentifier, // Global unique key consistency
                    replyId 
                });

                // B. Bound atomic counter increment linked tightly to the validated thread mapping
                const [result] = await tx
                    .update(repliesTable)
                    .set({ upvotes: sql`${repliesTable.upvotes} + 1` })
                    .where(
                        and(
                            eq(repliesTable.id, replyId),
                            eq(repliesTable.doubtId, doubtId)
                        )
                    )
                    .returning({
                        upvotes: repliesTable.upvotes,
                        userEmail: repliesTable.userEmail,
                        doubtId: repliesTable.doubtId,
                    });

                return result;
            });
        } catch (error: any) {
            // Trap unique-constraint violation codes cleanly (e.g., PostgreSQL error 23505)
            if (error?.code === "23505") {
                return NextResponse.json(
                    { error: "You have already upvoted this answer" },
                    { status: 409 }
                );
            }
            if (error?.code === "23503") {
                return NextResponse.json(
                    { error: "Data Integrity Failure: The target reply references a record that no longer exists." },
                    { status: 400 }
                );
            }
            throw error;
        }

        if (!updatedReply) {
            return NextResponse.json({ 
                error: "Integrity Error: Counter increment rejected. Thread validation failed at database write." 
            }, { status: 400 });
        }

        // ── 6. DISPATCH BACKGROUND SYSTEM EVENT VIA INNGEST ─────────────────
        if (updatedReply.userEmail) {
            await inngest.send({
                name: "karma/answer.upvoted",
                data: {
                    replyAuthorEmail: updatedReply.userEmail,
                    replyId,
                    doubtId: updatedReply.doubtId,
                },
            });
        }

        return NextResponse.json({ 
            success: true, 
            message: "Upvote tracked successfully", 
            currentUpvotes: updatedReply.upvotes ?? 0 
        });

    } catch (error) {
        console.error("CRITICAL: Upvote endpoint execution exception:", error);
        return NextResponse.json(
            { 
                error: "Internal Server Error", 
                details: error instanceof Error ? error.message : "Database connection or structural query exception" 
            }, 
            { status: 500 }
        );
    }
}