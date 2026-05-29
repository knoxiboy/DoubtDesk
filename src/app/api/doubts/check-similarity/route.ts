import { db } from "@/configs/db";
import { doubtsTable, repliesTable } from "@/configs/schema";
import { and, eq, isNull, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "dummy_key",
});

export interface SimilarDoubt {
    id: number;
    subject: string;
    content: string | null;
    isSolved: string | null;
    similarity: number;
    solvedAnswer?: string | null;
}

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { content, classroomId } = body as {
            content: string;
            classroomId?: number | null;
        };

        if (!content || content.trim().length < 10) {
            return NextResponse.json({ similarDoubts: [] });
        }

        // Fetch the last 20 doubts from the same room/community
        const recentDoubts = await db
            .select({
                id: doubtsTable.id,
                subject: doubtsTable.subject,
                content: doubtsTable.content,
                isSolved: doubtsTable.isSolved,
                solvedReplyId: doubtsTable.solvedReplyId,
            })
            .from(doubtsTable)
            .where(
                classroomId
                    ? eq(doubtsTable.classroomId, classroomId)
                    : isNull(doubtsTable.classroomId)
            )
            .orderBy(desc(doubtsTable.createdAt))
            .limit(20);

        if (recentDoubts.length === 0) {
            return NextResponse.json({ similarDoubts: [] });
        }

        // Build a compact list for Groq to compare
        const doubtList = recentDoubts
            .map(
                (d, i) =>
                    `[${i}] Subject: ${d.subject} | Content: ${(d.content || "").slice(0, 150)}`
            )
            .join("\n");

        const systemPrompt = `You are a duplicate-question detector for a student Q&A platform.
Given a NEW question and a numbered list of EXISTING questions, identify which existing questions 
are semantically similar or duplicate (same intent, even if worded differently).
Return ONLY a JSON array of objects: [{"index": <number>, "similarity": <0-100>}]
Only include entries with similarity >= 60. Return [] if none match.
Do not include any explanation or markdown.`;

        const userMessage = `NEW QUESTION:\n${content.trim()}\n\nEXISTING QUESTIONS:\n${doubtList}`;

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            max_tokens: 300,
        });

        const raw = completion.choices[0]?.message?.content?.trim() || "[]";

        // Safely parse the JSON response
        let matches: { index: number; similarity: number }[] = [];
        try {
            const cleaned = raw.replace(/```json|```/g, "").trim();
            matches = JSON.parse(cleaned);
        } catch {
            console.error("Failed to parse Groq similarity response:", raw);
            return NextResponse.json({ similarDoubts: [] });
        }

        // Filter to >= 80% similarity threshold and map to full doubt objects
        const highMatches = matches
            .filter((m) => m.similarity >= 80)
            .slice(0, 5); // Cap at 5 results

        const similarDoubts: SimilarDoubt[] = [];

        for (const match of highMatches) {
            const doubt = recentDoubts[match.index];
            if (!doubt) continue;

            let solvedAnswer: string | null = null;

            // If solved, fetch the accepted reply for instant answer
            if (doubt.isSolved === "solved" && doubt.solvedReplyId) {
                const [reply] = await db
                    .select({ content: repliesTable.content })
                    .from(repliesTable)
                    .where(eq(repliesTable.id, doubt.solvedReplyId))
                    .limit(1);
                solvedAnswer = reply?.content ?? null;
            }

            similarDoubts.push({
                id: doubt.id,
                subject: doubt.subject,
                content: doubt.content,
                isSolved: doubt.isSolved,
                similarity: match.similarity,
                solvedAnswer,
            });
        }

        // Sort by similarity descending
        similarDoubts.sort((a, b) => b.similarity - a.similarity);

        return NextResponse.json({ similarDoubts });
    } catch (error) {
        console.error("Similarity check failed:", error);
        return NextResponse.json({ similarDoubts: [] });
    }
}