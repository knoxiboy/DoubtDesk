import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { db } from "@/configs/db";
import { practiceAttemptsTable } from "@/configs/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/membership-guard";
import { buildErrorResponse } from "@/lib/error-handler";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { email } = await requireAuth();
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "Groq API key is not configured" },
                { status: 500 }
            );
        }

        const { id } = await params;
        if (!/^[1-9]\d*$/.test(id)) {
            return NextResponse.json({ error: "Invalid doubt ID" }, { status: 400 });
        }
        const doubtId = parseInt(id, 10);

        const body = await req.json();
        const { attemptId, answer } = body;

        if (!attemptId || typeof attemptId !== "number") {
            return NextResponse.json({ error: "Missing or invalid attemptId" }, { status: 400 });
        }

        if (!answer || typeof answer !== "string" || answer.trim().length === 0) {
            return NextResponse.json({ error: "Answer cannot be empty" }, { status: 400 });
        }

        // Fetch the practice attempt
        const [attempt] = await db
            .select()
            .from(practiceAttemptsTable)
            .where(
                and(
                    eq(practiceAttemptsTable.id, attemptId),
                    eq(practiceAttemptsTable.userEmail, email),
                    eq(practiceAttemptsTable.originalDoubtId, doubtId)
                )
            )
            .limit(1);

        if (!attempt) {
            return NextResponse.json({ error: "Practice attempt not found" }, { status: 404 });
        }

        if (attempt.isCorrect !== null) {
            return NextResponse.json(
                { error: "This attempt has already been graded" },
                { status: 400 }
            );
        }

        // Grade the answer using Groq
        const systemPrompt = `You are an expert academic grader. Evaluate the student's answer to the given practice question.

Rules:
1. Be encouraging but honest
2. Provide step-by-step feedback
3. Point out what was done correctly
4. Point out mistakes and explain why they're wrong
5. Suggest improvements
6. Respond ONLY in valid JSON format

Response format:
{
  "isCorrect": true/false,
  "score": 0-100,
  "feedback": "Detailed step-by-step feedback with LaTeX ($...$) for math if applicable",
  "strengths": ["What the student did well"],
  "improvements": ["What could be improved"],
  "correctApproach": "Brief explanation of the correct approach if the answer was wrong"
}`;

        const userPrompt = `Question: ${attempt.generatedQuestion}

Student's Answer: ${answer.trim().slice(0, 3000)}

Evaluate this answer for correctness and understanding.`;

        const groq = new Groq({ apiKey });
        const completion = await groq.chat.completions.create(
            {
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.3,
                max_tokens: 800,
                response_format: { type: "json_object" },
            },
            {
                timeout: 15000, // 15 seconds timeout
            }
        );

        const rawResponse = completion.choices[0]?.message?.content || "{}";

        let parsed;
        try {
            parsed = JSON.parse(rawResponse);
        } catch {
            return NextResponse.json(
                { error: "Failed to parse grading response. Please try again." },
                { status: 502 }
            );
        }

        // Strictly validate and parse isCorrect boolean
        let isCorrect = false;
        if (typeof parsed.isCorrect === "boolean") {
            isCorrect = parsed.isCorrect;
        } else if (typeof parsed.isCorrect === "string") {
            isCorrect = parsed.isCorrect.toLowerCase() === "true";
        }

        // Update the practice attempt atomically using the isNull condition to prevent double-grading
        const [updatedAttempt] = await db
            .update(practiceAttemptsTable)
            .set({
                userAnswer: answer.trim(),
                isCorrect,
                aiFeedback: JSON.stringify(parsed),
            })
            .where(
                and(
                    eq(practiceAttemptsTable.id, attemptId),
                    eq(practiceAttemptsTable.userEmail, email),
                    isNull(practiceAttemptsTable.isCorrect)
                )
            )
            .returning();

        if (!updatedAttempt) {
            return NextResponse.json(
                { error: "This attempt has already been graded or modified by another request." },
                { status: 400 }
            );
        }

        return NextResponse.json({
            isCorrect,
            score: typeof parsed.score === "number" ? parsed.score : (isCorrect ? 100 : 0),
            feedback: typeof parsed.feedback === "string" ? parsed.feedback : "No feedback available.",
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
            correctApproach: typeof parsed.correctApproach === "string" ? parsed.correctApproach : null,
        });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
