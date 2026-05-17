import { NextRequest, NextResponse } from "next/server";
import { eq, notInArray, and } from "drizzle-orm";
import { db } from "@/configs/db";
import { classroomsTable, membershipsTable, usersTable } from "@/configs/schema";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
    try {
        // 1. Authenticate User
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clerkUser = await currentUser();
        const email = clerkUser?.primaryEmailAddress?.emailAddress;

        if (!email) {
            return NextResponse.json({ error: "No email found" }, { status: 400 });
        }

        // 2. Fetch User Profile from DB
        const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (!dbUser) {
            return NextResponse.json({ error: "User not found in database" }, { status: 404 });
        }

        // 3. Find Classrooms the User Has Already Joined
        const userMemberships = await db
            .select()
            .from(membershipsTable)
            .where(eq(membershipsTable.userEmail, email));
        
        const joinedClassroomIds = userMemberships.map((m) => m.classroomId);

        // 4. Query Available Classrooms (Excluding Joined Ones)
       const availableClassrooms =
    joinedClassroomIds.length > 0
        ? await db
              .select()
              .from(classroomsTable)
              .where(notInArray(classroomsTable.id, joinedClassroomIds))
        : await db.select().from(classroomsTable);


        // 5. Scoring Algorithm
        const recommendations = availableClassrooms
            .map((classroom) => {
                let score = 0;

                // Rule 1: University Match (+50 pts)
                if (dbUser.university && classroom.university?.toLowerCase() === dbUser.university.toLowerCase()) {
                    score += 50;
                }

                // Rule 2: Academic Year Match (+30 pts)
                if (dbUser.year && classroom.year === dbUser.year) {
                    score += 30;
                }

                return {
                    ...classroom,
                    recommendationScore: score,
                };
            })
            // Sort by highest score first
            .sort((a, b) => b.recommendationScore - a.recommendationScore)
            // Limit to top 5 recommendations
            .slice(0, 5);

        return NextResponse.json({ recommendations });
    } catch (error: any) {
        console.error("Recommendations error:", error);
        return NextResponse.json(
            { error: error?.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}