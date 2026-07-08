import { db } from "@/configs/db";
import { repliesTable, doubtsTable, replyLikesTable, usersTable, membershipsTable } from "@/configs/schema";
import { eq, asc, and, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { moderateContent, handleModerationViolation } from "@/lib/moderation/moderation";
import { buildErrorResponse, errorResponse } from "@/lib/errors/error-handler";
import { inngest } from "@/inngest/client";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { createReplySchema } from "@/lib/validations/reply";
import { DOUBT_STATUS } from "@/lib/doubts/doubtStatus";
import { createReplyNotification } from "@/lib/notifications/service";
import { enforceApiRateLimit } from "@/lib/ratelimit/api-rate-limit";
import { generalLimiter } from "@/lib/ratelimit/ratelimit";
import { canTeach } from "@/lib/auth/membership-guard";
import { toPublicReply } from "@/lib/anonymity/anonymity";

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;

    if (email) {
      const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
      if (dbUser?.blockedUntil && new Date(dbUser.blockedUntil) > new Date()) {
        const unlockDate = new Date(dbUser.blockedUntil).toDateString();
        return errorResponse(
          `Your account is temporarily blocked due to safety violations. Access will be restored on ${unlockDate}.`,
          403,
        );
      }
    }

    const { searchParams } = new URL(req.url);
    const doubtIdStr = searchParams.get("doubtId");

    if (!doubtIdStr) {
      return errorResponse("Doubt ID required", 400);
    }
    const doubtId = parseInt(doubtIdStr);

    const [doubt] = await db.select().from(doubtsTable).where(
      and(eq(doubtsTable.id, doubtId), isNull(doubtsTable.deletedAt)),
    );
    if (!doubt) return errorResponse("Doubt not found", 404);

    if (doubt.classroomId && email) {
      const [membership] = await db.select().from(membershipsTable).where(
        and(
          eq(membershipsTable.userEmail, email),
          eq(membershipsTable.classroomId, doubt.classroomId),
        ),
      );
      if (!membership) {
        return errorResponse("Access denied to this classroom's doubt replies", 403);
      }
    } else if (doubt.classroomId && !email) {
      return errorResponse("Access denied to this classroom's doubt replies", 403);
    }

    if (doubt.type === "teacher") {
      let membership;
      if (email && doubt.classroomId) {
        const res = await db
          .select()
          .from(membershipsTable)
          .where(
            and(
              eq(membershipsTable.userEmail, email),
              eq(membershipsTable.classroomId, doubt.classroomId),
            ),
          );
        membership = res[0];
      }

      const isTeacher = membership ? canTeach(membership.role) : false;
      const isOwner = email ? doubt.userEmail === email : false;
      if (!isTeacher && !isOwner) {
        return errorResponse("Access denied", 403);
      }
    }

    const data = await db
      .select()
      .from(repliesTable)
      .where(eq(repliesTable.doubtId, doubtId))
      .orderBy(asc(repliesTable.createdAt));

    let repliesWithVotes = data;
    if (email) {
      const userUpvotes = await db
        .select()
        .from(replyLikesTable)
        .where(eq(replyLikesTable.userEmail, email));
      const upvotedReplyIds = new Set(userUpvotes.map((v: any) => v.replyId));
      repliesWithVotes = data.map((reply: any) => ({
        ...reply,
        hasUpvoted: upvotedReplyIds.has(reply.id),
      }));
    }

    // Strip the reply author's userEmail before returning; expose only the
    // anonymized handle and a session-derived `isOwnPost`. See src/lib/anonymity.ts.
    const publicReplies = repliesWithVotes.map((reply: any) => toPublicReply(reply, email));

    return NextResponse.json(publicReplies);
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return errorResponse("Unauthorized", 401);
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) return errorResponse("Email required", 400);

    const rateLimitResponse = await enforceApiRateLimit(generalLimiter, email, "general");
    if (rateLimitResponse) return rateLimitResponse;

    const { errorResponse: validationResponse, data } = await parseAndValidateRequest(
      req,
      createReplySchema,
    );
    if (validationResponse) return validationResponse;

    const { doubtId, type, content, imageUrl } = data;

    const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (dbUser?.blockedUntil && new Date(dbUser.blockedUntil) > new Date()) {
      const unlockDate = new Date(dbUser.blockedUntil).toDateString();
      return errorResponse(
        `Your account is temporarily blocked due to safety violations. Access will be restored on ${unlockDate}.`,
        403,
      );
    }

    if (content) {
      const moderation = await moderateContent(content);
      const violationError = await handleModerationViolation(email, content, moderation);
      if (violationError) {
        return errorResponse(violationError, 400);
      }
    }

    const [doubt] = await db.select().from(doubtsTable).where(
      and(eq(doubtsTable.id, doubtId), isNull(doubtsTable.deletedAt)),
    );

    if (!doubt) {
      return errorResponse("Doubt not found", 404);
    }

    if (doubt.classroomId) {
      const [membership] = await db.select().from(membershipsTable).where(
        and(
          eq(membershipsTable.userEmail, email),
          eq(membershipsTable.classroomId, doubt.classroomId),
        ),
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
            eq(membershipsTable.classroomId, doubt.classroomId!),
          ),
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
      const maxOfflineDuration = 30 * 24 * 60 * 60 * 1000;
      if (age >= -300000 && age <= maxOfflineDuration) {
        parsedCreatedAt = d;
      }
    }

    const newReply = await db
      .insert(repliesTable)
      .values({
        doubtId,
        userEmail: email,
        type,
        content: content || null,
        imageUrl: imageUrl || null,
        createdAt: parsedCreatedAt,
      })
      .returning();

    createReplyNotification({
      doubtId,
      replyId: newReply[0].id,
      doubtOwnerEmail: doubt.userEmail || null,
      replierEmail: email,
      doubtTitle: doubt.subject || doubt.content || "your doubt",
      replierName: user.fullName || email,
      replyContent: content || "",
      classroomId: doubt.classroomId || null,
      doubtType: doubt.type ?? "community",
    }).catch((notificationErr) => {
      console.error("Failed to create reply notification:", notificationErr);
    });

    if (doubt && doubt.type !== "ai") {
      try {
        await db
          .update(doubtsTable)
          .set({ isSolved: DOUBT_STATUS.IN_PROGRESS })
          .where(
            and(
              eq(doubtsTable.id, doubtId),
              eq(doubtsTable.isSolved, DOUBT_STATUS.UNSOLVED),
            ),
          );
      } catch (transitionErr) {
        console.error(
          "Failed to auto-transition doubt to in-progress (safely caught):",
          transitionErr,
        );
      }
    }

    try {
      await inngest.send({
        name: "reply.created",
        data: {
          doubtId,
          replyId: newReply[0].id,
          replierName: user.fullName || email,
          replierEmail: email || "",
          replyContent: content || "",
        },
      });
    } catch (inngestErr) {
      console.error("Failed to trigger Inngest event for reply (safely caught):", inngestErr);
    }

    if (process.env.NODE_ENV === "development") {
      try {
        const [d] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId)).limit(1);
        if (d && d.userEmail && d.userEmail !== email) {
          const [u] = await db.select().from(usersTable).where(eq(usersTable.email, d.userEmail)).limit(1);
          const notificationsEnabled = u ? u.emailNotificationsEnabled : true;
          const preference = u ? u.notificationPreference : "instant";

          if (notificationsEnabled) {
            if (preference === "instant") {
              console.log("[DEV EMAIL FALLBACK] Would send instant reply email to", d.userEmail);
            } else {
              console.log("[DEV EMAIL FALLBACK] Reply email deferred by preference for", d.userEmail);
            }
          }
        }
      } catch (devEmailErr) {
        console.error("Development email fallback error:", devEmailErr);
      }
    }

    return NextResponse.json(toPublicReply(newReply[0], email));
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
