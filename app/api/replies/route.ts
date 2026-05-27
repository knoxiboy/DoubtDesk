import { db } from "@/configs/db";
import { repliesTable, doubtsTable, classroomsTable, replyLikesTable, usersTable, membershipsTable, notificationsTable } from "@/configs/schema";
import { eq, asc, sql, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { moderateContent, handleModerationViolation } from "@/lib/moderation";
import { buildErrorResponse } from "@/lib/error-handler";
import { inngest } from "@/inngest/client";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { createReplySchema } from "@/lib/validations/reply";
import { DOUBT_STATUS } from "@/lib/doubtStatus";

export async function GET(req: Request) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const email = user.primaryEmailAddress?.emailAddress;
        const authenticatedUserId = user.id;
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        // 0. Check if user is blocked
        const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (dbUser?.blockedUntil && new Date(dbUser.blockedUntil) > new Date()) {
            const unlockDate = new Date(dbUser.blockedUntil).toDateString();
            const { status, body } = buildErrorResponse(
                new Error(`Your account is temporarily blocked due to safety violations. Access will be restored on ${unlockDate}.`)
            );
            return NextResponse.json(body, { status });
        }

        const { searchParams } = new URL(req.url);
        const doubtIdStr = searchParams.get("doubtId");
        // Use stable authenticated id when available; fall back to client-supplied anonymous name
        const userIdentifier = authenticatedUserId || searchParams.get("userName");

        if (!doubtIdStr) {
            return NextResponse.json({ error: "Doubt ID required" }, { status: 400 });
        }
        const doubtId = parseInt(doubtIdStr);

        // Security: Verify doubt visibility
        const [doubt] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId));
        if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

        if (doubt.classroomId && email) {
            const [membership] = await db.select().from(membershipsTable).where(
                and(eq(membershipsTable.userEmail, email), eq(membershipsTable.classroomId, doubt.classroomId))
            );
            if (!membership) {
                return NextResponse.json({ error: "Access denied to this classroom's doubt replies" }, { status: 403 });
            }
        } else if (doubt.classroomId && !email) {
            console.warn(`Anonymous user attempting to access replies for doubt ${doubtId} in classroom ${doubt.classroomId}`);
        }

        if (doubt.type === 'teacher') {
            const [room] = await db.select().from(classroomsTable).where(eq(classroomsTable.id, doubt.classroomId!));
            const isTeacher = room && email && room.teacherEmail === email;
            const isOwner = email && doubt.userEmail === email;
            if (!isTeacher && !isOwner) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
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
        const { errorResponse, data } = await parseAndValidateRequest(req, createReplySchema);
        if (errorResponse) return errorResponse;

        const { doubtId, userName, type, content, imageUrl } = data;

        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        // 0. Check if user is blocked
        const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (dbUser?.blockedUntil && new Date(dbUser.blockedUntil) > new Date()) {
            const unlockDate = new Date(dbUser.blockedUntil).toDateString();
            const { status, body } = buildErrorResponse(
                new Error(`Your account is temporarily blocked due to safety violations. Access will be restored on ${unlockDate}.`)
            );
            return NextResponse.json(body, { status });
        }

        // 1. AI Moderation Check
        if (content) {
            const moderation = await moderateContent(content);
            const violationError = await handleModerationViolation(email, content, moderation);
            if (violationError) {
                return NextResponse.json({ error: violationError }, { status: 400 });
            }
        }

        // Security: Check if it's a teacher doubt and verify classroom membership
        const [doubt] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId));
        
        if (!doubt) {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }

        if (doubt.classroomId) {
            const [membership] = await db.select().from(membershipsTable).where(
                and(eq(membershipsTable.userEmail, email), eq(membershipsTable.classroomId, doubt.classroomId))
            );
            if (!membership) {
                return NextResponse.json({ error: "Access denied to this classroom" }, { status: 403 });
            }
        }

        if (doubt.type === 'teacher') {
            const [room] = await db.select().from(classroomsTable).where(eq(classroomsTable.id, doubt.classroomId!));
            if (room && email && room.teacherEmail !== email) {
                return NextResponse.json({ error: "Only the teacher can reply to this doubt" }, { status: 403 });
            }
        }

        const newReply = await db.insert(repliesTable).values({
            doubtId: doubtId,
            userName,
            userEmail: email,
            type,
            content: content || null,
            imageUrl: imageUrl || null,
        }).returning();

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