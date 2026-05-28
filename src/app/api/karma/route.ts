// app/api/karma/route.ts
// GET  /api/karma?email=...   → fetch user's karma score, level, badges
// POST /api/karma             → award / deduct karma points

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { usersTable, karmaTransactionsTable, userBadgesTable, badgeDefinitionsTable } from "@/configs/schema";
import { eq, desc, sql } from "drizzle-orm";
import { checkAndAwardBadges } from "@/lib/karma-utils";

// ── Karma level thresholds ────────────────────────────────────────────────────
// Level 1: 0–99   → Newbie
// Level 2: 100–299 → Contributor
// Level 3: 300–699 → Scholar
// Level 4: 700–1499 → Expert
// Level 5: 1500+  → Legend
export const KARMA_LEVELS = [
    { level: 1, label: "Newbie",      minKarma: 0,    icon: "🌱" },
    { level: 2, label: "Contributor", minKarma: 100,  icon: "⚡" },
    { level: 3, label: "Scholar",     minKarma: 300,  icon: "📚" },
    { level: 4, label: "Expert",      minKarma: 700,  icon: "🎓" },
    { level: 5, label: "Legend",      minKarma: 1500, icon: "🏆" },
];

// Karma points per event type
export const KARMA_POINTS: Record<string, number> = {
    answer_upvoted:       +10,
    answer_accepted:      +25,
    spam_report_accepted: -15,
    answer_downvoted:     -2,
    streak_bonus:         +5,
};

function computeLevel(karma: number): number {
    let level = 1;
    for (const tier of KARMA_LEVELS) {
        if (karma >= tier.minKarma) level = tier.level;
    }
    return level;
}

// ── GET /api/karma?email=xxx ──────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    const email = req.nextUrl.searchParams.get("email");
    if (!email) {
        return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    const [user] = await db
        .select({
            karmaScore:    usersTable.karmaScore,
            karmaLevel:    usersTable.karmaLevel,
            currentStreak: usersTable.currentStreak,
        })
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch earned badges with definition info
    const earnedBadges = await db
        .select({
            badgeId:     badgeDefinitionsTable.id,
            slug:        badgeDefinitionsTable.slug,
            name:        badgeDefinitionsTable.name,
            description: badgeDefinitionsTable.description,
            icon:        badgeDefinitionsTable.icon,
            awardedAt:   userBadgesTable.awardedAt,
        })
        .from(userBadgesTable)
        .innerJoin(badgeDefinitionsTable, eq(userBadgesTable.badgeId, badgeDefinitionsTable.id))
        .where(eq(userBadgesTable.userEmail, email))
        .orderBy(desc(userBadgesTable.awardedAt));

    // Recent karma history (last 10 events)
    const recentHistory = await db
        .select()
        .from(karmaTransactionsTable)
        .where(eq(karmaTransactionsTable.userEmail, email))
        .orderBy(desc(karmaTransactionsTable.createdAt))
        .limit(10);

    const levelInfo = KARMA_LEVELS.find((l) => l.level === user.karmaLevel) ?? KARMA_LEVELS[0];

    return NextResponse.json({
        karmaScore:    user.karmaScore,
        karmaLevel:    user.karmaLevel,
        levelLabel:    levelInfo.label,
        levelIcon:     levelInfo.icon,
        currentStreak: user.currentStreak,
        badges:        earnedBadges,
        recentHistory,
    });
}

// ── POST /api/karma ───────────────────────────────────────────────────────────
// Body: { userEmail, eventType, replyId?, doubtId?, note? }
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { userEmail, eventType, replyId, doubtId, note } = body;

    if (!userEmail || !eventType) {
        return NextResponse.json({ error: "userEmail and eventType are required" }, { status: 400 });
    }

    const points = KARMA_POINTS[eventType];
    if (points === undefined) {
        return NextResponse.json({ error: `Unknown eventType: ${eventType}` }, { status: 400 });
    }

    // 1. Insert transaction record
    await db.insert(karmaTransactionsTable).values({
        userEmail,
        points,
        eventType,
        replyId:  replyId  ?? null,
        doubtId:  doubtId  ?? null,
        note:     note     ?? null,
    });

    // 2. Update user's karmaScore atomically, then recompute level
    const [updated] = await db
        .update(usersTable)
        .set({
            karmaScore: sql`${usersTable.karmaScore} + ${points}`,
        })
        .where(eq(usersTable.email, userEmail))
        .returning({ karmaScore: usersTable.karmaScore });

    if (!updated) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const newLevel = computeLevel(updated.karmaScore);

    await db
        .update(usersTable)
        .set({ karmaLevel: newLevel })
        .where(eq(usersTable.email, userEmail));

    // 3. Check if any badges should be awarded (async helper)
    const newBadges = await checkAndAwardBadges(userEmail);

    return NextResponse.json({
        success:      true,
        karmaScore:   updated.karmaScore,
        karmaLevel:   newLevel,
        pointsAwarded: points,
        newBadges,
    });
}