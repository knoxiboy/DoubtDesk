import { ServiceError } from "@/lib/errors";
import Groq from 'groq-sdk';
import { doubtsTable, repliesTable, usersTable, classroomsTable } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { moderateContent, handleModerationViolation } from '@/lib/moderation';
import { checkPedagogicalDrift } from '@/lib/pedagogy';
import { checkUserBlock } from '@/lib/auth-utils';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'dummy_key',
});

const MAX_FALLBACK_ATTEMPTS = 2;
const MODEL_COOLDOWN_MS = 30000;
const modelCooldowns = new Map<string, number>();

const SUBJECT_LIST =
    'Algebra, Calculus, Geometry, Trigonometry, Statistics, Physics, Chemistry, Biology, Operating Systems, Networking, Data Structures, Algorithms, Programming, Computer Science, Economics, Accounting, English, Other';

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

function isModelCoolingDown(model: string): boolean {
    const lastFailure = modelCooldowns.get(model);
    if (!lastFailure) return false;
    return (Date.now() - lastFailure < MODEL_COOLDOWN_MS);
}

function markModelFailure(model: string) {
    modelCooldowns.set(model, Date.now());
}

async function callGroqWithFallback(
    messages: Groq.Chat.Completions.ChatCompletionMessageParam[],
    isVision: boolean,
) {
    const models = isVision ? VISION_MODELS : TEXT_MODELS;
    const limitedModels = models.slice(0, MAX_FALLBACK_ATTEMPTS);
    let lastError = null;

    for (const model of limitedModels) {
        if (isModelCoolingDown(model)) {
            console.warn(`Skipping model ${model} due to cooldown`);
            continue;
        }

        try {
            console.log(`Attempting Groq request with model: ${model}`);
            const completion = await groq.chat.completions.create({
                messages,
                model,
                temperature: 0.5,
                max_tokens: 2048,
                top_p: 1,
            });

            return { completion, modelUsed: model };
        } catch (err: unknown) {
            const error = err as { status?: number; message?: string };
            console.warn(`Model ${model} failed:`, error?.message);
            lastError = err;

            if (error?.status === 400 || error?.status === 401 || error?.status === 403 || error?.status === 404) {
                throw err;
            }

            if (shouldRetryModel(err)) {
                markModelFailure(model);
                continue;
            }

            throw err;
        }
    }

    throw (lastError || new Error('All AI providers are temporarily unavailable.'));
}

export interface GenerateAISolutionParams {
    email: string;
    fullName: string;
    prompt?: string;
    type?: string;
    imageBase64?: string;
    classroomId?: number | null;
    history?: any[];
}

export async function generateAISolution(db: any, params: GenerateAISolutionParams) {
    const { email, fullName, prompt, type = 'standard', imageBase64, classroomId, history = [] } = params;

    // Check blocked status
    const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (dbUser?.blockedUntil && new Date(dbUser.blockedUntil) > new Date()) {
        const unlockDate = new Date(dbUser.blockedUntil).toDateString();
        throw new ServiceError(403, `Your account is temporarily blocked due to safety violations. Access will be restored on ${unlockDate}.`);
    }

    const ALLOWED_ROLES = new Set(['user', 'assistant']);
    const MAX_HISTORY_ENTRIES = 20;
    const MAX_CONTENT_LENGTH = 4000;

    const conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [];
    if (Array.isArray(history)) {
        for (const entry of history.slice(-MAX_HISTORY_ENTRIES)) {
            if (entry && typeof entry === 'object' && ALLOWED_ROLES.has(entry.role) && typeof entry.content === 'string') {
                conversationHistory.push({
                    role: entry.role as 'user' | 'assistant',
                    content: entry.content.slice(0, MAX_CONTENT_LENGTH),
                });
            }
        }
    }

    let targetGradeLevel = 13;
    let pedagogyLevel = "Undergraduate (Freshman)";

    if (classroomId) {
        try {
            const [classroom] = await db
                .select({
                    pedagogyLevel: classroomsTable.pedagogyLevel,
                    targetGradeLevel: classroomsTable.targetGradeLevel,
                })
                .from(classroomsTable)
                .where(eq(classroomsTable.id, classroomId));
            if (classroom) {
                pedagogyLevel = classroom.pedagogyLevel;
                targetGradeLevel = classroom.targetGradeLevel;
            }
        } catch (dbErr) {
            console.error("Failed to fetch classroom pedagogy settings:", dbErr);
        }
    }

    if (prompt) {
        const moderation = await moderateContent(prompt);
        const violationError = await handleModerationViolation(email, prompt, moderation);
        if (violationError) {
            throw new ServiceError(400, violationError);
        }
    }

    if (!prompt && !imageBase64 && conversationHistory.length === 0) {
        throw new ServiceError(400, 'Message content is required');
    }

    const MATH_RULES = `
### MATH & SYMBOLS FORMATTING:
- Use LaTeX syntax for ALL mathematical expressions, symbols (greek letters like \\omega, \\theta), and variables (x, y).
- Inline math: Use $...$ (e.g., $\\omega_1$, $x^2$).
- Block math: Use $$...$$ for formulas or multi-line equations.
- Subscripts: Always use proper LaTeX (e.g., \\omega_1).
- Symbols: Wrap all variables and greek letters in math delimiters.
- Cleanliness: No repeated characters or filler text.`;

    const PEDAGOGY_RULES = classroomId ? `
### PEDAGOGICAL LEVEL TARGET:
- The target student academic level is: ${pedagogyLevel} (Flesch-Kincaid Grade Level Target: ${targetGradeLevel}).
- Explain concepts at this specific complexity. Do NOT use terms or mathematical proofs beyond this grade level. Avoid oversimplifying unless required.` : '';

    let systemPrompt: string;
    const isFollowUp = conversationHistory.length > 0;

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
    } else if (type === 'simple') {
        systemPrompt = `You are an expert AI Doubt Solver. VERY FIRST LINE must be: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
Then write 3-5 short paragraphs using plain English and a real-world analogy. No LaTeX or formulas. Respond in clean, well-spaced markdown.`;
    } else if (type === 'exam') {
        systemPrompt = `You are a strict exam-focused AI Tutor. Respond in clean, well-spaced markdown.
VERY FIRST LINE must be: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
${MATH_RULES}
Structure: Provide an EXAM-READY answer with Key Formula, Step-by-step, Common mistakes, and Examiner keywords. Use **Step X:** for sub-steps inside sections.`;
    } else if (type === 'eli10') {
        systemPrompt = `You are a friendly AI teacher explaining to a 10-year-old. VERY FIRST LINE must be: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
Use fun analogies, simple words, and no complex math notation unless explained by a fun story.

Structure:
## Step-by-step explanation
## Simplified explanation
## Final Answer

Use bold text (e.g. **Step 1:**) for sub-steps inside the sections. Do NOT use any other ## headings.`;
    } else {
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

    const isVisionRequest = !!imageBase64 && !isFollowUp;
    let userMessageContent: Groq.Chat.Completions.ChatCompletionMessageParam["content"];

    if (isVisionRequest) {
        const visionInstruction = `Analyze the image. Follow these strict rules:
1. START with: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
2. FORMAT MATH: Use $...$ for inline symbols/variables and $$...$$ for block equations. Use LaTeX for everything mathematical.
3. STRUCTURE: Use exactly ## Step-by-step explanation, ## Simplified explanation, and ## Final Answer.
4. SUB-STEPS: Use **Step X:** for steps inside sections. No extra ## headers.
${prompt ? `Additional context from student: ${prompt}` : ''}`;

        userMessageContent = [
            { type: 'text', text: visionInstruction },
            { type: 'image_url', image_url: { url: imageBase64 } },
        ];
    } else {
        userMessageContent = prompt || "";
    }

    const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [];
    messages.push({ role: 'system', content: systemPrompt });

    if (isFollowUp) {
        messages.push(...conversationHistory);
    }

    if (userMessageContent) {
        messages.push({ role: 'user', content: userMessageContent });
    }

    try {
        const { completion, modelUsed } = await callGroqWithFallback(messages, isVisionRequest);
        let reply = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";

        if (isVisionRequest && isUnclearVisionReply(reply)) {
            throw new ServiceError(422, IMAGE_QUALITY_ERROR, 'IMAGE_QUALITY_LOW');
        }

        let subject: string = 'Other';

        if (!isFollowUp) {
            const subjectMatch = reply.match(/^SUBJECT:\s*(.+)/im);
            if (subjectMatch) {
                subject = subjectMatch[1].trim();
                reply = reply.replace(/^SUBJECT:\s*.+\n?/im, '').trimStart();
            }
        }

        if (!isFollowUp) {
            try {
                const [newDoubt] = await db
                    .insert(doubtsTable)
                    .values({
                        userName: fullName,
                        userEmail: email || null,
                        subject,
                        content: prompt || 'Visual Inquiry',
                        imageUrl: imageBase64?.slice(0, 500),
                        classroomId: classroomId,
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
                            .set({ solvedReplyId: aiReply.id })
                            .where(eq(doubtsTable.id, newDoubt.id));
                    }
                }
            } catch (dbErr) {
                console.error('Failed to fully persist AI doubt and solution turn 1:', dbErr);
            }
        }

        return { reply, subject, model: modelUsed };
    } catch (error: unknown) {
        console.error('Error in Groq API Flow:', error);
        
        if (error instanceof ServiceError) throw error;
        
        throw new ServiceError(500, error instanceof Error ?
            error.message :
            'The AI service is currently overloaded or experiencing issues. Please try again in 30 seconds.');
    }
}
