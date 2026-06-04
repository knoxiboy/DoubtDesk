import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { notificationsTable } from "@/configs/schema";
import { currentUser } from "@clerk/nextjs/server";

const canSeedNotifications = () => process.env.NODE_ENV !== "production";

export async function GET() {
    if (!canSeedNotifications()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(
        { error: "Method Not Allowed" },
        { status: 405, headers: { Allow: "POST" } }
    );
}

export async function POST() {
    if (!canSeedNotifications()) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userEmail = user.primaryEmailAddress.emailAddress;

        // Dummy data templates
        const dummyNotifications = [
            {
                userEmail,
                title: "New Reply to Your Doubt",
                message: "Someone has replied to your doubt 'How does Next.js App Router work?'.",
                link: "/dashboard/doubts",
                type: "reply",
                isRead: false,
            },
            {
                userEmail,
                title: "Doubt Solved",
                message: "Your doubt about React Server Components has been marked as solved.",
                link: "/dashboard/doubts",
                type: "doubt_solved",
                isRead: false,
            },
            {
                userEmail,
                title: "New Classroom Member",
                message: "A new student joined your 'Web Dev 101' classroom.",
                link: "/dashboard/classrooms",
                type: "new_member",
                isRead: true, // Making one already read to test UI
            }
        ];

        // Insert dummy notifications
        await db.insert(notificationsTable).values(dummyNotifications);

        return NextResponse.json({
            success: true,
            message: "Successfully seeded dummy notifications for the current user."
        });

    } catch (error) {
        console.error("Error seeding notifications:", error);
        return NextResponse.json({ error: "Failed to seed notifications" }, { status: 500 });
    }
}
