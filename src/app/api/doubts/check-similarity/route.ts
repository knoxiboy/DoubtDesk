import { db } from "@/configs/db";
import { doubtsTable, repliesTable } from "@/configs/schema";
import { and, eq, isNull, desc, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { findSemanticDuplicates } from "@/lib/ai/embeddings";
import { enforceApiRateLimit } from "@/lib/ratelimit/api-rate-limit";
import { buildErrorResponse } from "@/lib/errors/error-handler";
import {
  enforceAiAvailability,
  buildAiProviderErrorResponse,
} from "@/lib/ai/kill-switch";
import { aiLimiter } from "@/lib/ratelimit/ratelimit";
import { getAnonymousQuotaIdentifier } from "@/lib/auth/request-identity";
import { getSafeErrorDetails } from "@/lib/errors/safe-error-details";
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

    const anonymousRateLimitResponse = await enforceApiRateLimit(
      aiLimiter,
      aiQuotaIdentifier,
      "ai",
    );
    if (anonymousRateLimitResponse) return anonymousRateLimitResponse;

    if (classroomId) {
      const { email } = await requireAuth();
      const userRateLimitResponse = await enforceApiRateLimit(
        aiLimiter,
        email,
        "ai",
      );
      if (userRateLimitResponse) return userRateLimitResponse;
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

    try {
      const similarDoubts = await findSemanticDuplicates({
        content,
        classroomId: classroomId ?? null,
        type: "community",
        similarityThreshold: 80,
        topK: 5,
      });

      if (similarDoubts.length > 0) {
        return NextResponse.json({ similarDoubts });
      }
    } catch (err) {
      console.error("Embedding similarity path failed, falling back to LLM:", err);
    }

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

    const highMatches = matches.filter((m) => m.similarity >= 80).slice(0, 5);
    const similarDoubts: SimilarDoubt[] = [];

    const solvedReplyIds = highMatches
      .map((match: any) => recentDoubts[match.index])
      .filter(
        (doubt) => doubt && doubt.isSolved === "solved" && doubt.solvedReplyId,
      )
      .map((doubt: any) => doubt.solvedReplyId!);

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
      solvedReplies.map((reply: any) => [reply.id, reply.content]),
    );

    for (const match of highMatches) {
      if (match.index < 0 || match.index >= recentDoubts.length) {
        continue;
      }

      const doubt = recentDoubts[match.index];
      if (!doubt) continue;

      const solvedAnswer =
        doubt.isSolved === "solved" && doubt.solvedReplyId
          ? ((replyMap.get(doubt.solvedReplyId) ?? null) as string | null)
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

    similarDoubts.sort((a, b) => b.similarity - a.similarity);
    return NextResponse.json({ similarDoubts });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
