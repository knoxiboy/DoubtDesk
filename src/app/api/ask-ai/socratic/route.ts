import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { buildSocraticMessages } from "@/lib/socratic-prompt";
import type { SocraticRequest, SocraticResponse } from "@/types/mentor";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body: SocraticRequest = await req.json();
    const { messages, doubt } = body;

    // Validate that doubt is provided and not just empty spaces
    if (!doubt?.trim()) {
      return NextResponse.json({ error: "Doubt is required" }, { status: 400 });
    }

    const groqMessages = buildSocraticMessages(messages, doubt);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      // FIXED: Corrected the TypeScript utility type syntax using Parameters<...>
      messages: groqMessages as Parameters<
        typeof groq.chat.completions.create
      >[0]["messages"],
      temperature: 0.4,
      max_tokens: 512,
      // Groq response_format forces clean JSON — no markdown leakage
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";

    let parsed: SocraticResponse;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "AI returned malformed response" },
        { status: 500 }
      );
    }

    // Log cache usage for Vercel monitoring (prompt caching when available)
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
