import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { db } from '@/configs/db';
import { doubtsTable, repliesTable, usersTable, classroomsTable } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { moderateContent, handleModerationViolation } from '@/lib/moderation';
import { checkPedagogicalDrift } from '@/lib/pedagogy';
import { buildErrorResponse, errorResponse } from '@/lib/error-handler';
import {
    parseClassroomId,
    requireAuth,
    requireMembership,
} from '@/lib/auth/membership-guard';
import { aiLimiter } from '@/lib/ratelimit';
import {
    buildAiProviderErrorResponse,
    enforceAiAvailability,
} from '@/lib/ai/kill-switch';
import {
    AI_REQUEST_MAX_BYTES,
    AI_REQUEST_MAX_SIZE_LABEL,
    validateAiImageDataUrl,
} from '@/lib/ai-image-validation';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'dummy_key',
});

/**
 * Reliability & Retry Protection
 */
const MAX_FALLBACK_ATTEMPTS = 2;
const MODEL_COOLDOWN_MS = 30000;

const modelCooldowns = new Map<string, number>();

/**
 * List of academic subjects for auto-detection and categorization.
 */
const SUBJECT_LIST =
    'Algebra, Calculus, Geometry, Trigonometry, Statistics, Physics, Chemistry, Biology, Operating Systems, Networking, Data Structures, Algorithms, Programming, Computer Science, Economics, Accounting, English, Other';

/**
 * Priority models for different types of queries.
 * We use a fallback system to ensure reliability if a model is rate-limited or decommissioned.
 */
const VISION_MODELS = [
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'pixtral-12b-2409',
    'llama-3.2-90b-vision-preview',
];

const TEXT_MODELS = [
    'llama-3.3-70b-versatile',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'llama-3.1-70b-versatile',
];

const IMAGE_QUALITY_ERROR =
    "We couldn't read your image clearly. Please upload a clearer photo or type your doubt instead.";

const UNCLEAR_IMAGE_PATTERNS = [
    /cannot\s+(read|see|determine|identify)/i,
    /can't\s+(read|see|determine|identify)/i,
    /image\s+(is\s+)?(unclear|blurry|blurred|unreadable|not clear)/i,
    /text\s+(is\s+)?(unclear|blurry|blurred|unreadable|not legible)/i,
    /please\s+(upload|provide).*(clearer|higher[-\s]?quality)/i,
];

function jsonError(
    error: string,
    status: number,
    code?: string,
    headers?: HeadersInit
) {
    return NextResponse.json(
        {
            error,
            ...(code ? { code } : {}),
        },
        { status, headers }
    );
}

async function readJsonWithLimit(req: Request) {
    const contentLength = Number(req.headers.get('content-length') || 0);

    if (contentLength > AI_REQUEST_MAX_BYTES) {
        return {
            ok: false as const,
            response: jsonError(
                `Requests must be ${AI_REQUEST_MAX_SIZE_LABEL} or smaller.`,
                413,
                'REQUEST_TOO_LARGE'
            ),
        };
    }

    if (!req.body) {
        return {
            ok: true as const,
            data: {},
        };
    }

    const reader = req.body.getReader();
    const decoder = new TextDecoder();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
        const { done, value } = await reader.read();

        if (done) break;
        if (!value) continue;

        receivedBytes += value.byteLength;

        if (receivedBytes > AI_REQUEST_MAX_BYTES) {
            await reader.cancel();

            return {
                ok: false as const,
                response: jsonError(
                    `Requests must be ${AI_REQUEST_MAX_SIZE_LABEL} or smaller.`,
                    413,
                    'REQUEST_TOO_LARGE'
                ),
            };
        }

        chunks.push(value);
    }

    let rawBody = '';

    for (const chunk of chunks) {
        rawBody += decoder.decode(chunk, { stream: true });
    }

    rawBody += decoder.decode();

    try {
        return {
            ok: true as const,
            data: rawBody ? JSON.parse(rawBody) : {},
        };
    } catch {
        return {
            ok: false as const,
            response: jsonError(
                'Invalid JSON request body.',
                400,
                'INVALID_JSON'
            ),
        };
    }
}

function isUnclearVisionReply(reply: string) {
    const normalizedReply = reply
        .replace(/^SUBJECT:\s*.+\n?/im, '')
        .trim();

    return (
        normalizedReply.length < 50 ||
        UNCLEAR_IMAGE_PATTERNS.some((pattern) =>
            pattern.test(normalizedReply)
        )
    );
}

/**
 * Determines whether a provider/model failure should trigger fallback retries.
 */
function shouldRetryModel(err: unknown): boolean {
    const error = err as { status?: number; message?: string };
    const retryableStatuses = [429, 500, 502, 503, 504];

    if (error?.status && retryableStatuses.includes(error.status)) {
        return true;
    }

    const message = error?.message?.toLowerCase?.() || "";

    if (
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('temporarily unavailable')
    ) {
        return true;
    }

    return false;
}

/**
 * Checks whether a model is currently in cooldown state.
 */
function isModelCoolingDown(model: string): boolean {
    const lastFailure = modelCooldowns.get(model);

    if (!lastFailure) return false;

    return (
        Date.now() - lastFailure <
        MODEL_COOLDOWN_MS
    );
}

/**
 * Marks a model as temporarily unstable.
 */
function markModelFailure(model: string) {
    modelCooldowns.set(model, Date.now());
}

/**
 * Executes a chat completion request with safer retry/fallback orchestration.
 * @param messages Array of chat messages
 * @param isVision Whether the request includes an image
 */
async function callGroqWithFallback(
    messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
    isVision: boolean,
) {
    const models = isVision ? VISION_MODELS : TEXT_MODELS;

    const limitedModels = models.slice(
        0,
        MAX_FALLBACK_ATTEMPTS
    );

    let lastError = null;

    for (const model of limitedModels) {
        if (isModelCoolingDown(model)) {
            console.warn(
                `Skipping model ${model} due to cooldown`
            );

            continue;
        }

        try {
            console.log(
                `Attempting Groq request with model: ${model}`
            );

            const completion =
                await groq.chat.completions.create({
                    messages,
                    model,
                    temperature: 0.5,
                    max_tokens: 2048,
                    top_p: 1,
                });

            return {
                completion,
                modelUsed: model,
            };
        } catch (err: unknown) {
            const error = err as { status?: number; message?: string };
            console.warn(`Model ${model} failed:`, error?.message);

            lastError = err;

            /**
             * Permanent failures should not trigger
             * cascading retries across providers.
             */
            if (
                error?.status === 400 ||
                error?.status === 401 ||
                error?.status === 403 ||
                error?.status === 404
            ) {
                throw err;
            }

            /**
             * Only transient/provider instability failures
             * should trigger provider cooldowns.
             */
            if (shouldRetryModel(err)) {
                markModelFailure(model);
                continue;
            }

            throw err;
        }
    }

    throw (
        lastError ||
        new Error(
            'All AI providers are temporarily unavailable.'
        )
    );
}

/**
 * Main AI Solver API Route.
 */
// Maximum allowed Content-Length for this route in bytes.
// imageBase64 payloads are read entirely into memory before the slice, so a
// large body allocates the full payload on the server heap before any truncation
// occurs. Enforcing this limit early keeps memory usage predictable under load.
const MAX_BODY_BYTES = 512 * 1024; // 512 KB

export async function POST(req: Request) {
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
                const [newDoubt] = await db
                    .insert(doubtsTable)
                    .values({
                        userName: fullName,
                        userEmail: email || null,
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
                            userName: 'DoubtDesk AI',
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

        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
