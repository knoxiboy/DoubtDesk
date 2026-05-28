// inngest/karma.ts
import { inngest } from "./client"; 
import { db } from "@/configs/db";
import { usersTable, karmaTransactionsTable } from "@/configs/schema";
import { eq, sql, isNotNull } from "drizzle-orm"; 
import { checkAndAwardBadges } from "@/lib/karma-utils";

// Karma points definitions inside worker
const KARMA_POINTS: Record<string, number> = {
    answer_upvoted:       +10,
    answer_accepted:      +25,
    spam_report_accepted: -15,
    answer_downvoted:     -2,
    streak_bonus:         +5,
};

// ── Secure Helper: Transactional Database Mutations ──────────────────────────
async function executeKarmaTransaction(payload: {
    userEmail: string;
    eventType: string;
    replyId?: number;
    doubtId?: number;
    note?: string;
}) {
    const { userEmail, eventType, replyId, doubtId, note } = payload;
    const points = KARMA_POINTS[eventType];
    
    if (points === undefined) {
        throw new Error(`[FAIL-FAST] Unknown or unmapped eventType provided: ${eventType}`);
    }

    try {
        await db.transaction(async (tx) => {
            const targetScoreSql = sql`${usersTable.karmaScore} + ${points}`;
            const atomicLevelCaseSql = sql`CASE 
                WHEN ${targetScoreSql} >= 1500 THEN 5
                WHEN ${targetScoreSql} >= 700  THEN 4
                WHEN ${targetScoreSql} >= 300  THEN 3
                WHEN ${targetScoreSql} >= 100  THEN 2
                ELSE 1
            END`;

            const [updatedUser] = await tx
                .update(usersTable)
                .set({
                    karmaScore: targetScoreSql,
                    karmaLevel: atomicLevelCaseSql,
                })
                .where(eq(usersTable.email, userEmail))
                .returning({ email: usersTable.email });

            if (!updatedUser) {
                throw new Error("USER_NOT_FOUND");
            }

            await tx.insert(karmaTransactionsTable).values({
                userEmail,
                points,
                eventType,
                replyId: replyId ?? null,
                doubtId: doubtId ?? null,
                note: note ?? "Background event mutation processed",
            });
        });

        await checkAndAwardBadges(userEmail);

    } catch (error: any) {
        if (error instanceof Error && error.message === "USER_NOT_FOUND") {
            console.error(`[CRITICAL] Aborting job worker. User target ${userEmail} does not exist in dataset.`);
            throw error;
        }
        if (error?.code === "23503") {
            const fkError = new Error(`[DATA INTEGRITY FAILURE] Foreign key violation for event ${eventType}.`);
            console.error(fkError.message, error);
            throw fkError;
        }
        console.error(`[CRITICAL] Background job processor failed for user ${userEmail}:`, error);
        throw error;
    }
}

// ── 1. Answer Upvoted (+10 karma) ─────────────────────────────────────────────
export const onAnswerUpvoted = inngest.createFunction(
    { id: "karma-answer-upvoted" },
    { event: "karma/answer.upvoted" },
    async ({ event }) => {
        const { replyAuthorEmail, replyId, doubtId } = event.data as {
            replyAuthorEmail: string;
            replyId: number;
            doubtId: number;
        };

        await executeKarmaTransaction({
            userEmail: replyAuthorEmail,
            eventType: "answer_upvoted",
            replyId,
            doubtId,
            note: "Answer received an upvote",
        });

        return { success: true, userEmail: replyAuthorEmail };
    }
);

// ── 2. Answer Accepted (+25 karma) ───────────────────────────────────────────
export const onAnswerAccepted = inngest.createFunction(
    { id: "karma-answer-accepted" },
    { event: "karma/answer.accepted" },
    async ({ event }) => {
        const { replyAuthorEmail, replyId, doubtId } = event.data as {
            replyAuthorEmail: string;
            replyAuthorEmail: string;
            replyId: number;
            doubtId: number;
        };

        await executeKarmaTransaction({
            userEmail: replyAuthorEmail,
            eventType: "answer_accepted",
            replyId,
            doubtId,
            note: "Answer marked as accepted solution",
        });

        return { success: true, userEmail: replyAuthorEmail };
    }
);

// ── 3. Spam Report Accepted (-15 karma) ──────────────────────────────────────
export const onSpamAccepted = inngest.createFunction(
    { id: "karma-spam-accepted" },
    { event: "karma/spam.accepted" },
    async ({ event }) => {
        const { offenderEmail, replyId, doubtId } = event.data as {
            offenderEmail: string;
            replyId?: number;
            doubtId?: number;
        };

        await executeKarmaTransaction({
            userEmail: offenderEmail,
            eventType: "spam_report_accepted",
            replyId,
            doubtId,
            note: "Spam/abuse report accepted against your answer",
        });

        return { success: true, userEmail: offenderEmail };
    }
);

// ── 4. Daily Streak Processor (Corrected Activity & Predicate Filters) ────────
export const dailyStreakProcessor = inngest.createFunction(
    {
        id:          "karma-daily-streak",
        concurrency: { limit: 10 }, 
    },
    { cron: "0 0 * * *" },
    async () => {
        // FIX: Replaced CTE logic with a proper boolean predicate checking if lastActiveDate IS NOT NULL
        const users = await db
            .select({ 
                email: usersTable.email,
                currentStreak: usersTable.currentStreak,
                lastActiveDate: usersTable.lastActiveDate,
            })
            .from(usersTable)
            .where(isNotNull(usersTable.lastActiveDate));

        let processed = 0;
        let failures = 0;

        const now = new Date();
        // Establish standard midnight boundary for the day that just STARTED
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        for (const user of users) {
            try {
                if (!user.email || !user.lastActiveDate) continue;

                const activeTimestamp = new Date(user.lastActiveDate).getTime();
                
                // Calculate difference relative to today's midnight mark
                const daysDiff = Math.floor((todayMidnight - activeTimestamp) / oneDayMs);

                // CRITICAL TIMING FIX: At 00:00 AM:
                // daysDiff === 0 means they interacted in the last day that just ended. Increment streak!
                if (daysDiff === 0) {
                    const updatedStreakValue = user.currentStreak + 1;

                    await db
                        .update(usersTable)
                        .set({ currentStreak: updatedStreakValue })
                        .where(eq(usersTable.email, user.email));

                    await executeKarmaTransaction({
                        userEmail: user.email,
                        eventType: "streak_bonus",
                        note: `Daily activity milestone hit! Streak grew to ${updatedStreakValue} days.`,
                    });
                    processed++;

                } else if (daysDiff >= 2) {
                    // daysDiff >= 2 means their last interaction was over 48 hours ago. Reset to 0!
                    await db
                        .update(usersTable)
                        .set({ currentStreak: 0 })
                        .where(eq(usersTable.email, user.email));
                    processed++;
                }
                
                // Note: If daysDiff === 1, it means their last activity timestamp is from an earlier session 
                // but still within a safe trailing 24-48 hour window. We let them ride safely.

            } catch (err) {
                failures++;
                console.error(`[karma-streak] Streak update failed for target ${user.email}:`, err);
            }
        }

        if (users.length > 0 && processed === 0) {
            throw new Error(`[CRITICAL] Streak processing failed across all evaluated users.`);
        }

        return { processed, failures };
    }
);