import { db } from "@/configs/db";
import { repliesTable, replyLikesTable } from "@/configs/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { voteReplySchema } from "@/lib/validations/reply";

export async function POST(req: Request) {
    try {
        const { errorResponse, data } = await parseAndValidateRequest(req, voteReplySchema);
        if (errorResponse) return errorResponse;

        const { replyId, userName } = data;

        const user = await currentUser();
        const authenticatedUserId = user?.id;

        if (!authenticatedUserId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }


        // Check if reply exists
        const [reply] = await db.select().from(repliesTable).where(eq(repliesTable.id, replyId)).limit(1);
        if (!reply) {
            return NextResponse.json({ error: "Reply not found" }, { status: 404 });
        }

        // Check if already upvoted (store stable identity: Clerk user id)
        const result = await db.transaction(async (tx) => {

            // Check existing vote inside transaction
            const existingLike = await tx.select()
                .from(replyLikesTable)
                .where(
                    and(
                        eq(replyLikesTable.userName, authenticatedUserId),
                        eq(replyLikesTable.replyId, replyId)
                    )
                )
                .limit(1);

            if (existingLike.length > 0) {

                // Remove vote
                await tx.delete(replyLikesTable)
                    .where(
                        and(
                            eq(replyLikesTable.userName, authenticatedUserId),
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
                        userName: authenticatedUserId,
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

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error voting on reply:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
