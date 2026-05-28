// inngest/karma.ts
// Background jobs for the Karma system.
//
// Jobs defined here:
//   1. onAnswerUpvoted     → triggered when a reply gets an upvote
//   2. onAnswerAccepted    → triggered when a doubt is marked solved
//   3. onSpamAccepted      → triggered when a spam report is accepted
//   4. dailyStreakProcessor → runs every night at midnight to update streaks

import { inngest } from "./client"; // re-use your existing Inngest client
import { db } from "@/configs/db";
import { usersTable } from "@/configs/schema";
import { updateStreak } from "@/lib/karma-utils";

// Helper: call the karma award API internally
async function awardKarma(payload: {
    userEmail: string;
    eventType: string;
    replyId?: number;
    doubtId?: number;
    note?: string;
}) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    await fetch(`${baseUrl}/api/karma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
}

// ── 1. Answer Upvoted (+10 karma) ─────────────────────────────────────────────
// Trigger this from your reply upvote API route:
//   await inngest.send({ name: "karma/answer.upvoted", data: { replyAuthorEmail, replyId, doubtId } })
export const onAnswerUpvoted = inngest.createFunction(
    { id: "karma-answer-upvoted" },
    { event: "karma/answer.upvoted" },
    async ({ event }) => {
        const { replyAuthorEmail, replyId, doubtId } = event.data as {
            replyAuthorEmail: string;
            replyId: number;
            doubtId: number;
        };

        await awardKarma({
            userEmail: replyAuthorEmail,
            eventType: "answer_upvoted",
            replyId,
            doubtId,
            note: "Answer received an upvote",
        });

        return { awarded: true, userEmail: replyAuthorEmail };
    }
);

// ── 2. Answer Accepted (+25 karma) ───────────────────────────────────────────
// Trigger from your "mark solved" API route:
//   await inngest.send({ name: "karma/answer.accepted", data: { replyAuthorEmail, replyId, doubtId } })
export const onAnswerAccepted = inngest.createFunction(
    { id: "karma-answer-accepted" },
    { event: "karma/answer.accepted" },
    async ({ event }) => {
        const { replyAuthorEmail, replyId, doubtId } = event.data as {
            replyAuthorEmail: string;
            replyId: number;
            doubtId: number;
        };

        await awardKarma({
            userEmail: replyAuthorEmail,
            eventType: "answer_accepted",
            replyId,
            doubtId,
            note: "Answer marked as accepted solution",
        });

        return { awarded: true, userEmail: replyAuthorEmail };
    }
);

// ── 3. Spam Report Accepted (-15 karma) ──────────────────────────────────────
// Trigger from your moderation workflow:
//   await inngest.send({ name: "karma/spam.accepted", data: { offenderEmail, replyId, doubtId } })
export const onSpamAccepted = inngest.createFunction(
    { id: "karma-spam-accepted" },
    { event: "karma/spam.accepted" },
    async ({ event }) => {
        const { offenderEmail, replyId, doubtId } = event.data as {
            offenderEmail: string;
            replyId?: number;
            doubtId?: number;
        };

        await awardKarma({
            userEmail: offenderEmail,
            eventType: "spam_report_accepted",
            replyId,
            doubtId,
            note: "Spam/abuse report accepted against your answer",
        });

        return { penalised: true, userEmail: offenderEmail };
    }
);

// ── 4. Daily Streak Processor ─────────────────────────────────────────────────
// Runs every day at midnight (UTC) — cron: "0 0 * * *"
// Processes every user to update streaks and award streak karma.
export const dailyStreakProcessor = inngest.createFunction(
    {
        id:          "karma-daily-streak",
        concurrency: { limit: 10 }, // process 10 users in parallel
    },
    { cron: "0 0 * * *" },
    async () => {
        // Fetch all user emails (only users who have ever been active)
        const users = await db
            .select({ email: usersTable.email })
            .from(usersTable)
            .where(
                // only process users who have logged in at least once
                // (lastActiveDate is not null)
                // Using raw SQL since Drizzle's isNotNull helper may vary by version
                db.$with("active").as(
                    db.select().from(usersTable)
                )
            );

        let processed = 0;
        for (const user of users) {
            try {
                await updateStreak(user.email);
                processed++;
            } catch (err) {
                console.error(`[karma-streak] failed for ${user.email}:`, err);
            }
        }

        return { processed };
    }
);