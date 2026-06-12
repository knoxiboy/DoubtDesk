// app/api/ask-ai/route.ts

import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";
import { aiLimiter } from "@/lib/ratelimit";
import { AI_REQUEST_MAX_BYTES } from "@/lib/ai-image-validation";
import { buildSystemMessages } from "@/lib/socratic-prompt";
import type { AIMode } from "@/types/ai-chat";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
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
        // Reject oversized payloads before parsing JSON to avoid loading
        // a multi-megabyte body into memory only to discard most of it.
        const contentLength = parseInt(req.headers.get('content-length') ?? '0', 10);
        if (contentLength > MAX_BODY_BYTES) {
            return NextResponse.json(
                { error: 'Request payload too large. Maximum size is 512 KB.' },
                { status: 413 }
            );
        }

        const { user, email } = await requireAuth();

        const fullName =
            user.fullName ||
            (user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : 'Academic Student');

        // 0. Check if user is blocked
        const [dbUser] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, email));

        if (
            dbUser?.blockedUntil &&
            new Date(dbUser.blockedUntil) > new Date()
        ) {
            const unlockDate = new Date(
                dbUser.blockedUntil
            ).toDateString();

            return errorResponse(
                `Your account is temporarily blocked due to safety violations. Access will be restored on ${unlockDate}.`,
                403
            );
        }

        const rateLimit = await aiLimiter.limit(email);

        if (!rateLimit.success) {
            const retryAfter = Math.max(
                1,
                Math.ceil((rateLimit.reset - Date.now()) / 1000)
            );

            return jsonError(
                'Too many AI requests. Please try again shortly.',
                429,
                'RATE_LIMITED',
                { 'Retry-After': String(retryAfter) }
            );
        }

        const bodyResult = await readJsonWithLimit(req);

        if (!bodyResult.ok) {
            return bodyResult.response;
        }

        const body =
            bodyResult.data &&
            typeof bodyResult.data === 'object' &&
            !Array.isArray(bodyResult.data)
                ? (bodyResult.data as Record<string, unknown>)
                : {};

        const {
            type = 'standard',
            imageBase64,
            classroomId,
            history = [],
        } = body;

        const prompt =
            typeof body.prompt === 'string' ? body.prompt : '';
        const solveType =
            typeof type === 'string' ? type : 'standard';
        let classroomIdValue: number | null = null;

        if (classroomId !== undefined && classroomId !== null) {
            try {
                classroomIdValue = parseClassroomId(classroomId);
            } catch {
                return jsonError(
                    'Invalid classroomId.',
                    422,
                    'INVALID_CLASSROOM_ID'
                );
            }
        }

        if (classroomIdValue) {
            await requireMembership(email, classroomIdValue);
        }

        const validatedImage = imageBase64
            ? validateAiImageDataUrl(imageBase64)
            : null;

        if (validatedImage && !validatedImage.ok) {
            return jsonError(
                validatedImage.error,
                validatedImage.status,
                validatedImage.code
            );
        }

        const safeImageBase64 = validatedImage?.dataUrl ?? null;

        // Validate and sanitize history entries before injecting them into the
        // LLM context. Accepting arbitrary objects would let an attacker inject
        // system-role messages that override the application system prompt or
        // bypass the moderation check applied only to the current prompt field.
        const ALLOWED_ROLES = new Set(['user', 'assistant']);
        const MAX_HISTORY_ENTRIES = 20;
        const MAX_CONTENT_LENGTH = 4000;

        const conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
        if (Array.isArray(history)) {
            for (const entry of history.slice(-MAX_HISTORY_ENTRIES)) {
                const historyEntry = entry as {
                    role?: unknown;
                    content?: unknown;
                };

                if (
                    historyEntry &&
                    typeof historyEntry === 'object' &&
                    typeof historyEntry.role === 'string' &&
                    ALLOWED_ROLES.has(historyEntry.role) &&
                    typeof historyEntry.content === 'string'
                ) {
                    conversationHistory.push({
                        role: historyEntry.role as 'user' | 'assistant',
                        content: historyEntry.content.slice(0, MAX_CONTENT_LENGTH),
                    });
                }
            }
        }

        let targetGradeLevel = 13;
        let pedagogyLevel = "Undergraduate (Freshman)";

        if (classroomIdValue) {
            try {
                const [classroom] = await db
                    .select({
                        pedagogyLevel: classroomsTable.pedagogyLevel,
                        targetGradeLevel: classroomsTable.targetGradeLevel,
                    })
                    .from(classroomsTable)
                    .where(eq(classroomsTable.id, classroomIdValue));
                if (classroom) {
                    pedagogyLevel = classroom.pedagogyLevel;
                    targetGradeLevel = classroom.targetGradeLevel;
                }
            } catch (dbErr) {
                console.error("Failed to fetch classroom pedagogy settings:", dbErr);
            }
        }

        const availabilityResponse = await enforceAiAvailability(email);
        if (availabilityResponse) return availabilityResponse;

        // 1. AI Moderation Check for Prompts
        if (prompt) {
            const moderation =
                await moderateContent(prompt);

            const violationError =
                await handleModerationViolation(
                    email,
                    prompt,
                    moderation
                );

            if (violationError) {
                return errorResponse(violationError, 400);
            }
        }

        if (
            !prompt &&
            !safeImageBase64 &&
            conversationHistory.length === 0
        ) {
            return errorResponse('Message content is required', 400);
        }

        // Global formatting rules for mathematical content using KaTeX compatibility
        const MATH_RULES = `
### MATH & SYMBOLS FORMATTING:
- Use LaTeX syntax for ALL mathematical expressions, symbols (greek letters like \\omega, \\theta), and variables (x, y).
- Inline math: Use $...$ (e.g., $\\omega_1$, $x^2$).
- Block math: Use $$...$$ for formulas or multi-line equations.
- Subscripts: Always use proper LaTeX (e.g., \\omega_1).
- Symbols: Wrap all variables and greek letters in math delimiters.
- Cleanliness: No repeated characters or filler text.`;

        const PEDAGOGY_RULES = classroomIdValue ? `
### PEDAGOGICAL LEVEL TARGET:
- The target student academic level is: ${pedagogyLevel} (Flesch-Kincaid Grade Level Target: ${targetGradeLevel}).
- Explain concepts at this specific complexity. Do NOT use terms or mathematical proofs beyond this grade level. Avoid oversimplifying unless required.` : '';

        let systemPrompt: string;

        const isFollowUp =
            conversationHistory.length > 0;

        /**
         * Dynamic Prompt Selection based on 'type' and 'history'
         */
        if (isFollowUp) {
            systemPrompt = `You are an expert AI Tutor helping a student with a doubt.
This is a FOLLOW-UP conversation. The student is asking about the previous solution.

RULES:
1. Stay focused on the previous context.
2. Be concise but encouraging.
${MATH_RULES}
3. If they ask to explain a step, break it down even further.
4. If they ask a new unrelated doubt, politely ask them to start a new session.

Respond in clean, well-spaced markdown. Do NOT use the "SUBJECT:" header for follow-ups.`;
        } else if (solveType === 'simple') {
            systemPrompt = `You are an expert AI Doubt Solver. VERY FIRST LINE must be: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
Then write 3-5 short paragraphs using plain English and a real-world analogy. No LaTeX or formulas. Respond in clean, well-spaced markdown.`;
        } else if (solveType === 'exam') {
            systemPrompt = `You are a strict exam-focused AI Tutor. Respond in clean, well-spaced markdown.
VERY FIRST LINE must be: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
${MATH_RULES}
Structure: Provide an EXAM-READY answer with Key Formula, Step-by-step, Common mistakes, and Examiner keywords. Use **Step X:** for sub-steps inside sections.`;
        } else if (solveType === 'eli10') {
            systemPrompt = `You are a friendly AI teacher explaining to a 10-year-old. VERY FIRST LINE must be: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
Use fun analogies, simple words, and no complex math notation unless explained by a fun story.

Structure:
## Step-by-step explanation
## Simplified explanation
## Final Answer

Use bold text (e.g. **Step 1:**) for sub-steps inside the sections. Do NOT use any other ## headings.`;
        } else {
            // Default/Standard mode
            systemPrompt = `You are an expert AI Doubt Solver. Always respond in clean, well-spaced markdown.

VERY FIRST LINE of your response must be exactly this:
SUBJECT: [Detected Subject]

Choose the subject from: ${SUBJECT_LIST}

${MATH_RULES}

Use EXACTLY these 3 ## sections:
## Step-by-step explanation
## Simplified explanation
## Final Answer

Use bold text (e.g. **Step 1:**) for sub-steps inside the sections. Do NOT use any other ## headings.`;
        }

        if (systemPrompt) {
            systemPrompt += PEDAGOGY_RULES;
        }

        const isVisionRequest =
            !!safeImageBase64 && !isFollowUp;

        let userMessageContent: Groq.Chat.Completions.ChatCompletionMessageParam["content"];

        if (isVisionRequest) {
            const visionInstruction = `Analyze the image. Follow these strict rules:
1. START with: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
2. FORMAT MATH: Use $...$ for inline symbols/variables and $$...$$ for block equations. Use LaTeX for everything mathematical.
3. STRUCTURE: Use exactly ## Step-by-step explanation, ## Simplified explanation, and ## Final Answer.
4. SUB-STEPS: Use **Step X:** for steps inside sections. No extra ## headers.
${prompt ? `Additional context from student: ${prompt}` : ''}`;

            userMessageContent = [
                {
                    type: 'text',
                    text: visionInstruction,
                },
                {
                    type: 'image_url',
                    image_url: {
                        url: safeImageBase64,
                    },
                },
            ];
        } else {
            userMessageContent = prompt;
        }

        const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];

        messages.push({
            role: 'system',
            content: systemPrompt,
        });

        // Add conversation history context
        if (isFollowUp) {
            messages.push(...conversationHistory);
        }

        // Add current prompt
        if (userMessageContent) {
            messages.push({
                role: 'user',
                content: userMessageContent,
            });
        }

        let completion: Awaited<ReturnType<typeof callGroqWithFallback>>["completion"];
        let modelUsed: Awaited<ReturnType<typeof callGroqWithFallback>>["modelUsed"];

        try {
            ({ completion, modelUsed } = await callGroqWithFallback(
                messages,
                isVisionRequest
            ));
        } catch (providerError: unknown) {
            return buildAiProviderErrorResponse(providerError);
        }

        let reply =
            completion.choices[0]?.message?.content ||
            "Sorry, I couldn't generate a response.";

        if (
            isVisionRequest &&
            isUnclearVisionReply(reply)
        ) {
            return errorResponse(IMAGE_QUALITY_ERROR, 422, undefined, {
                code: 'IMAGE_QUALITY_LOW',
            });
        }

        // Extract and strip the SUBJECT line (only for initial doubt)
        let subject: string = 'Other';

        if (!isFollowUp) {
            const subjectMatch =
                reply.match(/^SUBJECT:\s*(.+)/im);

            if (subjectMatch) {
                subject = subjectMatch[1].trim();

                reply = reply
                    .replace(
                        /^SUBJECT:\s*.+\n?/im,
                        ''
                    )
                    .trimStart();
            }
        }

        // --- PERSISTENCE LOGIC (Only for the first message to create the doubt) ---
        if (!isFollowUp) {
            try {
                // Ensure AI user exists
                await db.insert(usersTable).values({
                    name: 'DoubtDesk AI',
                    email: 'ai@doubtdesk.com',
                    role: 'system'
                }).onConflictDoNothing({ target: usersTable.email });

                const [newDoubt] = await db
                    .insert(doubtsTable)
                    .values({
                        userEmail: email,
                        subject,
                        content:
                            prompt || 'Visual Inquiry',
                        imageUrl:
                            safeImageBase64?.slice(0, 500),
                        classroomId: classroomIdValue,
                        type: 'ai',
                        isSolved: 'solved',
                    })
                    .returning();

                const driftResult = checkPedagogicalDrift(reply, targetGradeLevel);

                if (newDoubt) {
                    const [aiReply] = await db
                        .insert(repliesTable)
                        .values({
                            doubtId: newDoubt.id,
                            userEmail: 'ai@doubtdesk.com',
                            type: 'solution',
                            content: reply,
                            gradeLevel: driftResult.gradeLevel,
                            complexityScore: driftResult.complexityScore,
                            readabilityScore: driftResult.readabilityScore,
                            pedagogyDrifted: driftResult.pedagogyDrifted,
                            driftExplanation: driftResult.driftExplanation,
                        })
                        .returning();

                    if (aiReply) {
                        await db
                            .update(doubtsTable)
                            .set({
                                solvedReplyId:
                                    aiReply.id,
                            })
                            .where(
                                eq(
                                    doubtsTable.id,
                                    newDoubt.id
                                )
                            );
                    }
                }
            } catch (dbErr) {
                console.error(
                    'Failed to fully persist AI doubt and solution turn 1:',
                    dbErr
                );
            }
        }

        return NextResponse.json({
            reply,
            subject,
            model: modelUsed,
        });
    } catch (error: unknown) {
        console.error(
            'Error in Groq API Flow:',
            error
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
