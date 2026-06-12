import { db } from "@/configs/db";
import { doubtsTable, repliesTable } from "@/configs/schema";
import { and, eq, isNull, desc, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { findSemanticDuplicates } from "@/lib/ai/embeddings";
import { buildErrorResponse } from "@/lib/error-handler";
import { enforceAiAvailability, buildAiProviderErrorResponse } from "@/lib/ai/kill-switch";
import { getAnonymousQuotaIdentifier } from "@/lib/request-identity";
import { getSafeErrorDetails } from "@/lib/safe-error-details";
import {
  parseOptionalClassroomId,
  requireAuth,
  requireMembership,
} from "@/lib/auth/membership-guard";

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
    const body = await req.json();
    const { content, classroomId: rawClassroomId } = body as {
      content: string;
      classroomId?: unknown;
    };
    const classroomId = parseOptionalClassroomId(rawClassroomId);
    let aiQuotaIdentifier = getAnonymousQuotaIdentifier(req);

    if (classroomId) {
      const { email } = await requireAuth();
      await requireMembership(email, classroomId);
      aiQuotaIdentifier = email;
    }

    if (
      typeof content !== "string" ||
      content.trim().length < 10 ||
      content.length > 2000
    ) {
      return NextResponse.json({ similarDoubts: [] });
    }

    // 1) Fast path: embedding + vector similarity search (pgvector)
    // Only short-circuit when semantic search actually returns usable results.
    // Empty results can mean embedding generation failed (safeGenerateEmbedding -> null)
    // or no candidate passed thresholds; in those cases we must fall back to the LLM.
    try {
      const similarDoubts = await findSemanticDuplicates({
        content,
        classroomId: classroomId ?? null,
        type: "community",
        similarityThreshold: 80, // 0..100 percentage contract
        topK: 5,
      });

      if (similarDoubts.length > 0) {
        return NextResponse.json({ similarDoubts });
      }
    } catch (err) {
      console.error("Embedding similarity path failed, falling back to LLM:", err);
    }


    // 2) Fallback: Fetch the last 50 doubts from the same room/community
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
        and(
          classroomId
            ? eq(doubtsTable.classroomId, classroomId)
            : isNull(doubtsTable.classroomId),
          eq(doubtsTable.type, "community"),
        ),
      )
      .orderBy(desc(doubtsTable.createdAt))
      .limit(50);


    if (recentDoubts.length === 0) {
      return NextResponse.json({ similarDoubts: [] });
    }

    const availabilityResponse = await enforceAiAvailability(aiQuotaIdentifier);
    if (availabilityResponse) return availabilityResponse;

    // Build a compact list for Groq to compare
    const doubtList = recentDoubts
      .map(
        (d, i) =>
          `[${i}] Subject: ${d.subject} | Content: ${(d.content || "").slice(0, 150)}`,
      )
      .join("\n");

    const systemPrompt = `You are a duplicate-question detector for a student Q&A platform.
Given a NEW question and a numbered list of EXISTING questions, identify which existing questions 
are semantically similar or duplicate (same intent, even if worded differently).
Return ONLY a JSON array of objects: [{"index": <number>, "similarity": <0-100>}]
Only include entries with similarity >= 60. Return [] if none match.
Do not include any explanation or markdown.`;

    const userMessage = `NEW QUESTION:\n${content.trim()}\n\nEXISTING QUESTIONS:\n${doubtList}`;

    let completion;

    try {
      completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        max_tokens: 300,
      });
    } catch (err) {
      console.error("Groq API failed:", getSafeErrorDetails(err));
      return buildAiProviderErrorResponse(err);
    }

    const raw = completion.choices[0]?.message?.content?.trim() || "[]";

    // Safely parse the JSON response
    let matches: { index: number; similarity: number }[] = [];
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      matches = Array.isArray(parsed)
        ? parsed.filter(
            (item) =>
              typeof item.index === "number" &&
              typeof item.similarity === "number",
          )
        : [];
    } catch {
      console.error("Failed to parse Groq similarity response:", raw);
      return NextResponse.json({ similarDoubts: [] });
    }

    // Filter to >= 80% similarity threshold and map to full doubt objects
    const highMatches = matches.filter((m) => m.similarity >= 80).slice(0, 5); // Cap at 5 results

    const similarDoubts: SimilarDoubt[] = [];

    const solvedReplyIds = highMatches
      .map((match) => recentDoubts[match.index])
      .filter(
        (doubt) => doubt && doubt.isSolved === "solved" && doubt.solvedReplyId,
      )
      .map((doubt) => doubt.solvedReplyId!);

    const solvedReplies =
      solvedReplyIds.length > 0
        ? await db
            .select({
              id: repliesTable.id,
              content: repliesTable.content,
            })
            .from(repliesTable)
            .where(inArray(repliesTable.id, solvedReplyIds))
        : [];

    const replyMap = new Map(
      solvedReplies.map((reply) => [reply.id, reply.content]),
    );

    for (const match of highMatches) {
      if (match.index < 0 || match.index >= recentDoubts.length) {
        continue;
      }

      const doubt = recentDoubts[match.index];
      if (!doubt) continue;

      const solvedAnswer =
        doubt.isSolved === "solved" && doubt.solvedReplyId
          ? (replyMap.get(doubt.solvedReplyId) ?? null)
          : null;

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
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
