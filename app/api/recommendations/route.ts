import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/configs/db";
import {
    usersTable,
    classroomsTable,
    membershipsTable,
    doubtsTable,
} from "@/configs/schema";

import { calculateRecommendationScore } from "@/lib/recommendation";

export async function GET() {
    try {
        // 1. Authenticate user
        const user = await currentUser();

        if (!user?.primaryEmailAddress?.emailAddress) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const email = user.primaryEmailAddress.emailAddress;

        // 2. Fetch current user profile
        const [currentDbUser] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, email));

        if (!currentDbUser) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // 3. Get classrooms already joined
        const joinedMemberships = await db
            .select({
                classroomId: membershipsTable.classroomId,
            })
            .from(membershipsTable)
            .where(eq(membershipsTable.userEmail, email));

        const joinedIds = joinedMemberships.map(
            (membership) => membership.classroomId
        );

        // 4. Fetch all candidate classrooms
const classrooms = await db
    .select()
    .from(classroomsTable)
    .where(
        joinedIds.length
            ? sql`${classroomsTable.id} NOT IN (${sql.join(
                  joinedIds.map((id) => sql`${id}`),
                  sql`, `
              )})`
            : sql`true`
    );

        if (!classrooms.length) {
            return NextResponse.json({
                recommendations: [],
            });
        }

        // 5. Fetch member counts
        const memberCounts = await db
            .select({
                classroomId: membershipsTable.classroomId,
                count: sql<number>`count(*)`.mapWith(Number),
            })
            .from(membershipsTable)
            .groupBy(membershipsTable.classroomId);

        // 6. Fetch activity counts (doubts per classroom)
        const activityCounts = await db
            .select({
                classroomId: doubtsTable.classroomId,
                count: sql<number>`count(*)`.mapWith(Number),
            })
            .from(doubtsTable)
            .where(sql`${doubtsTable.classroomId} IS NOT NULL`)
            .groupBy(doubtsTable.classroomId);

        const memberCountMap = Object.fromEntries(
            memberCounts.map((item) => [
                item.classroomId,
                item.count,
            ])
        );

        const activityCountMap = Object.fromEntries(
            activityCounts.map((item) => [
                item.classroomId,
                item.count,
            ])
        );

        // 7. Generate recommendations
        const recommendations = classrooms
            .map((classroom) => {
                const score = calculateRecommendationScore({
                    universityMatch:
                        classroom.university === currentDbUser.university,

                    yearMatch:
                        classroom.year === currentDbUser.year,

                    roleMatch:
                        currentDbUser.role === "student",

                    memberCount:
                        memberCountMap[classroom.id] || 0,

                    activityCount:
                        activityCountMap[classroom.id] || 0,
                });

                return {
                    ...classroom,
                    recommendationScore: score,
                    memberCount:
                        memberCountMap[classroom.id] || 0,
                    activityCount:
                        activityCountMap[classroom.id] || 0,
                };
            })
            .sort(
                (a, b) =>
                    b.recommendationScore -
                    a.recommendationScore
            )
            .slice(0, 6);

        return NextResponse.json({
            recommendations,
        });
    } catch (error: unknown) {
        console.error("Recommendation API Error:", error);

        const message =
            error instanceof Error
                ? error.message
                : "Internal Server Error";

        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}