import { db } from "@/configs/db";
import { repliesTable, doubtsTable, replyLikesTable, usersTable, membershipsTable } from "@/configs/schema";
import { eq, asc, and, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { moderateContent, handleModerationViolation } from "@/lib/moderation";
import { buildErrorResponse, errorResponse } from "@/lib/error-handler";
import { inngest } from "@/inngest/client";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { createReplySchema } from "@/lib/validations/reply";
import { DOUBT_STATUS } from "@/lib/doubtStatus";
import { createReplyNotification } from "@/lib/notifications/service";
import { canTeach } from "@/lib/auth/membership-guard";

export async function GET(req: Request) {
    try {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;
        const authenticatedUserId = user?.id;

        // 0. Check if user is blocked
        if (email) {
            const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
            if (dbUser?.blockedUntil && new Date(dbUser.blockedUntil) > new Date()) {
                const unlockDate = new Date(dbUser.blockedUntil).toDateString();
                return errorResponse(
                    `Your account is temporarily blocked due to safety violations. Access will be restored on ${unlockDate}.`,
                    403
                );
            }
        }

        const { searchParams } = new URL(req.url);
        const doubtIdStr = searchParams.get("doubtId");
        // Use stable authenticated id when available; fall back to client-supplied anonymous name
        const userIdentifier = authenticatedUserId || searchParams.get("userName");

        if (!doubtIdStr) {
            return errorResponse("Doubt ID required", 400);
        }
        const doubtId = parseInt(doubtIdStr);

        // Security: Verify doubt visibility
        const [doubt] = await db.select().from(doubtsTable).where(
            and(eq(doubtsTable.id, doubtId), isNull(doubtsTable.deletedAt))
        );
        if (!doubt) return errorResponse("Doubt not found", 404);

        if (doubt.classroomId && email) {
            const [membership] = await db.select().from(membershipsTable).where(
                and(eq(membershipsTable.userEmail, email), eq(membershipsTable.classroomId, doubt.classroomId))
            );
            if (!membership) {
                return errorResponse("Access denied to this classroom's doubt replies", 403);
            }
        } else if (doubt.classroomId && !email) {
            return errorResponse("Access denied to this classroom's doubt replies", 403);
        }

        if (doubt.type === 'teacher') {
            const [membership] = await db
            .select()
            .from(membershipsTable)
            .where(
                and(
                    eq(membershipsTable.userEmail, email as string),
                    eq(membershipsTable.classroomId, doubt.classroomId as number)
                )
            );

                const isTeacher = membership ? canTeach(membership.role) : false;
                const isOwner = doubt.userEmail === email;
            if (!isTeacher && !isOwner) {
                return errorResponse("Access denied", 403);
            }
        }

        const data = await db.select()
            .from(repliesTable)
            .where(eq(repliesTable.doubtId, doubtId))
            .orderBy(asc(repliesTable.createdAt));

        let repliesWithVotes = data;
        if (userIdentifier) {
            const userUpvotes = await db.select().from(replyLikesTable).where(eq(replyLikesTable.userName, userIdentifier));
            const upvotedReplyIds = new Set(userUpvotes.map((v: any) => v.replyId));
            repliesWithVotes = data.map((reply: any) => ({
                ...reply,
                hasUpvoted: upvotedReplyIds.has(reply.id),
            }));
        }

        return NextResponse.json(repliesWithVotes);
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}

export async function POST(req: Request) {
    try {
        const { errorResponse: validationResponse, data } = await parseAndValidateRequest(req, createReplySchema);
        if (validationResponse) return validationResponse;

        const { doubtId, userName, type, content, imageUrl } = data;

        const user = await currentUser();
        if (!user) return errorResponse("Unauthorized", 401);
        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) return errorResponse("Email required", 400);

        // 0. Check if user is blocked
        const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (dbUser?.blockedUntil && new Date(dbUser.blockedUntil) > new Date()) {
            const unlockDate = new Date(dbUser.blockedUntil).toDateString();
            return errorResponse(
                `Your account is temporarily blocked due to safety violations. Access will be restored on ${unlockDate}.`,
                403
            );
        }

        // 1. AI Moderation Check
        if (content) {
            const moderation = await moderateContent(content);
            const violationError = await handleModerationViolation(email, content, moderation);
            if (violationError) {
                return errorResponse(violationError, 400);
            }
        }

        // Security: Check if it's a teacher doubt and verify classroom membership
        const [doubt] = await db.select().from(doubtsTable).where(
            and(eq(doubtsTable.id, doubtId), isNull(doubtsTable.deletedAt))
        );
        
        if (!doubt) {
            return errorResponse("Doubt not found", 404);
        }

        if (doubt.classroomId) {
            const [membership] = await db.select().from(membershipsTable).where(
                and(eq(membershipsTable.userEmail, email), eq(membershipsTable.classroomId, doubt.classroomId))
            );
            if (!membership) {
                return errorResponse("Access denied to this classroom", 403);
            }
        }

        if (doubt.type === "teacher") {
            const [membership] = await db
            .select()
            .from(membershipsTable)
            .where(
                and(
                    eq(membershipsTable.userEmail, email),
                    eq(membershipsTable.classroomId, doubt.classroomId!)
                )
            );

            if (doubt.classroomId) {
                if (!membership || !canTeach(membership.role)) {
                    return errorResponse("Insufficient permissions to reply to this doubt", 403);
                }
            }
        }

        let parsedCreatedAt: Date | undefined = undefined;
        if (data.createdAt) {
            const d = new Date(data.createdAt);
            if (isNaN(d.getTime())) {
                return errorResponse("Invalid createdAt date format", 400);
            }
            const now = new Date();
            const age = now.getTime() - d.getTime();
            const maxOfflineDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
            if (age >= -300000 && age <= maxOfflineDuration) {
                parsedCreatedAt = d;
            }
        }

        const newReply = await db.insert(repliesTable).values({
            doubtId: doubtId,
            userName,
            userEmail: email,
            type,
            content: content || null,
            imageUrl: imageUrl || null,
            createdAt: parsedCreatedAt
        }).returning();

        createReplyNotification({
            doubtId,
            replyId: newReply[0].id,
            doubtOwnerEmail: doubt.userEmail || null,
            replierEmail: email,
            doubtTitle: doubt.subject || doubt.content || "your doubt",
            replierName: userName,
            replyContent: content || "",
            classroomId: doubt.classroomId || null,
            doubtType: doubt.type ?? 'community',
        }).catch((notificationErr) => {
            console.error("Failed to create reply notification:", notificationErr);
        });

        // Auto-transition: unsolved -> in-progress on first reply.
        // Design notes:
        //  - Any reply type qualifies (issue 183 says "when the first reply is posted").
        //  - We never downgrade `solved` -> `in-progress`; the WHERE guard (`isSolved = 'unsolved'`) makes this idempotent and race condition-safe when two replies land near-simultaneously.
        //  - AI-typed doubts are excluded because they follow a separate teacher-verification flow (see app/api/doubts/action/[id]/route.ts).
        //  - This update is best-effort; a failure here must not fail the reply creation, so we swallow errors and log.
        if (doubt && doubt.type !== "ai") {
            try {
                await db
                    .update(doubtsTable)
                    .set({ isSolved: DOUBT_STATUS.IN_PROGRESS })
                    .where(
                        and(
                            eq(doubtsTable.id, doubtId),
                            eq(doubtsTable.isSolved, DOUBT_STATUS.UNSOLVED)
                        )
                    );
            } catch (transitionErr) {
                console.error(
                    "Failed to auto-transition doubt to in-progress (safely caught):",
                    transitionErr
                );
            }
        }

        // Trigger background email notification via Inngest
        try {
            await inngest.send({
                name: "reply.created",
                data: {
                    doubtId: doubtId,
                    replyId: newReply[0].id,
                    replierName: userName,
                    replierEmail: email || "",
                    replyContent: content || ""
                }
            });
        } catch (inngestErr) {
            console.error("Failed to trigger Inngest event for reply (safely caught):", inngestErr);
        }

        // 🚀 ZERO-SETUP DEV FALLBACK:
        // If running in local development, run the email simulation logger synchronously 
        // to give immediate feedback on the console.
        if (process.env.NODE_ENV === "development") {
            try {
                const [d] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId)).limit(1);
                if (d && d.userEmail && d.userEmail !== email) {
                    const [u] = await db.select().from(usersTable).where(eq(usersTable.email, d.userEmail)).limit(1);
                    const notificationsEnabled = u ? u.emailNotificationsEnabled : true;
                    const preference = u ? u.notificationPreference : "instant";
                    
                    if (notificationsEnabled) {
                        if (preference === "instant") {
                            const { emailNotificationLimiter } = await import("@/lib/ratelimit");
                            const rateLimitKey = `email_notify:${doubtId}`;
                            const limitResult = await emailNotificationLimiter.limit(rateLimitKey);
                            
                            if (limitResult.success) {
                                const { sendReplyNotificationEmail } = await import("@/lib/email");
                                // Run non-blocking in background
                                sendReplyNotificationEmail({
                                    toEmail: d.userEmail,
                                    doubtId: d.id,
                                    doubtSubject: d.subject,
                                    doubtContent: d.content || "",
                                    replierName: userName,
                                    replyContent: content || ""
                                }).catch(err => console.error("Immediate dev mailer failed:", err));
                            } else {
                                console.log(`[RATE LIMIT EXCEEDED] Immediate dev notification skipped for doubt ${doubtId} to prevent spam.`);
                            }
                        } else if (preference === "daily" || preference === "weekly") {
                            // Queue pending notification in dev database directly for digest testing
                            const { pendingNotificationsTable } = await import("@/configs/schema");
                            await db.insert(pendingNotificationsTable).values({
                                userEmail: d.userEmail,
                                doubtId: d.id,
                                replyId: newReply[0].id,
                            }).catch(err => console.error("Dev fallback pending notification insert failed:", err));
                            console.log(`[DEV EMAIL] Queued reply notification for digest (${preference}) for user ${d.userEmail}`);
                        }
                    }
                }
            } catch (fallbackErr) {
                console.error("Zero-setup developer email fallback failed:", fallbackErr);
            }
        }

        return NextResponse.json(newReply[0]);
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
