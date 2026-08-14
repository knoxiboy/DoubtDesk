import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq, count } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

import { db } from "@/configs/db";
import { discussionThreadsTable, usersTable } from "@/configs/schema";
import { checkUserBlock } from "@/lib/auth/auth-utils";
import { moderateContent, handleModerationViolation } from "@/lib/moderation/moderation";
import { buildErrorResponse, errorResponse } from "@/lib/errors/error-handler";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { enforceApiRateLimit } from "@/lib/ratelimit/api-rate-limit";
import { generalLimiter } from "@/lib/ratelimit/ratelimit";
import { parsePositiveInt } from "@/lib/utils/utils";

const createThreadSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255),
  description: z.string().trim().max(5000).optional().default(""),
  category: z.string().trim().min(1).max(100).optional().default("General"),
  anonymous: z.boolean().optional().default(false),
});

function toPublicThread(thread: typeof discussionThreadsTable.$inferSelect) {
  return {
    id: thread.id,
    title: thread.title,
    description: thread.description,
    category: thread.category,
    author: thread.isAnonymous ? "Anonymous" : thread.authorName,
    replies: thread.replyCount,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitStr = searchParams.get("limit");
    const offsetStr = searchParams.get("offset");
    const pageStr = searchParams.get("page");
    const limit = parsePositiveInt(limitStr, 20, 100);
    const offset = offsetStr
      ? parsePositiveInt(offsetStr, 0)
      : pageStr
        ? (parsePositiveInt(pageStr, 1) - 1) * limit
        : 0;
    const page = Math.floor(offset / limit) + 1;

    const [totalCountRow] = await db
      .select({ count: count() })
      .from(discussionThreadsTable);
    const totalCount = totalCountRow?.count ?? 0;

    const threads = await db
      .select()
      .from(discussionThreadsTable)
      .orderBy(desc(discussionThreadsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const hasMore = offset + threads.length < totalCount;

    return NextResponse.json({
      data: threads.map(toPublicThread),
      hasMore,
      totalCount,
      page,
      limit,
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;

    if (!user || !email) {
      return errorResponse("Unauthorized", 401);
    }

    const { errorResponse: blockErrorResponse } = await checkUserBlock(email);
    if (blockErrorResponse) return blockErrorResponse;

    const rateLimitResponse = await enforceApiRateLimit(generalLimiter, email, "general");
    if (rateLimitResponse) return rateLimitResponse;

    const [dbUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!dbUser) {
      return errorResponse("User profile not found", 403);
    }

    const { errorResponse: validationResponse, data } = await parseAndValidateRequest(
      req,
      createThreadSchema,
    );
    if (validationResponse) return validationResponse;

    const { title, description, category, anonymous } = data;
    const authorName =
      user.fullName?.trim() ||
      user.firstName?.trim() ||
      dbUser.name ||
      "Student";

    const contentToModerate = [title, description].filter(Boolean).join("\n");
    if (contentToModerate) {
      const moderation = await moderateContent(contentToModerate);
      const violationError = await handleModerationViolation(email, contentToModerate, moderation);
      if (violationError) {
        return errorResponse(violationError, 400);
      }
    }

    const [created] = await db
      .insert(discussionThreadsTable)
      .values({
        title,
        description,
        category,
        authorEmail: email,
        authorName,
        isAnonymous: anonymous,
      })
      .returning();

    return NextResponse.json({ data: toPublicThread(created) }, { status: 201 });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
