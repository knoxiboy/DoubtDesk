import { NextRequest, NextResponse } from "next/server";
import { eq, or, inArray } from "drizzle-orm";
import { db } from "@/configs/db";
import { doubtsTable, repliesTable, membershipsTable, classroomsTable, usersTable } from "@/configs/schema";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { ProfileClassroom } from "@/types/profile";

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clerkUser = await currentUser();
        const email = clerkUser?.primaryEmailAddress?.emailAddress;
        const name = clerkUser?.fullName || clerkUser?.firstName || "Unknown";

        if (!email) {
            return NextResponse.json({ error: "No email found" }, { status: 400 });
        }

        // Get user details from DB
        const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));

        // Get user's doubts (email is a stable identifier)
        const doubts = await db.select().from(doubtsTable).where(eq(doubtsTable.userEmail, email));

        const replies = await db
            .select()
            .from(repliesTable)
            .where(
                or(
                    eq(repliesTable.userEmail, email),
                    eq(repliesTable.userName, name)
                )
            );

        // Get user's classroom memberships
        const memberships = await db.select().from(membershipsTable).where(eq(membershipsTable.userEmail, email));

        const classroomIds = memberships.map((m) => m.classroomId);
        let classrooms: ProfileClassroom[] = [];

        if (classroomIds.length > 0) {
            classrooms = await db
                .select()
                .from(classroomsTable)
                .where(inArray(classroomsTable.id, classroomIds));
        }

        // Calculate stats
        const totalDoubts = doubts.length;
        const totalReplies = replies.length;
        const helpfulVotes = doubts.reduce((acc, doubt) => acc + (doubt.likes || 0), 0);

        return NextResponse.json({
            user: {
                ...dbUser,
                name,
                email,
                imageUrl: clerkUser?.imageUrl,
                joinDate: dbUser?.createdAt || clerkUser?.createdAt || new Date(),
            },
            stats: {
                totalDoubts,
                totalReplies,
                helpfulVotes,
                classroomsCount: memberships.length,
            },
            activities: {
                doubts,
                replies,
                classrooms,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Server error";
        console.error("Profile fetch error:", error);
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
