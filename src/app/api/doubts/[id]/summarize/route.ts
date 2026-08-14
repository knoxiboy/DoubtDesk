import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { doubtsTable, repliesTable } from "@/configs/schema";
import { eq, asc, isNull, and } from "drizzle-orm";
import { getOptionalAuth, requireMembership } from "@/lib/auth/membership-guard";
import { buildErrorResponse } from "@/lib/errors/error-handler";
import { groq } from "@/lib/ai/groq-client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const doubtId = parseInt(id, 10);

        if (isNaN(doubtId)) {
            return NextResponse.json({ error: "Invalid doubt ID" }, { status: 400 });
        }

        const auth = await getOptionalAuth();
        const email = auth?.email ?? null;

        const [doubt] = await db
            .select()
            .from(doubtsTable)
            .where(and(eq(doubtsTable.id, doubtId), isNull(doubtsTable.deletedAt)))
            .limit(1);

        if (!doubt) {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }

        // Classroom membership guard
        if (doubt.classroomId) {
            if (!email) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            await requireMembership(email, doubt.classroomId);
        }

        // Fetch replies
        const replies = await db
            .select()
            .from(repliesTable)
            .where(eq(repliesTable.doubtId, doubtId))
            .orderBy(asc(repliesTable.createdAt));

        if (replies.length < 5) {
            return NextResponse.json({ error: "Need at least 5 replies to summarize" }, { status: 400 });
        }

        const threadContext = `
DOUBT (${doubt.userEmail}):
${doubt.subject}
${doubt.content}

REPLIES:
${replies.map((r, i) => `[Reply ${i + 1} by ${r.userEmail}]:\n${r.content}`).join('\n\n')}
`;

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are an expert programming mentor AI. Your job is to summarize long doubt discussion threads.
Summarize the main problem, core diagnosis, and final accepted solution from this discussion.
Strictly return JSON in this exact format:
{
  "summaryBullets": ["bullet 1", "bullet 2", "bullet 3"],
  "keyTakeaway": "A one sentence conclusion."
}`
                },
                {
                    role: "user",
                    content: threadContext
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
        });

        const jsonStr = response.choices[0]?.message?.content;
        if (!jsonStr) {
            throw new Error("Empty response from Groq");
        }

        const parsed = JSON.parse(jsonStr);

        return NextResponse.json({
            summaryBullets: Array.isArray(parsed.summaryBullets) ? parsed.summaryBullets : [],
            keyTakeaway: typeof parsed.keyTakeaway === 'string' ? parsed.keyTakeaway : ""
        });
    } catch (error) {
        console.error("Error summarizing thread:", error);
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
