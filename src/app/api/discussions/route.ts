import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

import { db } from "@/configs/db";
import { discussionThreadsTable, usersTable } from "@/configs/schema";
import { checkUserBlock } from "@/lib/auth/auth-utils";
import { buildErrorResponse, errorResponse } from "@/lib/errors/error-handler";
import { limitRequestBodySize } from "@/lib/validations/validate";

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

export async function GET() {
  try {
    const threads = await db
      .select()
      .from(discussionThreadsTable)
      .orderBy(desc(discussionThreadsTable.createdAt));

    return NextResponse.json({
      data: threads.map(toPublicThread),
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

    const { isBlocked, errorResponse: blockErrorResponse } = await checkUserBlock(email);
    if (isBlocked) return blockErrorResponse;

    const [dbUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!dbUser) {
      return errorResponse("User profile not found", 403);
    }

    const sizeError = await limitRequestBodySize(req);
    if (sizeError) return sizeError;

    const jsonBody = await req.json();
    const parsed = createThreadSchema.safeParse(jsonBody);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const { title, description, category, anonymous } = parsed.data;
    const authorName =
      user.fullName?.trim() ||
      user.firstName?.trim() ||
      dbUser.name ||
      "Student";

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
