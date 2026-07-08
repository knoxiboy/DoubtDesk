import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { db } from "@/configs/db";
import { doubtsTable, repliesTable, practiceAttemptsTable } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireMembership } from "@/lib/auth/membership-guard";
import { buildErrorResponse } from "@/lib/errors/error-handler";

export async function POST(
    _req: Request,
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

        // Fetch the original doubt along with classroom/type for access control
        const [doubt] = await db
            .select({
                content: doubtsTable.content,
                subject: doubtsTable.subject,
                subTopic: doubtsTable.subTopic,
                isSolved: doubtsTable.isSolved,
                solvedReplyId: doubtsTable.solvedReplyId,
                classroomId: doubtsTable.classroomId,
                type: doubtsTable.type,
                userEmail: doubtsTable.userEmail,
            })
            .from(doubtsTable)
            .where(eq(doubtsTable.id, doubtId))
            .limit(1);

        if (!doubt) {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }

        // Classroom membership and teacher visibility guards
        if (doubt.type === "teacher") {
            if (doubt.classroomId) {
                const membership = await requireMembership(email, doubt.classroomId);
                const isTeacher = ["teacher", "owner", "admin"].includes(membership.role.toLowerCase());
                const isAuthor = doubt.userEmail === email;
                if (!isTeacher && !isAuthor) {
                    return NextResponse.json({ error: "Access denied to this doubt" }, { status: 403 });
                }
            } else {
                if (doubt.userEmail !== email) {
                    return NextResponse.json({ error: "Access denied to this doubt" }, { status: 403 });
                }
            }
        } else if (doubt.classroomId) {
            await requireMembership(email, doubt.classroomId);
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

        const groq = new Groq({ apiKey });
        const completion = await groq.chat.completions.create(
            {
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                model: "llama-3.3-70b-versatile",
                temperature: 0.7,
                max_tokens: 600,
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
                { error: "Failed to generate a valid practice problem. Please try again." },
                { status: 502 }
            );
        }

        if (!parsed || typeof parsed.question !== "string" || !parsed.question.trim()) {
            return NextResponse.json(
                { error: "AI did not generate a valid question. Please retry." },
                { status: 502 }
            );
        }

        // Ensure hint and topic are string types if present
        let parsedHint: string | null = null;
        if (parsed.hint !== undefined && parsed.hint !== null) {
            parsedHint = typeof parsed.hint === "string" ? parsed.hint : JSON.stringify(parsed.hint);
        }

        let parsedTopic: string = doubt.subTopic || doubt.subject;
        if (parsed.topic !== undefined && parsed.topic !== null) {
            parsedTopic = typeof parsed.topic === "string" ? parsed.topic : JSON.stringify(parsed.topic);
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
            hint: parsedHint,
            topic: parsedTopic,
        });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
