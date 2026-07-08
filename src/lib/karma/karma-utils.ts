// lib/karma-utils.ts
import { db } from "@/configs/db";
import {
    usersTable,
    repliesTable,
    doubtsTable,
    badgeDefinitionsTable,
    userBadgesTable,
    karmaTransactionsTable,
} from "@/configs/schema";
import { eq, and, count, countDistinct, sql } from "drizzle-orm";

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

// ── checkAndAwardBadges (Thread-Safe Upsert Flow) ───────────────────────────────
/**
 * Evaluate ALL badge definitions against the user's current stats.
 * Safe from concurrent execution side-effects using native Upsert/Conflict fallback capture.
 */
export async function checkAndAwardBadges(userEmail: string): Promise<string[]> {
    // Fetch all badge definitions
    const allBadges = await db.select().from(badgeDefinitionsTable);

    // Fetch badges user already has
    const alreadyEarned = await db
        .select({ badgeId: userBadgesTable.badgeId })
        .from(userBadgesTable)
        .where(eq(userBadgesTable.userEmail, userEmail));

    const earnedIds = new Set(alreadyEarned.map((b: any) => b.badgeId));

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

    // Count accepted answers
    const [acceptedRow] = await db
        .select({ total: count() })
        .from(doubtsTable)
        .innerJoin(repliesTable, eq(doubtsTable.solvedReplyId, repliesTable.id))
        .where(eq(repliesTable.userEmail, userEmail));

    const acceptedAnswers = acceptedRow?.total ?? 0;

    const newlyAwarded: string[] = [];

    for (const badge of allBadges) {
        if (earnedIds.has(badge.id)) continue;

        let condition: BadgeCondition;
        try {
            condition = JSON.parse(badge.condition) as BadgeCondition;
        } catch {
            continue; // Skip malformed JSON
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
                const [subjectRow] = await db
                    .select({ total: countDistinct(repliesTable.doubtId) })
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
            const [insertedRow] = await db
                .insert(userBadgesTable)
                .values({
                    userEmail,
                    badgeId: badge.id,
                })
                .onConflictDoNothing({ 
                    target: [userBadgesTable.userEmail, userBadgesTable.badgeId] 
                })
                .returning({ id: userBadgesTable.id });

            if (insertedRow || !earnedIds.has(badge.id)) {
                newlyAwarded.push(badge.slug);
            }
        }
    }

    return newlyAwarded;
}

// ── updateStreak (With Shared Transaction State Advancements) ─────────────────
export async function updateStreak(userEmail: string): Promise<void> {
    const [user] = await db
        .select({
            lastActiveDate: usersTable.lastActiveDate,
            currentStreak:  usersTable.currentStreak,
        })
        .from(usersTable)
        .where(eq(usersTable.email, userEmail))
        .limit(1);

    if (!user || !user.lastActiveDate) return;

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const activeTimestamp = new Date(user.lastActiveDate).getTime();
    const daysDiff = Math.floor((todayMidnight - activeTimestamp) / oneDayMs);

    if (daysDiff === 0) {
        const nextStreakVal = user.currentStreak + 1;

        await db.transaction(async (tx: any) => {
            // Compute the target score inline to resolve level scaling factors
            const nextScoreSql = sql`${usersTable.karmaScore} + 5`;

            // Recompute tier level thresholds instantly during the same write lock sequence
            const atomicLevelCaseSql = sql`CASE 
                WHEN ${nextScoreSql} >= 1500 THEN 5
                WHEN ${nextScoreSql} >= 700  THEN 4
                WHEN ${nextScoreSql} >= 300  THEN 3
                WHEN ${nextScoreSql} >= 100  THEN 2
                ELSE 1
            END`;

            // ✅ Native Date assignment applied safely inside the transaction payload
            await tx
                .update(usersTable)
                .set({ 
                    karmaScore: nextScoreSql,
                    karmaLevel: atomicLevelCaseSql, 
                    currentStreak: nextStreakVal,
                    lastActiveDate: now, // Advancing the marker prevents double-dipping
                })
                .where(eq(usersTable.email, userEmail));

            await tx.insert(karmaTransactionsTable).values({
                userEmail,
                points:     5,
                eventType: "streak_bonus",
                note:       `Day ${nextStreakVal} streak milestone bonus applied.`,
            });
        });

        await checkAndAwardBadges(userEmail);

    } else if (daysDiff >= 2) {
        if (user.currentStreak > 0) {
            await db
                .update(usersTable)
                .set({ currentStreak: 0 })
                .where(eq(usersTable.email, userEmail));
        }
    }
}
