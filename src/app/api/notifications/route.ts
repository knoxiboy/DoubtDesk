import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { notificationsTable } from "@/configs/schema";
import { eq, desc, and } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function GET(req: Request) {
    try {
        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userEmail = user.primaryEmailAddress.emailAddress;

        // Fetch user's notifications, ordered by most recent first
        const notifications = await db.select()
            .from(notificationsTable)
            .where(eq(notificationsTable.userEmail, userEmail))
            .orderBy(desc(notificationsTable.createdAt))
            .limit(50); // Get last 50 notifications

        // Calculate unread count
        const unreadCount = notifications.filter(n => !n.isRead).length;

        return NextResponse.json({ 
            success: true, 
            notifications, 
            unreadCount 
        });

    } catch (error: any) {
        console.error("Error fetching notifications:", error);
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userEmail = user.primaryEmailAddress.emailAddress;
        
        const body = await req.json();
        const { notificationId, markAllRead } = body;

        if (markAllRead) {
            await db.update(notificationsTable)
                .set({ isRead: true })
                .where(eq(notificationsTable.userEmail, userEmail));
        } else if (notificationId) {
            await db.update(notificationsTable)
                .set({ isRead: true })
                .where(and(
                    eq(notificationsTable.id, notificationId),
                    eq(notificationsTable.userEmail, userEmail)
                ));
        } else {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Error updating notifications:", error);
        return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
    }
}
