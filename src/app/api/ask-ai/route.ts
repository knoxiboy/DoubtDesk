import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { and, eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";
import { membershipsTable, usersTable, aiSessionsTable } from "@/configs/schema";
import { enforceApiRateLimit } from "@/lib/ratelimit/api-rate-limit";
import { aiLimiter } from "@/lib/ratelimit/ratelimit";
import { AI_REQUEST_MAX_BYTES } from "@/lib/ai/ai-image-validation";
import { buildSystemMessages } from "@/lib/ai/socratic-prompt";
import { buildErrorResponse } from "@/lib/errors/error-handler";
import type { AIMode } from "@/types/ai-chat";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy_build_key" });
const MODEL = "llama-3.3-70b-versatile";

export async function POST(req: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const rateLimitResponse = await enforceApiRateLimit(aiLimiter, email, "ai");
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const declaredLength = Number.parseInt(
    req.headers.get("content-length") ?? "",
    10
  );
  if (Number.isFinite(declaredLength) && declaredLength > AI_REQUEST_MAX_BYTES) {
    return NextResponse.json(
      { error: "Requests must be 4MB or smaller.", code: "REQUEST_TOO_LARGE" },
      { status: 413 }
    );
  }

  const rawText = await req.text();
  if (rawText.length > AI_REQUEST_MAX_BYTES) {
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

  const prompt =
    typeof body.prompt === "string"
      ? body.prompt
      : typeof body.message === "string"
        ? body.message
        : "";

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

  let classroomId: number | undefined;
  if (body.classroomId !== undefined && body.classroomId !== null) {
    const raw = body.classroomId;
    if (typeof raw !== "number" || !Number.isInteger(raw)) {
      return NextResponse.json(
        { error: "Invalid classroomId.", code: "INVALID_CLASSROOM_ID" },
        { status: 422 }
      );
    }
    classroomId = raw;
  }

  if (classroomId !== undefined) {
    const [userRow] = await db
      .select({ blockedUntil: usersTable.blockedUntil })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (userRow?.blockedUntil && new Date(userRow.blockedUntil) > new Date()) {
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    const [member] = await db
      .select({ id: membershipsTable.id })
      .from(membershipsTable)
      .where(
        and(
          eq(membershipsTable.userEmail, email),
          eq(membershipsTable.classroomId, classroomId)
        )
      )
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { error: "Access denied to this classroom" },
        { status: 403 }
      );
    }
  }

  const mode: AIMode = body.mode === "mentor" ? "mentor" : "direct";
  const history = Array.isArray(body.history)
    ? (body.history as any[]).slice(-20)
    : [];

  const systemMessages = buildSystemMessages(mode);
  const messages = [
    ...systemMessages,
    ...history,
    { role: "user" as const, content: prompt.trim() },
  ];

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
      // Non-fatal: continue if moderation service is unreachable.
    }
  }

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
    console.error("[ask-ai] Groq error:", err);
    const { status, body } = buildErrorResponse(err);
    return NextResponse.json(body, { status: status === 500 ? 502 : status });
  }

  const latencyMs = Date.now() - startMs;
  const rawReply: string = completion.choices[0]?.message?.content ?? "";
  const usage = completion.usage;

  const subjectMatch = rawReply.match(/^SUBJECT:\s*(.+)$/m);
  const subject = subjectMatch?.[1]?.trim() ?? null;
  const reply = rawReply.replace(/^SUBJECT:.*$/m, "").trim();

  const [inserted] = await db
    .insert(aiSessionsTable)
    .values({
      userName: user.fullName ?? "Unknown",
      subject: subject ?? (typeof body.type === "string" ? body.type : "General"),
      content: prompt.slice(0, 80),
    })
    .returning();

  if (inserted?.id) {
    await db
      .update(aiSessionsTable)
      .set({ reply })
      .where(eq(aiSessionsTable.id, inserted.id));
  }

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
