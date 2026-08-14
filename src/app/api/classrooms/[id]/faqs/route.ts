import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { classroomFaqsTable } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { requireTeacher, requireMembership } from "@/lib/auth/membership-guard";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await currentUser();
        if (!user?.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const email = user.primaryEmailAddress.emailAddress;
        const { id } = await params;
        const classroomId = parseInt(id, 10);

        if (isNaN(classroomId)) {
            return NextResponse.json({ error: "Invalid classroom ID" }, { status: 400 });
        }

        const membership = await requireMembership(email, classroomId);

        const { searchParams } = new URL(req.url);
        const onlyPublished = searchParams.get("published") === "true";

        let conditions = eq(classroomFaqsTable.classroomId, classroomId);
        
        // If it's a student, or if explicitly requested, only show published FAQs
        if (membership.role === "student" || onlyPublished) {
            conditions = and(conditions, eq(classroomFaqsTable.isPublished, true)) as any;
        }

        const faqs = await db
            .select()
            .from(classroomFaqsTable)
            .where(conditions)
            .orderBy(classroomFaqsTable.createdAt);

        return NextResponse.json({ success: true, data: faqs });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch FAQs" }, { status: error.status || 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await currentUser();
        if (!user?.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const email = user.primaryEmailAddress.emailAddress;
        const { id } = await params;
        const classroomId = parseInt(id, 10);

        if (isNaN(classroomId)) {
            return NextResponse.json({ error: "Invalid classroom ID" }, { status: 400 });
        }

        await requireTeacher(email, classroomId);

        const body = await req.json();
        const { faqId, isPublished } = body;

        if (typeof faqId !== 'number' || typeof isPublished !== 'boolean') {
            return NextResponse.json({ error: "Invalid faqId or isPublished" }, { status: 400 });
        }

        const updated = await db
            .update(classroomFaqsTable)
            .set({ isPublished })
            .where(and(eq(classroomFaqsTable.id, faqId), eq(classroomFaqsTable.classroomId, classroomId)))
            .returning();

        return NextResponse.json({ success: true, data: updated[0] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to update FAQ" }, { status: error.status || 500 });
    }
}
