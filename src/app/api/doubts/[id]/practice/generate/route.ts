import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { db } from "@/configs/db";
import { doubtsTable, repliesTable, practiceAttemptsTable } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/membership-guard";
import { buildErrorResponse } from "@/lib/error-handler";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy_key" });

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { email } = await requireAuth();
        const { id } = await params;
        const doubtId = parseInt(id, 10);

        if (isNaN(doubtId)) {
            return NextResponse.json({ error: "Invalid doubt ID" }, { status: 400 });
        }

        // Fetch the original doubt
        const [doubt] = await db
            .select({
                content: doubtsTable.content,
                subject: doubtsTable.subject,
                subTopic: doubtsTable.subTopic,
                isSolved: doubtsTable.isSolved,
                solvedReplyId: doubtsTable.solvedReplyId,
            })
            .from(doubtsTable)
            .where(eq(doubtsTable.id, doubtId))
            .limit(1);

        if (!doubt) {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }

        if (doubt.isSolved !== "solved") {
            return NextResponse.json(
                { error: "Practice is only available for solved doubts" },
                { status: 400 }
            );
        }

        // Fetch the solved reply for context (if available)
        let solutionContent = "";
        if (doubt.solvedReplyId) {
            const [reply] = await db
                .select({ content: repliesTable.content })
                .from(repliesTable)
                .where(eq(repliesTable.id, doubt.solvedReplyId))
                .limit(1);

            solutionContent = reply?.content || "";
        }

        // Generate a practice problem using Groq
        const systemPrompt = `You are an expert academic tutor. Your task is to generate a practice problem that tests the same concept as the original doubt but is distinctly different.

Rules:
1. The problem MUST test the same conceptual understanding
2. The problem MUST be at the same difficulty level
3. The problem MUST be different from the original (change variables, numbers, context)
4. Use LaTeX notation for math expressions (wrap in $ for inline, $$ for display)
5. Respond ONLY in valid JSON format

Response format:
{
  "question": "The practice problem text with $LaTeX$ if needed",
  "hint": "A brief hint to guide the student without giving away the answer",
  "topic": "The specific topic being tested"
}`;

        const userPrompt = `Subject: ${doubt.subject}
${doubt.subTopic ? `Sub-topic: ${doubt.subTopic}` : ""}
Original doubt: ${doubt.content || "No text content"}
${solutionContent ? `Solution provided: ${solutionContent.slice(0, 1500)}` : ""}

Generate a conceptually similar but distinct practice problem.`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 600,
            response_format: { type: "json_object" },
        });

        const rawResponse = completion.choices[0]?.message?.content || "{}";

        let parsed;
        try {
            parsed = JSON.parse(rawResponse);
        } catch {
            return NextResponse.json(
                { error: "Failed to generate a valid practice problem. Please try again." },
                { status: 502 }
            );
        }

        if (!parsed.question) {
            return NextResponse.json(
                { error: "AI did not generate a valid question. Please retry." },
                { status: 502 }
            );
        }

        // Store the generated question in the database
        const [attempt] = await db
            .insert(practiceAttemptsTable)
            .values({
                userEmail: email,
                originalDoubtId: doubtId,
                generatedQuestion: parsed.question,
            })
            .returning({ id: practiceAttemptsTable.id });

        return NextResponse.json({
            attemptId: attempt.id,
            question: parsed.question,
            hint: parsed.hint || null,
            topic: parsed.topic || doubt.subTopic || doubt.subject,
        });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
