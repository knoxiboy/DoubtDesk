import { db } from "@/configs/db";
import { doubtMeToosTable, doubtsTable, membershipsTable } from "@/configs/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { enforceApiRateLimit } from "@/lib/ratelimit/api-rate-limit";
import { generalLimiter } from "@/lib/ratelimit/ratelimit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const rateLimitResponse = await enforceApiRateLimit(generalLimiter, email, "general");
        if (rateLimitResponse) return rateLimitResponse;

        const { id } = await params;
        const doubtId = parseInt(id);

        if (isNaN(doubtId)) {
            return NextResponse.json({ error: "Invalid doubt ID" }, { status: 400 });
        }

        const [doubt] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId)).limit(1);
        if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

        if (doubt.classroomId && email) {
            const [membership] = await db.select().from(membershipsTable).where(
                and(eq(membershipsTable.userEmail, email), eq(membershipsTable.classroomId, doubt.classroomId))
            );
            if (!membership) {
                return NextResponse.json({ error: "Access denied to this classroom's doubt" }, { status: 403 });
            }
        }

        // Toggle 'Me Too' in a transaction
        const result = await db.transaction(async (tx) => {
            const existing = await tx.select().from(doubtMeToosTable)
                .where(and(eq(doubtMeToosTable.userEmail, email), eq(doubtMeToosTable.doubtId, doubtId)))
                .limit(1);

            if (existing.length > 0) {
                // Remove Me Too and decrement counter
                await tx.delete(doubtMeToosTable)
                    .where(and(eq(doubtMeToosTable.userEmail, email), eq(doubtMeToosTable.doubtId, doubtId)));
                
                const [updated] = await tx.update(doubtsTable)
                    .set({ meTooCount: sql`${doubtsTable.meTooCount} - 1` })
                    .where(eq(doubtsTable.id, doubtId))
                    .returning({ meTooCount: doubtsTable.meTooCount });
                    
                return { hasMeToo: false, meTooCount: updated.meTooCount };
            } else {
                // Add Me Too and increment counter
                await tx.insert(doubtMeToosTable).values({
                    userEmail: email,
                    doubtId
                });
                
                const [updated] = await tx.update(doubtsTable)
                    .set({ meTooCount: sql`${doubtsTable.meTooCount} + 1` })
                    .where(eq(doubtsTable.id, doubtId))
                    .returning({ meTooCount: doubtsTable.meTooCount });
                    
                return { hasMeToo: true, meTooCount: updated.meTooCount };
            }
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error toggling Me Too:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
