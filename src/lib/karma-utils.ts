// lib/karma-utils.ts
// Helper functions for the Karma system:
//   - checkAndAwardBadges  → run after every karma event
//   - updateStreak         → run daily via inngest job

import { db } from "@/configs/db";
import {
    usersTable,
    repliesTable,
    doubtsTable,
    badgeDefinitionsTable,
    userBadgesTable,
    karmaTransactionsTable,
} from "@/configs/schema";
import { eq, and, count, sql } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BadgeCondition {
    type:
        | "subject_answers"   // solved X doubts in a given subject
        | "streak_days"       // maintained streak of X days
        | "karma_milestone"   // reached X karma
        | "accepted_answers"  // got X answers accepted
        | "total_answers";    // posted X answers total
    subject?: string;         // used by "subject_answers"
    count?:   number;
    days?:    number;
    karma?:   number;
}

// ── checkAndAwardBadges ───────────────────────────────────────────────────────
/**
 * Evaluate ALL badge definitions against the user's current stats.
 * Awards any badge the user has earned but not yet received.
 * Returns an array of newly awarded badge slugs (empty if none).
 */
export async function checkAndAwardBadges(userEmail: string): Promise<string[]> {
    // Fetch all badge definitions
    const allBadges = await db.select().from(badgeDefinitionsTable);

    // Fetch badges user already has
    const alreadyEarned = await db
        .select({ badgeId: userBadgesTable.badgeId })
        .from(userBadgesTable)
        .where(eq(userBadgesTable.userEmail, userEmail));

    const earnedIds = new Set(alreadyEarned.map((b) => b.badgeId));

    // Fetch user stats once (avoids N+1 queries)
    const [user] = await db
        .select({
            karmaScore:    usersTable.karmaScore,
            currentStreak: usersTable.currentStreak,
        })
        .from(usersTable)
        .where(eq(usersTable.email, userEmail))
        .limit(1);

    if (!user) return [];

    // Count total replies by this user
    const [totalRepliesRow] = await db
        .select({ total: count() })
        .from(repliesTable)
        .where(eq(repliesTable.userEmail, userEmail));

    const totalReplies = totalRepliesRow?.total ?? 0;

    // Count accepted answers (doubts where solvedReplyId matches a reply by this user)
    const [acceptedRow] = await db
        .select({ total: count() })
        .from(doubtsTable)
        .innerJoin(repliesTable, eq(doubtsTable.solvedReplyId, repliesTable.id))
        .where(eq(repliesTable.userEmail, userEmail));

    const acceptedAnswers = acceptedRow?.total ?? 0;

    const newlyAwarded: string[] = [];

    for (const badge of allBadges) {
        // Skip if user already earned this badge
        if (earnedIds.has(badge.id)) continue;

        let condition: BadgeCondition;
        try {
            condition = JSON.parse(badge.condition) as BadgeCondition;
        } catch {
            continue; // malformed condition — skip
        }

        let earned = false;

        switch (condition.type) {
            case "karma_milestone":
                earned = user.karmaScore >= (condition.karma ?? 0);
                break;

            case "streak_days":
                earned = user.currentStreak >= (condition.days ?? 0);
                break;

            case "total_answers":
                earned = totalReplies >= (condition.count ?? 0);
                break;

            case "accepted_answers":
                earned = acceptedAnswers >= (condition.count ?? 0);
                break;

            case "subject_answers": {
                // Count how many doubts in this subject the user has answered
                const [subjectRow] = await db
                    .select({ total: count() })
                    .from(repliesTable)
                    .innerJoin(doubtsTable, eq(repliesTable.doubtId, doubtsTable.id))
                    .where(
                        and(
                            eq(repliesTable.userEmail, userEmail),
                            eq(doubtsTable.subject, condition.subject ?? "")
                        )
                    );
                earned = (subjectRow?.total ?? 0) >= (condition.count ?? 0);
                break;
            }

            default:
                break;
        }

        if (earned) {
            await db.insert(userBadgesTable).values({
                userEmail,
                badgeId: badge.id,
            });
            newlyAwarded.push(badge.slug);
        }
    }

    return newlyAwarded;
}

// ── updateStreak ──────────────────────────────────────────────────────────────
/**
 * Called by the daily inngest job for every active user.
 * - If the user was active yesterday → increment streak, award streak bonus karma
 * - If the user was active today already → do nothing (idempotent)
 * - If the user missed a day → reset streak to 0
 */
export async function updateStreak(userEmail: string): Promise<void> {
    const [user] = await db
        .select({
            lastActiveDate: usersTable.lastActiveDate,
            currentStreak:  usersTable.currentStreak,
        })
        .from(usersTable)
        .where(eq(usersTable.email, userEmail))
        .limit(1);

    if (!user) return;

    const now      = new Date();
    const today    = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDate = user.lastActiveDate
        ? new Date(
            user.lastActiveDate.getFullYear(),
            user.lastActiveDate.getMonth(),
            user.lastActiveDate.getDate()
          )
        : null;

    const daysDiff = lastDate
        ? Math.floor((today.getTime() - lastDate.getTime()) / 86_400_000)
        : null;

    let newStreak = user.currentStreak;

    if (daysDiff === null || daysDiff > 1) {
        // Never active before, or missed at least one day → reset
        newStreak = 1;
    } else if (daysDiff === 1) {
        // Active yesterday → extend streak
        newStreak = user.currentStreak + 1;

        // Award streak bonus karma (+5 per active day)
        await db.insert(karmaTransactionsTable).values({
            userEmail,
            points:    5,
            eventType: "streak_bonus",
            note:      `Day ${newStreak} streak bonus`,
        });

        await db
            .update(usersTable)
            .set({ karmaScore: sql`${usersTable.karmaScore} + 5` })
            .where(eq(usersTable.email, userEmail));
    } else {
        // daysDiff === 0 → already updated today, do nothing
        return;
    }

    await db
        .update(usersTable)
        .set({
            currentStreak:  newStreak,
            lastActiveDate: now,
        })
        .where(eq(usersTable.email, userEmail));

    // Check for new streak-related badges
    await checkAndAwardBadges(userEmail);
}