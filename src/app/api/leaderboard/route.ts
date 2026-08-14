import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { usersTable } from "@/configs/schema";
import { desc, eq, sql } from "drizzle-orm";
import { getAnonymousHandle, getAnonymousInitial } from "@/lib/anonymity/anonymity";

export async function GET() {
    try {
        const topUsers = await db
            .select({
                id: usersTable.id,
                email: usersTable.email,
                name: usersTable.name,
                karmaScore: usersTable.karmaScore,
                karmaLevel: usersTable.karmaLevel,
                currentStreak: usersTable.currentStreak,
                lastContributionAt: usersTable.lastContributionAt,
            })
            .from(usersTable)
            .where(eq(usersTable.role, "student"))
            .orderBy(desc(usersTable.karmaScore))
            .limit(50);

        // Anonymize/format user data for public leaderboard
        const leaderboardData = topUsers.map((user, index) => {
            return {
                rank: index + 1,
                id: user.id,
                handle: getAnonymousHandle(user.email),
                initial: getAnonymousInitial(user.email),
                karmaScore: user.karmaScore,
                karmaLevel: user.karmaLevel,
                currentStreak: user.currentStreak,
                lastContributionAt: user.lastContributionAt,
            };
        });

        return NextResponse.json(leaderboardData);
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
