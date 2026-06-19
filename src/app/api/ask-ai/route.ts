import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";
import { aiLimiter } from "@/lib/ratelimit";
import { AI_REQUEST_MAX_BYTES } from "@/lib/ai-image-validation";
import { buildSystemMessages } from "@/lib/socratic-prompt";
import type { AIMode } from "@/types/ai-chat";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy_build_key" });
const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: Request): Promise<NextResponse> {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Rate limit (before touching the body) ─────────────────────────────
  const limitResult = await aiLimiter.limit(userId);
  if (!limitResult.success) {
    return NextResponse.json(
      {
        error: "Too many AI requests. Please try again shortly.",
        code: "RATE_LIMITED",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((limitResult.reset - Date.now()) / 1000)
          ),
        },
      }
    );
  }

  // ── 3. Body size guard ───────────────────────────────────────────────────
  const rawText = await req.text();
  if (rawText.length >= AI_REQUEST_MAX_BYTES) {
    return NextResponse.json(
      { error: "Requests must be 4MB or smaller.", code: "REQUEST_TOO_LARGE" },
      { status: 413 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── 4. Field aliases: accept both `message` (new) and `prompt` (old) ─────
  const prompt =
    typeof body.prompt === "string"
      ? body.prompt
      : typeof body.message === "string"
      ? body.message
      : "";

  // ── 5. Image validation ──────────────────────────────────────────────────
  if (body.imageBase64 !== undefined) {
    const img = body.imageBase64 as string;
    const validMime = /^data:image\/(png|jpe?g|webp);base64,/.test(img);
    if (!validMime) {
      return NextResponse.json(
        {
          error: "Please upload a valid PNG, JPG, or WEBP image.",
          code: "INVALID_IMAGE_PAYLOAD",
        },
        { status: 422 }
      );
    }
  }

  // ── 6. classroomId validation ────────────────────────────────────────────
  let classroomId: number | undefined;
  if (body.classroomId !== undefined) {
    const raw = body.classroomId;
    if (typeof raw !== "number" || !Number.isInteger(raw)) {
      return NextResponse.json(
        { error: "Invalid classroomId.", code: "INVALID_CLASSROOM_ID" },
        { status: 422 }
      );
    }
    classroomId = raw;
  }

  // ── 7. Classroom membership check ────────────────────────────────────────
  if (classroomId !== undefined) {
    const userWhereClause = ("userId = " + userId) as any;
    const userRows = await db
      .select()
      .from("users" as any)
      .where(userWhereClause)
      .limit(1);

    const userRow = Array.isArray(userRows)
      ? userRows[0]
      : (userRows as any)?.rows?.[0];

    if (userRow?.blockedUntil) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const memberWhereClause =
      `classroomId = ${classroomId} AND userId = '${userId}'` as any;
    const memberRows = await db
      .select()
      .from("classroomMembers" as any)
      .where(memberWhereClause)
      .limit(1);

    const members = Array.isArray(memberRows)
      ? memberRows
      : (memberRows as any)?.rows ?? [];

    if (members.length === 0) {
      return NextResponse.json(
        { error: "Access denied to this classroom" },
        { status: 403 }
      );
    }
  }

  // ── 8. Mode ──────────────────────────────────────────────────────────────
  const mode: AIMode = body.mode === "mentor" ? "mentor" : "direct";
  const history = Array.isArray(body.history)
    ? (body.history as any[]).slice(-20)
    : [];

  // ── 9. Build messages ─────────────────────────────────────────────────────
  const systemMessages = buildSystemMessages(mode);
  const messages = [
    ...systemMessages,
    ...history,
    { role: "user" as const, content: prompt.trim() },
  ];

  // ── 10. Optional moderation ───────────────────────────────────────────────
  if (process.env.MODERATION_URL) {
    try {
      const modRes = await fetch(process.env.MODERATION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: prompt }),
      });
      const modJson = await modRes.json();
      if (modJson.flagged) {
        return NextResponse.json(
          { error: "Content not allowed" },
          { status: 403 }
        );
      }
    } catch {
      // Non-fatal: continue if moderation service is unreachable
    }
  }

  // ── 11. Groq call ─────────────────────────────────────────────────────────
  const startMs = Date.now();
  let completion: Awaited<ReturnType<typeof groq.chat.completions.create>>;
  try {
    completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: mode === "mentor" ? 0.4 : 0.6,
      max_tokens: 700,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Groq API call failed";
    console.error("[ask-ai] Groq error:", msg);
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  const latencyMs = Date.now() - startMs;
  const rawReply: string = completion.choices[0]?.message?.content ?? "";
  const usage = completion.usage;

  // ── 12. Extract subject from reply (backward-compat) ─────────────────────
  const subjectMatch = rawReply.match(/^SUBJECT:\s*(.+)$/m);
  const subject = subjectMatch?.[1]?.trim() ?? null;
  const reply = rawReply.replace(/^SUBJECT:.*$/m, "").trim();

  // ── 13. Persist to DB ─────────────────────────────────────────────────────
  const user = await currentUser();

  const insertResult = await db
    .insert("aiSessions" as any)
    .values({
      userName: user?.fullName ?? "Unknown",
      subject: subject ?? body.type ?? "General",
      content: prompt.slice(0, 80),
    } as any)
    .returning();

  const inserted = Array.isArray(insertResult)
    ? insertResult[0]
    : (insertResult as any)?.rows?.[0];

  if (inserted?.id) {
    await db
      .update("aiSessions" as any)
      .set({ reply } as any)
      .where(`id = ${inserted.id}` as any);
  }

  // ── 14. Structured log ────────────────────────────────────────────────────
  console.log(
    JSON.stringify({
      event: "ask-ai",
      mode,
      latencyMs,
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
    })
  );

  return NextResponse.json({ reply, subject, mode });
}
