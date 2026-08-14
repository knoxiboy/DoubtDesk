import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { webhooksTable } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { requireTeacher } from "@/lib/auth/membership-guard";
import crypto from 'crypto';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await currentUser();
        if (!user?.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const classroomId = parseInt(params.id, 10);
        if (isNaN(classroomId)) return NextResponse.json({ error: "Invalid classroom ID" }, { status: 400 });

        await requireTeacher(user.primaryEmailAddress.emailAddress, classroomId);

        const webhooks = await db.select().from(webhooksTable).where(eq(webhooksTable.classroomId, classroomId));
        return NextResponse.json({ success: true, data: webhooks });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch webhooks" }, { status: error.status || 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = await currentUser();
        if (!user?.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const classroomId = parseInt(params.id, 10);
        if (isNaN(classroomId)) return NextResponse.json({ error: "Invalid classroom ID" }, { status: 400 });

        await requireTeacher(user.primaryEmailAddress.emailAddress, classroomId);

        const body = await req.json();
        const { url, platform, events } = body;
        
        if (!url || !platform || !events || !Array.isArray(events)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const secret = crypto.randomBytes(32).toString('hex');

        const [newWebhook] = await db.insert(webhooksTable).values({
            classroomId,
            url,
            platform,
            events,
            secret,
            isActive: true
        }).returning();

        return NextResponse.json({ success: true, data: newWebhook });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to create webhook" }, { status: error.status || 500 });
    }
}
