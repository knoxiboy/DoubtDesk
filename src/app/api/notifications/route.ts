import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { notificationsTable } from "@/configs/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { parsePositiveInt } from "@/lib/utils/utils";

export async function GET(req: Request) {
    try {
        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userEmail = user.primaryEmailAddress.emailAddress;

        const { searchParams } = new URL(req.url);
        const pageStr = searchParams.get("page");
        const offsetStr = searchParams.get("offset");
        const limitStr = searchParams.get("limit");

        const limit = parsePositiveInt(limitStr, 50);
        const offset = offsetStr
            ? parsePositiveInt(offsetStr, 0)
            : (pageStr ? (parsePositiveInt(pageStr, 1) - 1) * limit : 0);
        const page = Math.floor(offset / limit) + 1;

        // Run all independent queries in parallel
        const [[totalCountRow], [unreadCountRow], notifications] = await Promise.all([
            db.select({ count: sql<number>`count(*)::int` })
                .from(notificationsTable)
                .where(eq(notificationsTable.userEmail, userEmail)),
            db.select({ count: sql<number>`count(*)::int` })
                .from(notificationsTable)
                .where(and(
                    eq(notificationsTable.userEmail, userEmail),
                    eq(notificationsTable.isRead, false)
                )),
            db.select()
                .from(notificationsTable)
                .where(eq(notificationsTable.userEmail, userEmail))
                .orderBy(
                    desc(notificationsTable.createdAt),
                    desc(notificationsTable.id)
                )
                .limit(limit)
                .offset(offset),
        ]);
        const totalCount = totalCountRow?.count ?? 0;
        const unreadCount = unreadCountRow?.count ?? 0;

        const hasMore = offset + notifications.length < totalCount;

        return NextResponse.json({ 
            success: true, 
            notifications, 
            unreadCount,
            hasMore,
            totalCount,
            page,
            limit
        });

    } catch (error: unknown) {
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

    } catch (error: unknown) {
        console.error("Error updating notifications:", error);
        return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
    }
}
