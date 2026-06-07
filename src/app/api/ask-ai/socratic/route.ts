import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { buildSocraticMessages } from "@/lib/socratic-prompt";
import type { SocraticRequest, SocraticResponse } from "@/types/mentor";

// Import core guard stacks utilized by standard AI routes
import { currentUser } from "@clerk/nextjs/server";
import { checkUserBlock } from "@/lib/auth-utils";
import { moderateContent, handleModerationViolation } from "@/lib/moderation";
import { db } from "@/configs/db";
import { membershipsTable } from "@/configs/schema";
import { and, eq } from "drizzle-orm";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Constants for payload protection
const MAX_PAYLOAD_SIZE = 128 * 1024; // 128 KB limit

// White-listed roles to prevent prompt-injection or breaking downstream compilation
const ALLOWED_ROLES = ["user", "assistant", "system"];

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication Guard via Clerk
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Administrative Block Guard
    const { isBlocked, errorResponse: blockResponse } = await checkUserBlock(email);
    if (isBlocked) return blockResponse;

    // --- ENHANCEMENT 1: Payload Size Guard ---
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        { error: "Payload too large. Maximum allowed size is 128KB." },
        { status: 413 }
      );
    }

    // Read the body safely now that size is validated
    const body: SocraticRequest & { classroomId?: string | number } = await req.json();
    const { messages, doubt, classroomId } = body;

    // --- ENHANCEMENT 2: Structural & Runtime Type Validation ---
    if (!doubt?.trim()) {
      return NextResponse.json({ error: "Doubt string is required" }, { status: 400 });
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid payload: 'messages' must be a valid array" },
        { status: 400 }
      );
    }

    // QUICK WIN FIX: Validate incoming messages structure & roles
    for (const msg of messages) {
      if (!msg || typeof msg !== "object") {
        return NextResponse.json({ error: "Malformed item inside messages array" }, { status: 400 });
      }
      if (typeof msg.content !== "string") {
        return NextResponse.json({ error: "Each message must have a valid string content parameter" }, { status: 400 });
      }
      if (!ALLOWED_ROLES.includes(msg.role)) {
        return NextResponse.json({ error: `Invalid role explicitly passed: ${msg.role}` }, { status: 400 });
      }
    }

    // 5. Context-Aware Classroom Membership Guard
    if (classroomId) {
      const parsedClassroomId = parseInt(classroomId.toString(), 10);
      if (!isNaN(parsedClassroomId)) {
        const [membership] = await db
          .select()
          .from(membershipsTable)
          .where(
            and(
              eq(membershipsTable.userEmail, email),
              eq(membershipsTable.classroomId, parsedClassroomId)
            )
          );

        if (!membership) {
          return NextResponse.json({ error: "Access denied to this classroom" }, { status: 403 });
        }
      }
    }

    // 6. Content Moderation Guard (AI Safety Check)
    const moderation = await moderateContent(doubt);
    const violationError = await handleModerationViolation(email, doubt, moderation);
    if (violationError) {
      return NextResponse.json({ error: violationError }, { status: 400 });
    }

    // --- Proceeding with Paid LLM Compilation safely ---
    const groqMessages = buildSocraticMessages(messages, doubt);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: groqMessages as Parameters<typeof groq.chat.completions.create>[0]["messages"],
      temperature: 0.4,
      max_tokens: 512,
      response_format: { type: "json_object" },
    });

    // --- ENHANCEMENT 3: Prevent Mocked Fallbacks & Validate Schema ---
    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      return NextResponse.json(
        { error: "AI gateway failed to generate content parameters" },
        { status: 502 }
      );
    }

    let parsed: SocraticResponse;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      return NextResponse.json(
        { error: "AI response violated required system syntax formatting" },
        { status: 502 }
      );
    }

    // MAJOR FIX: Runtime validation of downstream SocraticResponse contract keys
    // (Ensure these properties perfectly match your specific type interface definitions!)
    if (
      !parsed || 
      typeof parsed !== "object" || 
      !("feedback" in parsed) || // Replace with your exact SocraticResponse keys
      !("nextQuestion" in parsed) // Replace with your exact SocraticResponse keys
    ) {
      return NextResponse.json(
        { error: "AI contract failure: structural schema mismatch against interface contract" },
        { status: 502 }
      );
    }

    const usage = completion.usage as Record<string, unknown> | undefined;
    if (usage) {
      console.log("[socratic] token usage:", JSON.stringify(usage));
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[socratic] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
