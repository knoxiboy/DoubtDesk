import { db } from "@/configs/db";
import { repliesTable, doubtsTable, classroomsTable } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { updateReplyActionSchema } from "@/lib/validations/reply";
import { DOUBT_STATUS, DoubtStatus, isValidDoubtStatus } from "@/lib/doubtStatus";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { errorResponse, data } = await parseAndValidateRequest(req, updateReplyActionSchema);
        if (errorResponse) return errorResponse;
        const { content, imageUrl } = data;
        

        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        const { id } = await params;
        const parsedReplyId = parseInt(id);

        if (isNaN(parsedReplyId)) {
            return NextResponse.json({ error: "Invalid data" }, { status: 400 });
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
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const updateData: any = {};
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

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        const { id } = await params;
        const replyId = parseInt(id);

        if (isNaN(replyId)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
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
