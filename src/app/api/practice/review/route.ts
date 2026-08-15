import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { practiceAttemptsTable } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/membership-guard";
import { buildErrorResponse } from "@/lib/errors/error-handler";

export async function POST(req: Request) {
    try {
        const { email } = await requireAuth();
        const { sourceAttemptId } = await req.json();

        if (!sourceAttemptId || typeof sourceAttemptId !== "number") {
            return NextResponse.json({ error: "Missing or invalid sourceAttemptId" }, { status: 400 });
        }

        const [source] = await db
            .select()
            .from(practiceAttemptsTable)
            .where(
                and(
                    eq(practiceAttemptsTable.id, sourceAttemptId),
                    eq(practiceAttemptsTable.userEmail, email)
                )
            )
            .limit(1);

        if (!source) {
            return NextResponse.json({ error: "Original attempt not found" }, { status: 404 });
        }

        const [newAttempt] = await db
            .insert(practiceAttemptsTable)
            .values({
                userEmail: email,
                originalDoubtId: source.originalDoubtId,
                generatedQuestion: source.generatedQuestion,
                intervalDays: source.intervalDays,
                easeFactor: source.easeFactor,
            })
            .returning();

        return NextResponse.json({
            attemptId: newAttempt.id,
            question: newAttempt.generatedQuestion,
            doubtId: newAttempt.originalDoubtId,
        });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}