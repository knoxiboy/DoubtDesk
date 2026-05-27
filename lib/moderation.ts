import { Groq } from "groq-sdk";
import { db } from "@/configs/db";
import { usersTable, moderationLogsTable } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { sendWarningEmail, sendBlockEmail } from "./email";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'dummy_key',
});

/**
 * Moderation Reliability & Security Protection
 */
const MAX_MODERATION_RETRIES = 2;
const MODERATION_COOLDOWN_MS = 30000;

let moderationProviderCooldownUntil = 0;

/**
 * Lightweight heuristic filters used during moderation degradation/failures.
 * Prevents complete moderation bypass during provider instability.
 */
const HIGH_RISK_PATTERNS = [
    /kill\s+yourself/i,
    /suicide/i,
    /hate\s+speech/i,
    /racial\s+slur/i,
    /nazi/i,
    /porn/i,
    /sex\s+chat/i,
    /free\s+money/i,
    /buy\s+followers/i,
    /crypto\s+scam/i,
    /spam/i,
    /harass/i,
    /abuse/i,
    /terror/i,
    /violent\s+threat/i,
];

/**
 * Moderation result object representing the safety status of content.
 */
export interface ModerationResult {
    isAllowed: boolean;
    reason: string;
    violationType?: 'abusive' | 'off-topic' | 'spam' | 'other';
}

/**
 * Determines whether moderation provider failures are retryable.
 */
function shouldRetryModeration(error: any): boolean {
    const retryableStatuses = [429, 500, 502, 503, 504];

    if (retryableStatuses.includes(error?.status)) {
        return true;
    }

    const message =
        error?.message?.toLowerCase?.() || '';

    return (
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('temporarily unavailable')
    );
}

/**
 * Checks whether moderation provider is in cooldown mode.
 */
function isModerationCoolingDown(): boolean {
    return (
        Date.now() <
        moderationProviderCooldownUntil
    );
}

/**
 * Marks moderation provider as temporarily unstable.
 */
function markModerationFailure() {
    moderationProviderCooldownUntil =
        Date.now() + MODERATION_COOLDOWN_MS;
}

/**
 * Lightweight degraded-mode heuristic moderation.
 * Used when AI moderation provider becomes unavailable.
 */
function applyHeuristicModeration(
    content: string
): ModerationResult {
    const normalizedContent =
        content.toLowerCase();

    const matchedPattern =
        HIGH_RISK_PATTERNS.find((pattern) =>
            pattern.test(normalizedContent)
        );

    if (matchedPattern) {
        return {
            isAllowed: false,
            reason:
                'Content blocked during moderation degradation due to high-risk policy match.',
            violationType: 'abusive',
        };
    }

    /**
     * Safer degraded-mode policy:
     * allow low-risk content while explicitly indicating degraded moderation state.
     */
    return {
        isAllowed: true,
        reason:
            'Content allowed under degraded moderation mode.',
    };
}

/**
 * Uses a Large Language Model to moderate content for academic appropriateness.
 * Checks for:
 * - Academic relevance (study-related, career, tech)
 * - Abusive language, hate speech, or harassment
 * - Spam or inappropriate non-academic topics
 *
 * @param content The text to analyze
 * @returns A ModerationResult indicating if the content is safe and why
 */
export async function moderateContent(
    content: string
): Promise<ModerationResult> {
    if (!content || content.trim().length === 0) {
        return {
            isAllowed: true,
            reason: "Empty content",
        };
    }

    /**
     * Prevent repeated provider hammering during outages.
     */
    if (isModerationCoolingDown()) {
        console.warn(
            "Moderation provider cooling down. Using heuristic moderation."
        );

        return applyHeuristicModeration(content);
    }

    let lastError: any = null;

    for (
        let attempt = 0;
        attempt < MAX_MODERATION_RETRIES;
        attempt++
    ) {
        try {
            const response =
                await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: `You are a content moderator for an academic platform called DoubtDesk.
                    Your task is to analyze if the provided content is related to studies, academic subjects, career guidance, or technical questions.
                    You must also check for abusive language, hate speech, harassment, or inappropriate non-academic content.
                    
                    Return a JSON object with:
                    {
                        "isAllowed": boolean,
                        "reason": "short explanation in English",
                        "violationType": "abusive" | "off-topic" | "spam" | "other" (only if isAllowed is false)
                    }`
                        },
                        {
                            role: "user",
                            content: `Analyze this content: "${content}"`
                        }
                    ],
                    model: "llama-3.3-70b-versatile",
                    response_format: {
                        type: "json_object"
                    }
                });

            const result = JSON.parse(
                response.choices[0].message
                    .content || "{}"
            );

            return {
                isAllowed:
                    result.isAllowed ?? true,
                reason:
                    result.reason ??
                    "Content looks good",
                violationType:
                    result.violationType
            };
        } catch (error: any) {
            console.error(
                "Moderation error:",
                error
            );

            lastError = error;

            /**
             * Retry only transient moderation failures.
             */
            if (
                shouldRetryModeration(error)
            ) {
                markModerationFailure();
                continue;
            }

            break;
        }
    }

    /**
     * Fail-safe degraded moderation behavior.
     * Prevents silent moderation bypass during provider instability.
     */
    console.warn(
        "AI moderation unavailable. Falling back to heuristic moderation.",
        lastError
    );

    return applyHeuristicModeration(content);
}

/**
 * Handles the persistence of moderation violations.
 * Updates user strike count, logs the violation, and returns an error message if blocked.
 *
 * @param email User's email
 * @param content The flagged content
 * @param moderation The result from moderateContent
 * @returns An error message string if violation handled, or null if allowed
 */
export async function handleModerationViolation(
    email: string,
    content: string,
    moderation: ModerationResult
): Promise<string | null> {
    if (moderation.isAllowed) return null;

    // 1. Fetch current user state
    const [dbUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

    // 2. Increment strikes
    const newViolationCount =
        (dbUser?.violationCount || 0) + 1;

    const isThirdViolation =
        newViolationCount >= 3;

    let blockedUntil: Date | null =
        dbUser?.blockedUntil || null;

    let newBlockCount =
        dbUser?.blockCount || 0;

    if (isThirdViolation) {
        newBlockCount += 1;

        // Duration: 3 days (1st block), 7 days (2nd), 14*2^n (others)
        let durationDays = 3;

        if (newBlockCount === 2)
            durationDays = 7;
        else if (newBlockCount >= 3)
            durationDays =
                14 *
                Math.pow(
                    2,
                    newBlockCount - 3
                );

        blockedUntil = new Date();

        blockedUntil.setDate(
            blockedUntil.getDate() +
                durationDays
        );

        // Send Block Email
        await sendBlockEmail(
            email,
            durationDays,
            newBlockCount
        );
    }

    // 3. Update User Table
    await db
        .update(usersTable)
        .set({
            violationCount:
                newViolationCount,
            isBlocked:
                isThirdViolation,
            blockedUntil:
                blockedUntil,
            blockCount:
                newBlockCount
        })
        .where(
            eq(usersTable.email, email)
        );

    // 4. Log Violation to moderation_logs
    await db
        .insert(moderationLogsTable)
        .values({
            userEmail: email,
            reason: moderation.reason,
            violationType:
                moderation.violationType ||
                'other',
            contentSnippet:
                content.substring(0, 200)
        });

    // 5. Send Warning Email
    await sendWarningEmail(
        email,
        moderation.reason,
        newViolationCount
    );

    // 6. Generate Error Message for UI
    let errorMessage = `Content flagged: ${moderation.reason}. This is strike ${newViolationCount}/3. Please stick to academic topics.`;

    if (
        isThirdViolation &&
        blockedUntil
    ) {
        const unlockDate =
            blockedUntil.toDateString();

        errorMessage = `Content flagged. Your account is now blocked for ${newBlockCount > 1 ? 'additional ' : ''}violations. Access restored on ${unlockDate}.`;
    }

    return errorMessage;
}
