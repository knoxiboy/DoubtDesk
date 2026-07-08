import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import {
  bookmarksTable,
  doubtTagsTable,
  doubtsTable,
  likesTable,
  repliesTable,
  tagsTable,
  membershipsTable,
} from "@/configs/schema";
import { categorizeDoubt } from "@/lib/ai/categorizer";
import { safeGenerateEmbedding } from "@/lib/ai/embeddings";
import {
  and,
  eq,
  inArray,
  isNull,
  or,
  not,
  sql,
  SQL,
  ilike,
  desc,
  getTableColumns,
  count,
} from "drizzle-orm";
import { moderateContent, handleModerationViolation } from "@/lib/moderation/moderation";
import { buildErrorResponse, errorResponse } from "@/lib/errors/error-handler";
import { checkUserBlock } from "@/lib/auth/auth-utils";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { createDoubtSchema } from "@/lib/validations/doubt";
import { createClassroomDoubtNotifications } from "@/lib/notifications/service";
import { inngest } from "@/inngest/client";
import { enforceApiRateLimit } from "@/lib/ratelimit/api-rate-limit";
import { generalLimiter } from "@/lib/ratelimit/ratelimit";
import { buildRankOrder } from "@/lib/search/search";
import { canTeach } from "@/lib/auth/membership-guard";
import { currentUser } from "@clerk/nextjs/server";
import { parsePositiveInt } from "@/lib/utils/utils";
import { toPublicDoubt } from "@/lib/anonymity/anonymity";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const subject = searchParams.get("subject");
  const search = searchParams.get("search");
  const classroomIdStr = searchParams.get("classroomId");
  const type = searchParams.get("type") || "community";
  const tag = searchParams.get("tag");
  const sort = searchParams.get("sort") || "newest";
  const bookmarked = searchParams.get("bookmarked") === "true";

  try {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress ?? null;
    const classroomId = classroomIdStr ? parseInt(classroomIdStr) : null;

    if (classroomId && !email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((type === "ai" || bookmarked) && !email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conditions: SQL[] = [isNull(doubtsTable.deletedAt)];

    if (classroomId) {
      conditions.push(eq(doubtsTable.classroomId, classroomId));
    } else {
      conditions.push(isNull(doubtsTable.classroomId));
    }

    let isTeacher = false;

    if (classroomId && email) {
      const [membership] = await db
        .select()
        .from(membershipsTable)
        .where(
          and(
            eq(membershipsTable.userEmail, email),
            eq(membershipsTable.classroomId, classroomId),
          ),
        );

      if (!membership) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      isTeacher = canTeach(membership.role);
    }

    if (!isTeacher) {
      const teacherCondition = email
        ? or(not(eq(doubtsTable.type, "teacher")), eq(doubtsTable.userEmail, email))
        : not(eq(doubtsTable.type, "teacher"));
      if (teacherCondition) conditions.push(teacherCondition);
    }

    if (subject && subject !== "All") {
      conditions.push(eq(doubtsTable.subject, subject));
    }

    if (search) {
      // NOTE: we deliberately do NOT match on userEmail. Matching the author's
      // email here would let a caller probe email fragments and infer which
      // anonymized posts belong to a given author from result presence/counts.
      const searchCondition = or(
        ilike(doubtsTable.content, `%${search}%`),
        ilike(doubtsTable.subject, `%${search}%`),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    if (type && type !== "All") {
      conditions.push(eq(doubtsTable.type, type));
      if (type === "ai" && email) {
        conditions.push(eq(doubtsTable.userEmail, email));
      }
    }

    if (bookmarked && email) {
      const userBookmarks = await db
        .select({ doubtId: bookmarksTable.doubtId })
        .from(bookmarksTable)
        .where(eq(bookmarksTable.userEmail, email));
      const bookmarkedIds = userBookmarks.map((b: any) => b.doubtId);
      if (bookmarkedIds.length > 0) {
        conditions.push(inArray(doubtsTable.id, bookmarkedIds));
      } else {
        conditions.push(eq(doubtsTable.id, -1));
      }
    }

    const pageStr = searchParams.get("page");
    const offsetStr = searchParams.get("offset");
    const limitStr = searchParams.get("limit");
    const limit = parsePositiveInt(limitStr, 20);
    const offset = offsetStr
      ? parsePositiveInt(offsetStr, 0)
      : pageStr
        ? (parsePositiveInt(pageStr, 1) - 1) * limit
        : 0;
    const page = Math.floor(offset / limit) + 1;

    if (tag && tag !== "All") {
      const normalizedTag = tag.trim().replace(/\s+/g, " ").toLowerCase();
      conditions.push(
        inArray(
          doubtsTable.id,
          db
            .select({ doubtId: doubtTagsTable.doubtId })
            .from(doubtTagsTable)
            .innerJoin(tagsTable, eq(doubtTagsTable.tagId, tagsTable.id))
            .where(eq(tagsTable.normalizedName, normalizedTag)),
        ),
      );
    }

    if (sort === "unsolved") {
      conditions.push(eq(doubtsTable.isSolved, "unsolved"));
    }

    const [totalCountRow] = await db
      .select({ count: count() })
      .from(doubtsTable)
      .where(and(...conditions));
    const totalCount = totalCountRow?.count ?? 0;

    const query = db
      .select({
        ...getTableColumns(doubtsTable),
      })
      .from(doubtsTable);

    const orderByFields: SQL[] = [desc(doubtsTable.isPinned)];

    if (search) {
      const rankOrder = buildRankOrder(search);
      if (rankOrder) orderByFields.push(rankOrder);
    }

    if (sort === "popular") {
      orderByFields.push(desc(doubtsTable.likes));
    } else if (sort === "most-replied") {
      // Needed here only to sort correctly at the DB level before paging.
      // Not selected as a column, so it costs nothing for any other sort mode.
      const replyCountOrderSql = sql`coalesce((SELECT count(*) FROM ${repliesTable} WHERE ${repliesTable.doubtId} = ${doubtsTable.id}), 0)`;
      orderByFields.push(desc(replyCountOrderSql));
    }
    orderByFields.push(desc(doubtsTable.createdAt));

    let doubts = await query
      .where(and(...conditions))
      .orderBy(...orderByFields)
      .limit(limit)
      .offset(offset);

    // Batch-fetch reply counts for just the returned page (max `limit` ids)
    // instead of running a correlated subquery per row in the SELECT.
    if (doubts.length > 0) {
      const replyCountRows = await db
        .select({ doubtId: repliesTable.doubtId, count: count() })
        .from(repliesTable)
        .where(inArray(repliesTable.doubtId, doubts.map((d: any) => d.id)))
        .groupBy(repliesTable.doubtId);

      const replyCountMap = new Map(
        replyCountRows.map((r: any) => [r.doubtId, Number(r.count)]),
      );

      doubts = doubts.map((doubt: any) => ({
        ...doubt,
        replyCount: replyCountMap.get(doubt.id) ?? 0,
      }));
    }

    if (email && doubts.length > 0) {
      const userLikes = await db
        .select({ doubtId: likesTable.doubtId })
        .from(likesTable)
        .where(eq(likesTable.userEmail, email));

      const likedIds = new Set(userLikes.map((l: any) => l.doubtId));
      doubts = doubts.map((doubt: any) => ({
        ...doubt,
        hasLiked: likedIds.has(doubt.id),
      }));
    }

    if (doubts.length > 0 && email) {
      const userBookmarks = await db
        .select({ doubtId: bookmarksTable.doubtId })
        .from(bookmarksTable)
        .where(eq(bookmarksTable.userEmail, email));

      const bookmarkedIds = new Set(userBookmarks.map((b: any) => b.doubtId));
      doubts = doubts.map((doubt: any) => ({
        ...doubt,
        hasBookmarked: bookmarkedIds.has(doubt.id),
      }));
    }

    if (doubts.length > 0) {
      const tagRows = await db
        .select({
          doubtId: doubtTagsTable.doubtId,
          id: tagsTable.id,
          name: tagsTable.name,
          normalizedName: tagsTable.normalizedName,
        })
        .from(doubtTagsTable)
        .innerJoin(tagsTable, eq(doubtTagsTable.tagId, tagsTable.id))
        .where(inArray(doubtTagsTable.doubtId, doubts.map((d: any) => d.id)));

      const tagsByDoubt = tagRows.reduce<
        Record<number, { id: number; name: string; normalizedName: string }[]>
      >((acc, row) => {
        acc[row.doubtId] = acc[row.doubtId] || [];
        acc[row.doubtId].push({
          id: row.id,
          name: row.name,
          normalizedName: row.normalizedName,
        });
        return acc;
      }, {});

      doubts = doubts.map((doubt: any) => ({
        ...doubt,
        tags: tagsByDoubt[doubt.id] || [],
      }));
    }

    const hasMore = offset + doubts.length < totalCount;

    // Strip author identifiers (userEmail), the internal embedding vector and
    // soft-delete marker before returning. Only the anonymized handle and a
    // session-derived `isOwnPost` flag are exposed. See src/lib/anonymity.ts.
    const publicDoubts = doubts.map((doubt: any) => toPublicDoubt(doubt, email));

    return NextResponse.json({
      doubts: publicDoubts,
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

    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await enforceApiRateLimit(generalLimiter, email, "general");
    if (rateLimitResponse) return rateLimitResponse;

    const { errorResponse: validationResponse, data } = await parseAndValidateRequest(
      req,
      createDoubtSchema,
    );
    if (validationResponse) return validationResponse;

    const { subject, content, imageUrl, classroomId, type, tags } = data;
    const doubtType = type ?? "community";
    const parsedClassroomId = classroomId ?? null;

    const { isBlocked, errorResponse: blockResponse } = await checkUserBlock(email);
    if (isBlocked) return blockResponse;

    if (parsedClassroomId) {
      const [membership] = await db
        .select()
        .from(membershipsTable)
        .where(
          and(
            eq(membershipsTable.userEmail, email),
            eq(membershipsTable.classroomId, parsedClassroomId),
          ),
        );

      if (!membership) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    if (content) {
      const moderation = await moderateContent(content);
      const violationError = await handleModerationViolation(email, content, moderation);
      if (violationError) {
        return errorResponse(violationError, 400);
      }
    }

    const subTopic = await categorizeDoubt(content || "", subject, imageUrl);

    let parsedCreatedAt: Date | undefined = undefined;
    if (data.createdAt) {
      const d = new Date(data.createdAt);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid createdAt date format" }, { status: 400 });
      }
      const now = new Date();
      const age = now.getTime() - d.getTime();
      const maxOfflineDuration = 30 * 24 * 60 * 60 * 1000;
      if (age >= -300000 && age <= maxOfflineDuration) {
        parsedCreatedAt = d;
      }
    }

    const [newDoubt] = await db
      .insert(doubtsTable)
      .values({
        userEmail: email,
        subject,
        subTopic,
        content,
        imageUrl,
        classroomId: parsedClassroomId,
        type: doubtType,
        createdAt: parsedCreatedAt,
      })
      .returning();

    try {
      const embeddingInput = `${subject}\n${content || ""}`.trim();
      const embedding = await safeGenerateEmbedding(embeddingInput);
      if (embedding && Array.isArray(embedding) && embedding.length > 0) {
        await db
          .update(doubtsTable)
          .set({ embedding: embedding as any })
          .where(eq(doubtsTable.id, newDoubt.id));
      }
    } catch (err) {
      console.error("Failed to generate/store doubt embedding:", err);
    }

    if (parsedClassroomId) {
      inngest
        .send({
          name: "doubt/created",
          data: { classroomId: parsedClassroomId, doubtId: newDoubt.id },
        })
        .catch((err) => console.error("Inngest background worker exception:", err));

      createClassroomDoubtNotifications({
        classroomId: parsedClassroomId,
        doubtId: newDoubt.id,
        subject,
        authorEmail: email,
        authorName: user.fullName || email,
        doubtType,
      }).catch((err) => console.error("Notification trigger async failure:", err));
    }

    const normalizedTags: string[] = Array.from(
      new Set(
        (Array.isArray(tags) ? tags : [])
          .map((t: unknown) =>
            typeof t === "string" ? t.trim().replace(/\s+/g, " ").toLowerCase() : "",
          )
          .filter(Boolean),
      ),
    ).slice(0, 8);

    const savedTags: (typeof tagsTable.$inferSelect)[] = [];

    if (normalizedTags.length > 0) {
      const existingClassroomTags = await db
        .select()
        .from(tagsTable)
        .where(
          and(
            inArray(tagsTable.normalizedName, normalizedTags),
            parsedClassroomId
              ? eq(tagsTable.classroomId, parsedClassroomId)
              : isNull(tagsTable.classroomId),
          ),
        );

      const existingTagsMap = new Map(existingClassroomTags.map((t: any) => [t.normalizedName, t]));
      const tagsToInsert: (typeof tagsTable.$inferInsert)[] = [];

      for (const name of normalizedTags) {
        const match = existingTagsMap.get(name);
        if (match) {
          savedTags.push(match);
        } else {
          tagsToInsert.push({
            name: name.replace(/\b\w/g, (char) => char.toUpperCase()),
            normalizedName: name,
            classroomId: parsedClassroomId,
            createdByEmail: email,
          });
        }
      }

      if (tagsToInsert.length > 0) {
        const insertedRows = await db.insert(tagsTable).values(tagsToInsert).returning();
        savedTags.push(...insertedRows);
      }

      if (savedTags.length > 0) {
        const doubtTagRelations = savedTags.map((t: typeof tagsTable.$inferSelect) => ({
          doubtId: newDoubt.id,
          tagId: t.id,
        }));
        await db.insert(doubtTagsTable).values(doubtTagRelations).onConflictDoNothing();
      }
    }

    // The creator is the author, so `isOwnPost` resolves to true. We still strip
    // the raw userEmail/embedding so the create response matches the read shape.
    return NextResponse.json(toPublicDoubt({ ...newDoubt, tags: savedTags }, email));
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
