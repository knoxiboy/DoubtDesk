// app/api/karma/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { usersTable, karmaTransactionsTable, userBadgesTable, badgeDefinitionsTable } from "@/configs/schema";
import { eq, desc, sql } from "drizzle-orm";
import { buildErrorResponse } from "@/lib/errors/error-handler";
import { checkAndAwardBadges } from "@/lib/karma/karma-utils";
import { currentUser } from "@clerk/nextjs/server";

// ── KARMA LEVEL THRESHOLDS ────────────────────────────────────────────────────
const KARMA_LEVELS = [
    { level: 1, label: "Newbie",      minKarma: 0,    icon: "🌱" },
    { level: 2, label: "Contributor", minKarma: 100,  icon: "⚡" },
    { level: 3, label: "Scholar",     minKarma: 300,  icon: "📚" },
    { level: 4, label: "Expert",      minKarma: 700,  icon: "🎓" },
    { level: 5, label: "Legend",      minKarma: 1500, icon: "🏆" },
];

// Karma point metrics per event definition
const KARMA_POINTS: Record<string, number> = {
    answer_upvoted:       +10,
    answer_accepted:      +25,
    spam_report_accepted: -15,
    answer_downvoted:     -2,
    streak_bonus:         +5,
};

// ── GET /api/karma ────────────────────────────────────────────────────────────
export async function GET() {
    const userContext = await currentUser();
    if (!userContext) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = userContext.primaryEmailAddress?.emailAddress;
    if (!email) {
        return NextResponse.json({ error: "User email not found" }, { status: 400 });
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
        return NextResponse.json({ error: "User profile not found." }, { status: 404 });
    }

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

    const recentHistory = await db
        .select({
            id:        karmaTransactionsTable.id,
            points:    karmaTransactionsTable.points,
            eventType: karmaTransactionsTable.eventType,
            note:      karmaTransactionsTable.note,
            createdAt: karmaTransactionsTable.createdAt,
        })
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
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userEmail, eventType, replyId, doubtId, note } = body;

        if (!eventType) {
            return NextResponse.json({ error: "Missing required parameter: eventType" }, { status: 400 });
        }

        const points = KARMA_POINTS[eventType];
        if (points === undefined) {
            return NextResponse.json({ error: `Unknown eventType context: ${eventType}` }, { status: 400 });
        }

        // ── 1. SECURE PRIVILEGE BOUNDARY VERIFICATION ────────────────────────
        const authHeader = req.headers.get("authorization");
        const systemToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
        const isInternalServiceCall = systemToken === process.env.CRON_SECRET && process.env.CRON_SECRET !== undefined;

        if (!isInternalServiceCall) {
            return NextResponse.json({ 
                error: "Forbidden: Client-side score adjustments are completely disabled to prevent system exploitation." 
            }, { status: 403 });
        }

        if (!userEmail) {
            return NextResponse.json({ error: "Missing target userEmail for system-level mutation" }, { status: 400 });
        }

        // ── 2. TRANSACTION MUTATION MANAGEMENT ───────────────────────────────────
        // FIX: Wrap all mutation procedures within an explicit database-level transaction.
        // If anything fails or throws an integrity error, the whole execution rolls back cleanly.
        const result = await db.transaction(async (tx: any) => {
            const targetScoreSql = sql`${usersTable.karmaScore} + ${points}`;
            const atomicLevelCaseSql = sql`CASE 
                WHEN ${targetScoreSql} >= 1500 THEN 5
                WHEN ${targetScoreSql} >= 700  THEN 4
                WHEN ${targetScoreSql} >= 300  THEN 3
                WHEN ${targetScoreSql} >= 100  THEN 2
                ELSE 1
            END`;

            // A. Execute User Table Update
            const [updatedUser] = await tx
                .update(usersTable)
                .set({
                    karmaScore: targetScoreSql,
                    karmaLevel: atomicLevelCaseSql,
                })
                .where(eq(usersTable.email, userEmail))
                .returning({ 
                    karmaScore: usersTable.karmaScore,
                    karmaLevel: usersTable.karmaLevel 
                });

            // If the user profile isn't found, we throw an explicit error string to auto-rollback the transaction context
            if (!updatedUser) {
                throw new Error("USER_NOT_FOUND");
            }

            // B. Execute Audit Ledger Entry
            await tx.insert(karmaTransactionsTable).values({
                userEmail: userEmail,
                points,
                eventType,
                replyId:  replyId  ?? null,
                doubtId:  doubtId  ?? null,
                note:     note     ?? "System mutation processed via secure worker node",
            });

            return updatedUser;
        });

        // Run badge updates outside the heavy database transaction window to free pool locks
        const newBadges = await checkAndAwardBadges(userEmail);

        return NextResponse.json({
            success:      true,
            karmaScore:   result.karmaScore,
            karmaLevel:   result.karmaLevel,
            pointsAwarded: points,
            newBadges,
        });

    } catch (error: any) {
        // Intercept explicit missing profile lookups safely 
        if (error instanceof Error && error.message === "USER_NOT_FOUND") {
            return NextResponse.json({ error: "Target user profile was not found inside the dataset." }, { status: 404 });
        }

        // Intercept structural foreign key violations cleanly (e.g., bad replyId or doubtId format)
        if (error?.code === "23503") {
            return NextResponse.json({ 
                error: "Data Integrity Failure: Associated reference values do not exist in parent tables." 
            }, { status: 400 });
        }
        
        console.error("CRITICAL: Karma mutation endpoint exception:", error);
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
