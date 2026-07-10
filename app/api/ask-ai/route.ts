import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/configs/db';
import { doubtsTable, repliesTable, usersTable } from '@/configs/schema';
import { eq, sql } from 'drizzle-orm';
import { moderateContent, handleModerationViolation } from '@/lib/moderation';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * List of academic subjects for auto-detection and categorization.
 */
const SUBJECT_LIST = 'Algebra, Calculus, Geometry, Trigonometry, Statistics, Physics, Chemistry, Biology, Operating Systems, Networking, Data Structures, Algorithms, Programming, Computer Science, Economics, Accounting, English, Other';

/**
 * Priority models for different types of queries.
 * We use a fallback system to ensure reliability if a model is rate-limited or decommissioned.
 */
const VISION_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "pixtral-12b-2409",
    "llama-3.2-90b-vision-preview"
];

const TEXT_MODELS = [
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.1-70b-versatile"
];

/**
 * Executes a chat completion request with an automatic retry/fallback mechanism.
 * @param messages Array of chat messages
 * @param isVision Whether the request includes an image
 */
async function callGroqWithFallback(messages: any[], isVision: boolean) {
    const models = isVision ? VISION_MODELS : TEXT_MODELS;
    let lastError = null;

    for (const model of models) {
        try {
            // Attempting Groq request with model
            const completion = await groq.chat.completions.create({
                messages,
                model,
                temperature: 0.5,
                max_tokens: 2048,
                top_p: 1,
            });
            return { completion, modelUsed: model };
        } catch (err: any) {
            console.warn(`Model ${model} failed:`, err?.message);
            lastError = err;
            // Continue to next model if it's a 404, 400 (decommissioned), or 401
            if (err?.status === 404 || err?.status === 400 || err?.status === 401) continue;
            throw err; // For other errors (like rate limits), throw immediately
        }
    }
    throw lastError;
}

/**
 * Main AI Solver API Route.
 * Handles:
 * 1. User Authentication (Clerk)
 * 2. Safety Block Checks
 * 3. Content Moderation (AI-based)
 * 4. Multi-mode AI Response Generation (Standard, Exam, Simple, etc.)
 * 5. Database Persistence for queries and solutions
 */
export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const fullName = user.fullName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "Academic Student");
        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        // 0. Check if user is blocked
        const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (dbUser?.blockedUntil && new Date(dbUser.blockedUntil) > new Date()) {
            const unlockDate = new Date(dbUser.blockedUntil).toDateString();
            return NextResponse.json({ 
                error: `Your account is temporarily blocked due to safety violations. Access will be restored on ${unlockDate}.` 
            }, { status: 403 });
        }

        const body = await req.json();
        const { prompt, type = 'standard', imageBase64, classroomId, history = [] } = body;

        // history format: Array<{role: 'user' | 'assistant', content: string}>

        // 1. AI Moderation Check for Prompts
        if (prompt) {
            const moderation = await moderateContent(prompt);
            const violationError = await handleModerationViolation(email, prompt, moderation);
            if (violationError) {
                return NextResponse.json({ error: violationError }, { status: 400 });
            }
        }

        if (!prompt && !imageBase64 && history.length === 0) {
            return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
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

        let systemPrompt: string;
        const isFollowUp = history.length > 0;

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

        const isVisionRequest = !!imageBase64 && !isFollowUp;
        let userMessageContent: any;

        if (isVisionRequest) {
            const visionInstruction = `Analyze the image. Follow these strict rules:
1. START with: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
2. FORMAT MATH: Use $...$ for inline symbols/variables and $$...$$ for block equations. Use LaTeX for everything mathematical.
3. STRUCTURE: Use exactly ## Step-by-step explanation, ## Simplified explanation, and ## Final Answer.
4. SUB-STEPS: Use **Step X:** for steps inside sections. No extra ## headers.
${prompt ? `Additional context from student: ${prompt}` : ''}`;

            userMessageContent = [
                { type: "text", text: visionInstruction },
                { type: "image_url", image_url: { url: imageBase64 } }
            ];
        } else {
            userMessageContent = prompt;
        }

        const messages: any[] = [];
        messages.push({ role: "system", content: systemPrompt });
        
        // Add history context
        if (isFollowUp) {
            messages.push(...history);
        }

        // Add current prompt
        if (userMessageContent) {
            messages.push({ role: "user", content: userMessageContent });
        }

        const { completion, modelUsed } = await callGroqWithFallback(messages, isVisionRequest);
        let reply = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";

        // Extract and strip the SUBJECT line (only for initial doubt)
        let subject: string = 'Other';
        if (!isFollowUp) {
            const subjectMatch = reply.match(/^SUBJECT:\s*(.+)/im);
            if (subjectMatch) {
                subject = subjectMatch[1].trim();
                reply = reply.replace(/^SUBJECT:\s*.+\n?/im, '').trimStart();
            }
        }

        // --- PERSISTENCE LOGIC (Only for the first message to create the doubt) ---
        if (!isFollowUp) {
            try {
                const [newDoubt] = await db.insert(doubtsTable).values({
                    userName: fullName,
                    userEmail: email || null,
                    subject: subject,
                    content: prompt || "Visual Inquiry",
                    imageUrl: imageBase64?.slice(0, 500),
                    classroomId: classroomId ? parseInt(classroomId.toString()) : null,
                    type: 'ai',
                    isSolved: "solved"
                }).returning();

                if (newDoubt) {
                    const [aiReply] = await db.insert(repliesTable).values({
                        doubtId: newDoubt.id,
                        userName: "DoubtDesk AI",
                        type: "solution",
                        content: reply,
                    }).returning();

                    if (aiReply) {
                        await db.update(doubtsTable).set({ solvedReplyId: aiReply.id }).where(eq(doubtsTable.id, newDoubt.id));
                    }
                }
            } catch (dbErr) {
                console.error('Failed to fully persist AI doubt and solution turn 1:', dbErr);
            }
        } else {
            // For follow-ups, we might want to log the interaction eventually, 
            // but for now, we just return the reply to maintain the chat thread.
        }

        return NextResponse.json({ reply, subject, model: modelUsed });

    } catch (error: any) {
        console.error('Error in Groq API Flow:', error);
        return NextResponse.json(
            { error: error?.message || 'The AI service is currently overloaded or experiencing issues. Please try again in 30 seconds.' },
            { status: 500 }
        );
    }
}
