// src/app/api/confusion/route.ts
import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { confusionAlertsTable } from "@/configs/schema";
import { and, eq, desc } from "drizzle-orm";
import { buildErrorResponse } from "@/lib/errors/error-handler";
import {
    parseClassroomId,
    requireAuth,
    requireMembership,
    requireTeacher,
} from "@/lib/auth/membership-guard";

export async function GET(req: Request) {
    try {
        const { email } = await requireAuth();

        const { searchParams } = new URL(req.url);
        const roomIdString = searchParams.get("roomId");

        if (!roomIdString) {
            return new NextResponse("Missing roomId parameter", { status: 400 });
        }

        const classroomId = parseClassroomId(roomIdString);
        await requireMembership(email, classroomId);

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
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}

export async function PATCH(req: Request) {
    try {
        const { email } = await requireAuth();

        const { searchParams } = new URL(req.url);
        const alertIdString = searchParams.get("id");

        if (!alertIdString) {
            return new NextResponse("Missing alert id parameter", { status: 400 });
        }

        const targetId = Number(alertIdString);
        if (isNaN(targetId)) {
            return new NextResponse("Invalid alert id", { status: 400 });
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

        await requireTeacher(email, targetAlert.classroomId);

        await db
            .update(confusionAlertsTable)
            .set({ 
                status: "acknowledged",
                acknowledgedAt: new Date(),
                acknowledgedBy: email
            })
            .where(eq(confusionAlertsTable.id, targetId));

        return NextResponse.json({ success: true });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
