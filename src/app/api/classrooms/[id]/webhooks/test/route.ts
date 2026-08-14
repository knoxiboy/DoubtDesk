import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { webhooksTable } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { requireTeacher } from "@/lib/auth/membership-guard";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";

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
        const { webhookId } = body;
        
        if (!webhookId) return NextResponse.json({ error: "Webhook ID required" }, { status: 400 });

        const [webhook] = await db.select().from(webhooksTable).where(and(eq(webhooksTable.id, webhookId), eq(webhooksTable.classroomId, classroomId)));
        
        if (!webhook) return NextResponse.json({ error: "Webhook not found" }, { status: 404 });

        await dispatchWebhook(webhook.url, webhook.secret, webhook.platform as any, {
            event: 'test',
            data: {
                content: 'This is a test notification from DoubtDesk to verify your webhook configuration.',
                subject: 'Test Subject',
                difficulty: 'N/A',
                url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://doubtdesk.com'}/rooms/${classroomId}`
            }
        });

        return NextResponse.json({ success: true, message: "Test webhook dispatched successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to dispatch test webhook" }, { status: error.status || 500 });
    }
}
