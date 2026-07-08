import { db } from "@/configs/db";
import { doubtTagsTable, doubtsTable, likesTable, classroomsTable, repliesTable, tagsTable, membershipsTable } from "@/configs/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { moderateContent, handleModerationViolation } from "@/lib/moderation/moderation";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { updateDoubtActionSchema } from "@/lib/validations/doubt";
import { DOUBT_STATUS, DoubtStatus, isValidDoubtStatus } from "@/lib/doubts/doubtStatus";
import { auditLog, AUDIT_ACTIONS } from "@/lib/audit/audit";
import type { Tag } from "@/types";
import { canTeach } from "@/lib/auth/membership-guard";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { errorResponse, data } = await parseAndValidateRequest(req, updateDoubtActionSchema);
        if (errorResponse) return errorResponse;

        const { action, content, subject, imageUrl, replyId, tags = [], status } = data;

        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;
        
        const { id } = await params;
        const doubtId = parseInt(id);

        if (isNaN(doubtId)) {
            return NextResponse.json({ error: "Invalid doubt ID" }, { status: 400 });
        }

        const [doubt] = await db.select().from(doubtsTable).where(and(eq(doubtsTable.id, doubtId), isNull(doubtsTable.deletedAt))).limit(1);
        if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

        // Security: Verify doubt visibility/classroom membership
        if (doubt.classroomId && email) {
            const [membership] = await db.select().from(membershipsTable).where(
                and(eq(membershipsTable.userEmail, email), eq(membershipsTable.classroomId, doubt.classroomId))
            );
            if (!membership) {
                return NextResponse.json({ error: "Access denied to this classroom's doubt" }, { status: 403 });
            }
        } else if (doubt.classroomId && !email) {
            return NextResponse.json({ error: "Unauthorized access to classroom doubt" }, { status: 401 });
        }

        // Permission check for sensitive actions
        const isOwner = email && doubt.userEmail === email;
        let isTeacher = false;

        if (doubt.classroomId && email) {
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

        if (action === "like") {
            if (!email) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const secureUserIdentifier = email;

            const result = await db.transaction(async (tx: typeof db) => {

                const locked = await tx.execute(
                    sql`SELECT ${doubtsTable.id} FROM ${doubtsTable} WHERE ${doubtsTable.id} = ${doubtId} FOR UPDATE`
                );

                if (!locked.rows.length) {
                    return null;
                }

                const existingLike = await tx.select()
                    .from(likesTable)
                    .where(and(eq(likesTable.userEmail, secureUserIdentifier), eq(likesTable.doubtId, doubtId)))
                    .limit(1);

                if (existingLike.length > 0) {
                    await tx.delete(likesTable)
                        .where(and(eq(likesTable.userEmail, secureUserIdentifier), eq(likesTable.doubtId, doubtId)));

                    const updated = await tx.update(doubtsTable)
                        .set({ likes: sql`GREATEST(${doubtsTable.likes} - 1, 0)` })
                        .where(eq(doubtsTable.id, doubtId))
                        .returning();

                    return { ...updated[0], hasLiked: false };
                } else {
                    await tx.insert(likesTable).values({
                        userEmail: secureUserIdentifier,
                        doubtId
                    });

                    const updated = await tx.update(doubtsTable)
                        .set({ likes: sql`${doubtsTable.likes} + 1` })
                        .where(eq(doubtsTable.id, doubtId))
                        .returning();

                    return { ...updated[0], hasLiked: true };
                }
            });

            if (!result) {
                return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
            }

            return NextResponse.json(result);
        }

        if (action === "solve") {
            // Only owner or teacher can solve
            if (!isOwner && !isTeacher) {
                return NextResponse.json({ error: "Only the owner or teacher can mark as solved" }, { status: 403 });
            }

            // Special Rule: AI Doubts can ONLY be solved/unsolved by Teachers
            if (doubt.type === 'ai' && !isTeacher) {
                return NextResponse.json({ error: "Only a teacher can verify and mark AI-generated solutions as solved." }, { status: 403 });
            }

            // Resolve the target status.
            //
            //  - If the client passes an explicit `status` (e.g. a teacher
            //    setting `in-progress` from a dropdown), use it after validation.
            //  - Otherwise preserve the historical toggle behaviour:
            //      solved      -> unsolved   (un-marking a resolved doubt)
            //      anything    -> solved     (unsolved or in-progress => solved)
            //
            // `solvedReplyId` continues to be cleared whenever we leave the
            // `solved` state, so we don't keep stale references around.
            let newStatus: DoubtStatus;
            if (status !== undefined) {
                if (!isValidDoubtStatus(status)) {
                    return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
                }
                newStatus = status;
            } else {
                newStatus = doubt.isSolved === DOUBT_STATUS.SOLVED
                    ? DOUBT_STATUS.UNSOLVED
                    : DOUBT_STATUS.SOLVED;
            }
            let newSolvedReplyId: number | null = replyId || null;

            // Conditional Solving: Teacher can only mark as solved if at least 1 solution exists
            // (unless they are unsolving, or providing a replyId right now)
            if (isTeacher && !isOwner && newStatus === DOUBT_STATUS.SOLVED && !replyId) {
                const solutionReplies = await db.select()
                    .from(repliesTable)
                    .where(and(eq(repliesTable.doubtId, doubtId), eq(repliesTable.type, 'solution')))
                    .limit(1);
                
                if (solutionReplies.length === 0) {
                    return NextResponse.json({ 
                        error: "Teacher can only mark as solved if at least one official solution exists. Please post a solution first." 
                    }, { status: 400 });
                }
            }

            // If a replyId is provided, it is used to either toggle off a previously
            // pinned solution or pin a new one — this overrides the resolved status above.
            if (replyId && doubt.solvedReplyId === replyId) {
                newStatus = DOUBT_STATUS.UNSOLVED;
                newSolvedReplyId = null;
            } else if (replyId) {
                newStatus = DOUBT_STATUS.SOLVED;
                newSolvedReplyId = replyId;
            }

            // Defensive: only `solved` doubts should retain a solvedReplyId.
            if (newStatus !== DOUBT_STATUS.SOLVED) {
                newSolvedReplyId = null;
            }

            const updated = await db.update(doubtsTable)
                .set({ 
                    isSolved: newStatus,
                    solvedReplyId: newSolvedReplyId 
                })
                .where(eq(doubtsTable.id, doubtId))
                .returning();

            void auditLog({
                actorEmail: email || "unknown",
                targetEmail: doubt.userEmail,
                action: AUDIT_ACTIONS.DOUBT_SOLVED,
                resourceType: "doubt",
                resourceId: doubtId,
                metadata: {
                    previousStatus: doubt.isSolved,
                    newStatus,
                    replyId: newSolvedReplyId,
                    solvedReplyId: newSolvedReplyId,
                },
            });

            return NextResponse.json(updated[0]);
        }

        if (action === "edit") {
            // Only owner can edit
            if (!isOwner) {
                return NextResponse.json({ error: "Only the owner can edit their doubt" }, { status: 403 });
            }

            if (content) {
                const moderation = await moderateContent(content);
                const violationError = await handleModerationViolation(email!, content, moderation);
                if (violationError) {
                    return NextResponse.json({ error: violationError }, { status: 400 });
                }
            }

            const tagsExplicitlyProvided = data.tags !== undefined;

            const normalizedTags: string[] = Array.from(new Set(
                (Array.isArray(tags) ? tags : [])
                    .map((tag: string) => tag.trim().replace(/\s+/g, " ").toLowerCase())
                    .filter(Boolean)
            )).slice(0, 8);

            const tagScopePredicate = doubt.classroomId
                ? eq(tagsTable.classroomId, doubt.classroomId)
                : isNull(tagsTable.classroomId);

            const { updated, savedTags } = await db.transaction(async (tx) => {
                const [updatedRow] = await tx.update(doubtsTable)
                    .set({
                        content: content || null,
                        subject,
                        imageUrl: imageUrl || null
                    })
                    .where(eq(doubtsTable.id, doubtId))
                    .returning();

                if (!tagsExplicitlyProvided) {
                    const existingLinks = await tx
                        .select({ tag: tagsTable })
                        .from(doubtTagsTable)
                        .innerJoin(tagsTable, eq(tagsTable.id, doubtTagsTable.tagId))
                        .where(eq(doubtTagsTable.doubtId, doubtId));
                    return {
                        updated: updatedRow,
                        savedTags: existingLinks.map((row: any) => row.tag),
                    };
                }

                const resolvedTags: Tag[] = [];
                for (const normalizedName of normalizedTags) {
                    const [existingTag] = await tx.select().from(tagsTable).where(and(
                        eq(tagsTable.normalizedName, normalizedName),
                        tagScopePredicate
                    )).limit(1);

                    let tagRecord = existingTag;
                    if (!tagRecord) {
                        const [createdTag] = await tx.insert(tagsTable).values({
                            name: normalizedName.replace(/\b\w/g, (char) => char.toUpperCase()),
                            normalizedName,
                            classroomId: doubt.classroomId,
                            createdByEmail: email || null,
                        }).onConflictDoNothing().returning();

                        if (createdTag) {
                            tagRecord = createdTag;
                        } else {
                            const [raced] = await tx.select().from(tagsTable).where(and(
                                eq(tagsTable.normalizedName, normalizedName),
                                tagScopePredicate
                            )).limit(1);
                            tagRecord = raced;
                        }
                    }

                    if (tagRecord) {
                        resolvedTags.push(tagRecord);
                    }
                }

                await tx.delete(doubtTagsTable).where(eq(doubtTagsTable.doubtId, doubtId));

                for (const tag of resolvedTags) {
                    await tx.insert(doubtTagsTable).values({
                        doubtId,
                        tagId: tag.id,
                    });
                }

                return { updated: updatedRow, savedTags: resolvedTags };
            });

            void auditLog({
                actorEmail: email || "unknown",
                targetEmail: doubt.userEmail,
                action: AUDIT_ACTIONS.DOUBT_EDITED,
                resourceType: "doubt",
                resourceId: doubtId,
                metadata: {
                    subject: doubt.subject,
                    classroomId: doubt.classroomId,
                    changedFields: {
                        content: content !== undefined,
                        subject: subject !== undefined,
                        imageUrl: imageUrl !== undefined,
                    },
                },
            });

            return NextResponse.json({ ...updated, tags: savedTags });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Error updating doubt:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;
        
        const { id } = await params;
        const doubtId = parseInt(id);

        const [doubt] = await db.select().from(doubtsTable).where(and(eq(doubtsTable.id, doubtId), isNull(doubtsTable.deletedAt))).limit(1);
        if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

        const isOwner = email && doubt.userEmail === email;
        let isTeacher = false;

        if (doubt.classroomId && email) {
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

        // Only owner or teacher can delete
        if (!isOwner && !isTeacher) {
            return NextResponse.json({ error: "Unauthorized to delete this doubt" }, { status: 403 });
        }

        await db.update(doubtsTable).set({ deletedAt: new Date() }).where(eq(doubtsTable.id, doubtId));
        return NextResponse.json({ message: "Doubt deleted successfully" });
    } catch (error) {
        console.error("Error deleting doubt:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}