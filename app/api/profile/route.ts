import { NextRequest, NextResponse } from "next/server";
import { eq, or, inArray } from "drizzle-orm";
import { db } from "@/configs/db";
import { doubtsTable, repliesTable, membershipsTable, classroomsTable, usersTable } from "@/configs/schema";
import { auth, currentUser } from "@clerk/nextjs/server";
import type { ProfileClassroom } from "@/types/profile";

export async function GET(req: Request) {
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

        const [dbUserResults, doubts, replies, memberships] = await Promise.all([
            db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1),
            db.select().from(doubtsTable).where(eq(doubtsTable.userEmail, email)),
            db.select().from(repliesTable).where(or(eq(repliesTable.userEmail, email), eq(repliesTable.userName, name))),
            db.select().from(membershipsTable).where(eq(membershipsTable.userEmail, email))
        ]);

        const dbUser = dbUserResults[0];

        const classroomIds = memberships.map((m) => m.classroomId);
        let classrooms: ProfileClassroom[] = [];

        if (classroomIds.length > 0) {
            classrooms = await db
                .select()
                .from(classroomsTable)
                .where(inArray(classroomsTable.id, classroomIds));
        }

        const totalDoubts = doubts.length;
        const totalReplies = replies.length;
        const helpfulVotes = doubts.reduce((acc, doubt) => acc + (doubt.likes || 0), 0);

        const rawJoinDate = dbUser?.createdAt || (clerkUser?.createdAt ? new Date(clerkUser.createdAt) : new Date());
        const joinDate = rawJoinDate instanceof Date ? rawJoinDate.toISOString() : new Date(rawJoinDate).toISOString();

        const userData = {
            id: dbUser?.id || 0,
            name: name,
            email: email,
            university: dbUser?.university || undefined,
            year: dbUser?.year || undefined,
            collegeEmail: dbUser?.collegeEmail || undefined,
            role: dbUser?.role || undefined,
            onboarded: dbUser?.onboarded || false,
            imageUrl: clerkUser?.imageUrl || undefined,
            joinDate: joinDate,
        };

        return NextResponse.json({
            user: userData,
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
    } catch (error: any) {
        console.error("Profile API Error:", error);
        return NextResponse.json(
            { error: error?.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
