import { db } from "@/configs/db";
import { repliesTable, doubtsTable, classroomsTable } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { checkUserBlock } from "@/lib/auth-utils";
import { moderateContent, handleModerationViolation } from "@/lib/moderation";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { updateReplyActionSchema } from "@/lib/validations/reply";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { errorResponse: validationError, data } = await parseAndValidateRequest(req, updateReplyActionSchema);
        if (validationError) return validationError;
        const { content, imageUrl } = data;
        
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        const { isBlocked, errorResponse } = await checkUserBlock(email);
        if (isBlocked) return errorResponse;

        const { id } = await params;
        const parsedReplyId = parseInt(id);

        if (isNaN(parsedReplyId)) {
            return NextResponse.json({ error: "Invalid reply ID" }, { status: 400 });
        }

        const [reply] = await db.select().from(repliesTable).where(eq(repliesTable.id, parsedReplyId)).limit(1);
        if (!reply) return NextResponse.json({ error: "Reply not found" }, { status: 404 });

        let isTeacher = false;
        if (reply.doubtId) {
            const [doubt] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, reply.doubtId)).limit(1);
            if (doubt?.classroomId) {
                const [room] = await db.select().from(classroomsTable).where(eq(classroomsTable.id, doubt.classroomId)).limit(1);
                isTeacher = !!(room && email && room.teacherEmail === email);
            }
        }

        const isOwner = email && reply.userEmail === email;
        if (!isOwner && !isTeacher) {
            return NextResponse.json({ error: "Forbidden: not allowed to edit this reply" }, { status: 403 });
        }

        if (content) {
            const moderation = await moderateContent(content);
            const violationError = await handleModerationViolation(email, content, moderation);
            if (violationError) {
                return NextResponse.json({ error: violationError }, { status: 400 });
            }
        }

        const updateData: { content?: string | null; imageUrl?: string | null } = {};
        if (content !== undefined) updateData.content = content;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

        const updated = await db.update(repliesTable)
            .set(updateData)
            .where(eq(repliesTable.id, parsedReplyId))
            .returning();

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error("Error updating reply:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        const { isBlocked, errorResponse } = await checkUserBlock(email);
        if (isBlocked) return errorResponse;

        const { id } = await params;
        const replyId = parseInt(id);

        if (isNaN(replyId)) {
            return NextResponse.json({ error: "Invalid reply ID" }, { status: 400 });
        }

        const [reply] = await db.select().from(repliesTable).where(eq(repliesTable.id, replyId)).limit(1);
        if (!reply) return NextResponse.json({ error: "Reply not found" }, { status: 404 });

        let isTeacher = false;
        if (reply.doubtId) {
            const [doubt] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, reply.doubtId)).limit(1);
            if (doubt?.classroomId) {
                const [room] = await db.select().from(classroomsTable).where(eq(classroomsTable.id, doubt.classroomId)).limit(1);
                isTeacher = !!(room && email && room.teacherEmail === email);
            }
        }

        const isOwner = email && reply.userEmail === email;
        if (!isOwner && !isTeacher) {
            return NextResponse.json({ error: "Forbidden: not allowed to delete this reply" }, { status: 403 });
        }

        await db.delete(repliesTable).where(eq(repliesTable.id, replyId));
        return NextResponse.json({ message: "Reply deleted successfully" });
    } catch (error) {
        console.error("Error deleting reply:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
