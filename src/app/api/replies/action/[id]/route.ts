import { db } from "@/configs/db";
import {
  repliesTable,
  doubtsTable,
  classroomsTable,
  membershipsTable,
} from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { checkUserBlock } from "@/lib/auth/auth-utils";
import { moderateContent, handleModerationViolation } from "@/lib/moderation/moderation";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { updateReplyActionSchema } from "@/lib/validations/reply";
import { auditLog, AUDIT_ACTIONS } from "@/lib/audit/audit";
import { canTeach } from "@/lib/auth/membership-guard";
import { DOUBT_STATUS } from "@/lib/doubts/doubtStatus";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { errorResponse: validationError, data } = await parseAndValidateRequest(req, updateReplyActionSchema);
        if (validationError) return validationError;
        const { content, imageUrl, originalCode, correctedCode, language } = data;
        
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
            const [doubt] = await db
                .select()
                .from(doubtsTable)
                .where(eq(doubtsTable.id, reply.doubtId))
                .limit(1);

            if (doubt?.classroomId) {
                const [membership] = await db
                    .select()   
                    .from(membershipsTable)
                    .where(    
                        and(
                            eq(membershipsTable.userEmail, email),
                            eq(membershipsTable.classroomId, doubt.classroomId)
                        )
                    );
                isTeacher = !!(membership && canTeach(membership.role));
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

        const updateData: { content?: string | null; imageUrl?: string | null; originalCode?: string | null; correctedCode?: string | null; language?: string | null; } = {};
        if (content !== undefined) updateData.content = content;
        if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
        if (originalCode !== undefined) updateData.originalCode = originalCode;
        if (correctedCode !== undefined) updateData.correctedCode = correctedCode;
        if (language !== undefined) updateData.language = language;

        const updated = await db.update(repliesTable)
            .set(updateData)
            .where(eq(repliesTable.id, parsedReplyId))
            .returning();

        void auditLog({
            actorEmail: email,
            targetEmail: reply.userEmail,
            action: AUDIT_ACTIONS.REPLY_EDITED,
            resourceType: "reply",
            resourceId: parsedReplyId,
            metadata: {
                doubtId: reply.doubtId,
                changedFields: {
                    content: content !== undefined,
                    imageUrl: imageUrl !== undefined,
                },
            },
        });

        // Strip the author's real email before returning — identity must
        // stay server-side only (see src/lib/anonymity/anonymity.ts).
        const { userEmail: _, ...safeRow } = updated[0];
        return NextResponse.json(safeRow);
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
            const [doubt] = await db
                .select()
                .from(doubtsTable)
                .where(eq(doubtsTable.id, reply.doubtId))
                .limit(1);

            if (doubt?.classroomId) {
                const [membership] = await db
                    .select()
                    .from(membershipsTable)
                    .where(    
                        and(
                            eq(membershipsTable.userEmail, email),
                            eq(membershipsTable.classroomId, doubt.classroomId)
                        )
                    );
                isTeacher = !!(membership && canTeach(membership.role));
            }
        }

        const isOwner = email && reply.userEmail === email;
        if (!isOwner && !isTeacher) {
            return NextResponse.json({ error: "Forbidden: not allowed to delete this reply" }, { status: 403 });
        }

        // Delete the reply and, if it was pinned as a doubt's official solution,
        // clear that reference (and reset the doubt status) so doubts never hold
        // a dangling solvedReplyId pointing at a deleted row. Done atomically.
        await db.transaction(async (tx) => {
            await tx.delete(repliesTable).where(eq(repliesTable.id, replyId));

            if (reply.doubtId) {
                await tx.update(doubtsTable)
                    .set({
                        solvedReplyId: null,
                        isSolved: DOUBT_STATUS.UNSOLVED,
                    })
                    .where(
                        and(
                            eq(doubtsTable.id, reply.doubtId),
                            eq(doubtsTable.solvedReplyId, replyId)
                        )
                    );
            }
        });

        void auditLog({
            actorEmail: email,
            targetEmail: reply.userEmail,
            action: AUDIT_ACTIONS.REPLY_DELETED,
            resourceType: "reply",
            resourceId: replyId,
            metadata: {
                doubtId: reply.doubtId,
            },
        });

        return NextResponse.json({ message: "Reply deleted successfully" });
    } catch (error) {
        console.error("Error deleting reply:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
