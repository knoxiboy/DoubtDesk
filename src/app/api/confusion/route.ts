import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/configs/db";
import { confusionAlertsTable } from "@/configs/schema";
import { and, eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const classroomId = searchParams.get("roomId");

        if (!classroomId) {
            return new NextResponse("Missing roomId parameter", { status: 400 });
        }

        // Fetches the most recent unread alert for the dashboard
        const [latestAlert] = await db
            .select()
            .from(confusionAlertsTable)
            .where(
                and(
                    eq(confusionAlertsTable.classroomId, classroomId),
                    eq(confusionAlertsTable.isRead, false)
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
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const alertIdString = searchParams.get("id");

        if (!alertIdString) {
            return new NextResponse("Missing alert id parameter", { status: 400 });
        }

        // Checks the inferred schema column type to parse safely as a string or number
        const targetId = typeof confusionAlertsTable.id.$inferData === "number"
            ? Number(alertIdString)
            : alertIdString;

        await db
            .update(confusionAlertsTable)
            .set({ isRead: true })
            // Explicitly cast to the exact schema definition to satisfy compilation rules safely
            .where(eq(confusionAlertsTable.id, targetId as typeof confusionAlertsTable.id.$inferData));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PATCH_CONFUSION_ALERT_ERROR", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
