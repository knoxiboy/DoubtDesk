export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { eq, or, inArray, isNull, and } from "drizzle-orm";
import { db } from "@/configs/db";
import { doubtsTable, repliesTable, membershipsTable, classroomsTable, usersTable } from "@/configs/schema";
import { auth, currentUser } from "@clerk/nextjs/server";
import { buildErrorResponse } from "@/lib/errors/error-handler";
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
            db.select().from(repliesTable).where(eq(repliesTable.userEmail, email)),
            db.select().from(membershipsTable).where(eq(membershipsTable.userEmail, email))
        ]);

        const dbUser = dbUserResults[0];

        const classroomIds = memberships
            .map((m: any) => m.classroomId)
            .filter((id): id is number => id !== null && id !== undefined);

        let classrooms: ProfileClassroom[] = [];
        if (classroomIds.length > 0) {
            classrooms = await db
                .select()
                .from(classroomsTable)
                .where(inArray(classroomsTable.id, classroomIds));
        }

        const totalDoubts = doubts?.length || 0;
        const totalReplies = replies?.length || 0;
        const helpfulVotes = doubts ? doubts.reduce((acc, doubt) => acc + (doubt.likes || 0), 0) : 0;

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
            emailNotificationsEnabled: dbUser?.emailNotificationsEnabled ?? true,
            notificationPreference: dbUser?.notificationPreference || "instant",
            imageUrl: clerkUser?.imageUrl || undefined,
            joinDate: joinDate,
            interests: dbUser?.interests || undefined,
            learningGoals: dbUser?.learningGoals || undefined,
            subjects: dbUser?.subjects || undefined,
            instituteInfo: dbUser?.instituteInfo || undefined,
        };

        return NextResponse.json({
            user: userData,
            stats: {
                totalDoubts,
                totalReplies,
                helpfulVotes,
                classroomsCount: memberships?.length || 0,
            },
            activities: {
                doubts: doubts || [],
                replies: replies || [],
                classrooms: classrooms || [],
            },
        });
    } catch (error: unknown) {
        console.error("Profile API Error:", error);
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clerkUser = await currentUser();
        const email = clerkUser?.primaryEmailAddress?.emailAddress;

        if (!email) {
            return NextResponse.json({ error: "No email found" }, { status: 400 });
        }

        const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

        const body = await req.json();
        const { emailNotificationsEnabled, notificationPreference } = body;

        const updateData:  {
            emailNotificationsEnabled?: boolean;
            notificationPreference?: "instant" | "daily" | "weekly" | "none";
        } = {};

        if (typeof emailNotificationsEnabled === "boolean") {
            updateData.emailNotificationsEnabled = emailNotificationsEnabled;
            if (!emailNotificationsEnabled) {
                updateData.notificationPreference = "none";
            } else if (dbUser?.notificationPreference === "none" || notificationPreference === undefined) {
                updateData.notificationPreference = "instant";
            }
        }

        if (notificationPreference !== undefined) {
            const validPreferences = ["instant", "daily", "weekly", "none"];
            if (!validPreferences.includes(notificationPreference)) {
                return NextResponse.json({ error: "Invalid preference value" }, { status: 400 });
            }
            updateData.notificationPreference = notificationPreference;
            if (notificationPreference === "none") {
                updateData.emailNotificationsEnabled = false;
            } else {
                updateData.emailNotificationsEnabled = true;
            }
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        const updated = await db.update(usersTable)
            .set(updateData)
            .where(eq(usersTable.email, email))
            .returning();

        return NextResponse.json({ success: true, user: updated[0] });
    } catch (error: unknown) {
        console.error("Profile preference update error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Server error" },
            { status: 500 }
        );
    }
}
