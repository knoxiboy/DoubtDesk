// inngest/karma.ts
import { inngest } from "./client"; 
import { db } from "@/configs/db";
import { usersTable, karmaTransactionsTable } from "@/configs/schema";
import { eq, sql, isNotNull, and } from "drizzle-orm"; 
import { checkAndAwardBadges } from "@/lib/karma/karma-utils";

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
        await db.transaction(async (tx: any) => {
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
    { id: "karma-answer-upvoted", triggers: [{ event: "karma/answer.upvoted" }] },
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
    { id: "karma-answer-accepted", triggers: [{ event: "karma/answer.accepted" }] },
    async ({ event }) => {
        const { replyAuthorEmail, replyId, doubtId } = event.data as {
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
    { id: "karma-spam-accepted", triggers: [{ event: "karma/spam.accepted" }] },
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

// ── 4. Daily Streak Processor (Fixed No-Op Over-reporting) ───────────────────
export const dailyStreakProcessor = inngest.createFunction(
    {
        id:          "karma-daily-streak",
        concurrency: { limit: 10 }, 
        triggers: [{ cron: "0 0 * * *" }]
    },
    async () => {
        const users = await db
            .select({ 
                email: usersTable.email,
                currentStreak: usersTable.currentStreak,
                lastContributionAt: usersTable.lastContributionAt,
            })
            .from(usersTable)
            .where(isNotNull(usersTable.lastContributionAt));

        let processed = 0;
        let skippedNoOp = 0;
        let failures = 0;

        const now = new Date();
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;

        for (const user of users) {
            try {
                if (!user.email || !user.lastContributionAt) continue;

                const activeTimestamp = new Date(user.lastContributionAt).getTime();
                const daysDiff = Math.floor((todayMidnight - activeTimestamp) / oneDayMs);

                if (daysDiff === 0) {
                    // Check ledger idempotency to prevent duplication if the cron job re-runs on the same day.
                    const [alreadyProcessedToday] = await db
                        .select({ id: karmaTransactionsTable.id })
                        .from(karmaTransactionsTable)
                        .where(
                            and(
                                eq(karmaTransactionsTable.userEmail, user.email),
                                eq(karmaTransactionsTable.eventType, "streak_bonus"),
                                sql`DATE(${karmaTransactionsTable.createdAt}) = CURRENT_DATE`
                            )
                        )
                        .limit(1);

                    if (alreadyProcessedToday) {
                        skippedNoOp++;
                        continue;
                    }

                    const updatedStreakValue = user.currentStreak + 1;
                    const points = KARMA_POINTS["streak_bonus"];

                    // Keep the streak increment and bonus award combined in one atomic transaction block
                    await db.transaction(async (tx: any) => {
                        
                        // 1. Increment User Streak Counter
                        await tx
                            .update(usersTable)
                            .set({ currentStreak: updatedStreakValue })
                            .where(eq(usersTable.email, user.email));

                        // 2. Compute dynamic expressions for Karma Score and Level Escalation
                        const targetScoreSql = sql`${usersTable.karmaScore} + ${points}`;
                        const atomicLevelCaseSql = sql`CASE 
                            WHEN ${targetScoreSql} >= 1500 THEN 5
                            WHEN ${targetScoreSql} >= 700  THEN 4
                            WHEN ${targetScoreSql} >= 300  THEN 3
                            WHEN ${targetScoreSql} >= 100  THEN 2
                            ELSE 1
                        END`;

                        // 3. Update Karma points and levels
                        await tx
                            .update(usersTable)
                            .set({
                                karmaScore: targetScoreSql,
                                karmaLevel: atomicLevelCaseSql,
                            })
                            .where(eq(usersTable.email, user.email));

                        // 4. Insert Ledger Record into Transaction History Table
                        await tx.insert(karmaTransactionsTable).values({
                            userEmail: user.email,
                            points,
                            eventType: "streak_bonus",
                            note: `Daily activity milestone hit! Streak grew to ${updatedStreakValue} days.`,
                        });
                    });

                    await checkAndAwardBadges(user.email);
                    processed++;

                } else if (daysDiff >= 2) {
                    await db
                        .update(usersTable)
                        .set({ currentStreak: 0 })
                        .where(eq(usersTable.email, user.email));
                    processed++;
                } else if (daysDiff === 1) {
                    // Valid trailing active window path (Contributed yesterday, hasn't contributed today yet)
                    skippedNoOp++;
                }
                
            } catch (err) {
                failures++;
                console.error(`[karma-streak] Streak update failed for target ${user.email}:`, err);
            }
        }

        // FIX: Re-architected error boundaries. We only throw an exception if the loop encountered actual 
        // code runtime/database infrastructure exceptions (failures > 0) while processing records.
        if (failures > 0 && processed === 0) {
            throw new Error(`[CRITICAL] Streak processing failed across all evaluated problem rows. Total failures: ${failures}`);
        }

        return { processed, skippedNoOp, failures };
    }
);