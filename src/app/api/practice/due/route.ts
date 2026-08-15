import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { practiceAttemptsTable } from "@/configs/schema";
import { eq, and, lte, isNotNull, asc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/membership-guard";
import { buildErrorResponse } from "@/lib/errors/error-handler";

const DEFAULT_LIMIT = 20;

export async function GET(req: Request) {
    try {
        const { email } = await requireAuth();

        const { searchParams } = new URL(req.url);
        const limitParam = searchParams.get("limit");
        const limit = limitParam && /^[1-9]\d*$/.test(limitParam)
            ? Math.min(parseInt(limitParam, 10), 50)
            : DEFAULT_LIMIT;

        const now = new Date();

        const dueAttempts = await db
            .select({
                id: practiceAttemptsTable.id,
                originalDoubtId: practiceAttemptsTable.originalDoubtId,
                generatedQuestion: practiceAttemptsTable.generatedQuestion,
                userAnswer: practiceAttemptsTable.userAnswer,
                isCorrect: practiceAttemptsTable.isCorrect,
                aiFeedback: practiceAttemptsTable.aiFeedback,
                nextReviewAt: practiceAttemptsTable.nextReviewAt,
                intervalDays: practiceAttemptsTable.intervalDays,
                easeFactor: practiceAttemptsTable.easeFactor,
            })
            .from(practiceAttemptsTable)
            .where(
                and(
                    eq(practiceAttemptsTable.userEmail, email),
                    isNotNull(practiceAttemptsTable.nextReviewAt),
                    lte(practiceAttemptsTable.nextReviewAt, now)
                )
            )
            .orderBy(asc(practiceAttemptsTable.nextReviewAt))
            .limit(limit);

        return NextResponse.json({
            count: dueAttempts.length,
            items: dueAttempts,
        });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}