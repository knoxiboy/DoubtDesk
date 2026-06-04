// src/app/api/confusion/route.ts
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";
import { confusionAlertsTable, membershipsTable } from "@/configs/schema"; 
import { and, eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        const user = await currentUser();
        if (!userId || !user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const roomIdString = searchParams.get("roomId");

        if (!roomIdString) {
            return new NextResponse("Missing roomId parameter", { status: 400 });
        }

        // ✅ Explicitly parse string to Number directly since schema defines it as integer()
        const classroomId = Number(roomIdString);
        if (isNaN(classroomId)) {
            return new NextResponse("Invalid roomId parameter", { status: 400 });
        }

        const userEmail = user.emailAddresses[0]?.emailAddress;
        if (!userEmail) {
            return new NextResponse("User email not found", { status: 400 });
        }

        // 🛡️ Authorization Check via userEmail
        const [isMember] = await db
            .select()
            .from(membershipsTable)
            .where(
                and(
                    eq(membershipsTable.classroomId, classroomId),
                    eq(membershipsTable.userEmail, userEmail) 
                )
            )
            .limit(1);

        if (!isMember) {
            return new NextResponse("Access denied: You are not enrolled in this classroom", { status: 403 });
        }

        // ✅ Querying valid varchar 'status' column directly ('isRead' completely omitted)
        const [latestAlert] = await db
            .select()
            .from(confusionAlertsTable)
            .where(
                and(
                    eq(confusionAlertsTable.classroomId, classroomId),
                    eq(confusionAlertsTable.status, "active") 
                )
            )
            .orderBy(desc(confusionAlertsTable.createdAt))
            .limit(1);

        return NextResponse.json(latestAlert || null);
    } catch (error) {
        console.error("GET_CONFUSION_ALERT_ERROR", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { userId } = await auth();
        const user = await currentUser();
        if (!userId || !user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const alertIdString = searchParams.get("id");

        if (!alertIdString) {
            return new NextResponse("Missing alert id parameter", { status: 400 });
        }

        // ✅ No runtime typeof checks on types! Direct numerical parsing for schema column compatibility
        const targetId = Number(alertIdString);
        if (isNaN(targetId)) {
            return new NextResponse("Invalid alert id", { status: 400 });
        }

        const userEmail = user.emailAddresses[0]?.emailAddress;
        if (!userEmail) {
            return new NextResponse("User email not found", { status: 400 });
        }

        // Fetch alert context for authorization validation
        const [targetAlert] = await db
            .select({ classroomId: confusionAlertsTable.classroomId })
            .from(confusionAlertsTable)
            .where(eq(confusionAlertsTable.id, targetId))
            .limit(1);

        if (!targetAlert) {
            return new NextResponse("Alert not found", { status: 404 });
        }

        // Authorization check via membership mapping
        const [hasModificationRights] = await db
            .select()
            .from(membershipsTable)
            .where(
                and(
                    eq(membershipsTable.classroomId, targetAlert.classroomId),
                    eq(membershipsTable.userEmail, userEmail)
                )
            )
            .limit(1);

        if (!hasModificationRights) {
            return new NextResponse("Access denied: Action requires classroom clearance privileges", { status: 403 });
        }

        // ✅ Safely updating the valid varchar 'status' column to 'acknowledged'
        await db
            .update(confusionAlertsTable)
            .set({ 
                status: "acknowledged",
                acknowledgedAt: new Date(),
                acknowledgedBy: userEmail
            })
            .where(eq(confusionAlertsTable.id, targetId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PATCH_CONFUSION_ALERT_ERROR", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
