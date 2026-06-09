import { ServiceError } from "@/lib/errors";
import { 
    bookmarksTable, 
    doubtTagsTable, 
    doubtsTable, 
    likesTable, 
    repliesTable, 
    membershipsTable, 
    classroomsTable, 
    tagsTable 
} from "@/configs/schema";
import { and, eq, inArray, isNull, or, not, sql, SQL, ilike, desc, getTableColumns } from "drizzle-orm";

export interface GetDoubtsParams {
    email: string | null;
    subject?: string | null;
    search?: string | null;
    userName?: string | null;
    classroomId?: number | null;
    type?: string | null;
    tag?: string | null;
    sort?: string | null;
    bookmarked?: boolean;
    page?: number;
    limit?: number;
}

export async function getDoubts(db: any, params: GetDoubtsParams) {
    const {
        email,
        subject,
        search,
        userName,
        classroomId,
        type = "community",
        tag,
        sort = "newest",
        bookmarked = false,
        page = 1,
        limit = 20
    } = params;

    const offset = (page - 1) * limit;

    let isTeacher = false;
    
    if (classroomId) {
        const [membership] = await db
            .select()
            .from(membershipsTable)
            .where(and(eq(membershipsTable.userEmail, email as string), eq(membershipsTable.classroomId, classroomId)));
        if (!membership) {
            throw new ServiceError(403, "Access denied");
        }
        isTeacher = membership.role === 'teacher' || membership.role === 'admin'; // Equivalent to canTeach
    }

    const conditions: SQL[] = [isNull(doubtsTable.deletedAt)];

    if (classroomId) {
        conditions.push(eq(doubtsTable.classroomId, classroomId));
    } else {
        conditions.push(isNull(doubtsTable.classroomId));
    }

    if (!isTeacher) {
        const teacherCondition = email 
            ? or(not(eq(doubtsTable.type, "teacher")), eq(doubtsTable.userEmail, email as string))
            : not(eq(doubtsTable.type, "teacher"));
        if (teacherCondition) conditions.push(teacherCondition);
    }

    if (subject && subject !== "All") {
        conditions.push(eq(doubtsTable.subject, subject));
    }

    if (search) {
        const searchCondition = or(
            ilike(doubtsTable.content, `%${search}%`),
            ilike(doubtsTable.subject, `%${search}%`),
            ilike(doubtsTable.userName, `%${search}%`)
        );
        if (searchCondition) conditions.push(searchCondition);
    }

    if (type && type !== "All") {
        conditions.push(eq(doubtsTable.type, type));
        if (type === "ai") {
            conditions.push(eq(doubtsTable.userEmail, email as string));
        }
    }

    if (bookmarked) {
        const userBookmarks = await db
            .select({ doubtId: bookmarksTable.doubtId })
            .from(bookmarksTable)
            .where(eq(bookmarksTable.userEmail, email as string));
        const bookmarkedIds = userBookmarks.map((b: any) => b.doubtId);
        if (bookmarkedIds.length > 0) {
            conditions.push(inArray(doubtsTable.id, bookmarkedIds));
        } else {
            conditions.push(eq(doubtsTable.id, -1));
        }
    }

    if (tag && tag !== "All") {
        const normalizedTag = tag.trim().replace(/\s+/g, " ").toLowerCase();
        conditions.push(
            inArray(
                doubtsTable.id,
                db
                    .select({ doubtId: doubtTagsTable.doubtId })
                    .from(doubtTagsTable)
                    .innerJoin(tagsTable, eq(doubtTagsTable.tagId, tagsTable.id))
                    .where(eq(tagsTable.normalizedName, normalizedTag))
            )
        );
    }

    if (sort === "unsolved") {
        conditions.push(eq(doubtsTable.isSolved, "unsolved"));
    }

    const replyCountSql = sql<number>`coalesce((SELECT count(*)::int FROM ${repliesTable} WHERE ${repliesTable.doubtId} = ${doubtsTable.id}), 0)`.mapWith(Number);

    const [totalCountRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(doubtsTable)
        .where(and(...conditions));
    const totalCount = totalCountRow?.count ?? 0;

    const query = db
        .select({
            ...getTableColumns(doubtsTable),
            replyCount: replyCountSql
        })
        .from(doubtsTable);

    const orderByFields: SQL[] = [desc(doubtsTable.isPinned)];

    if (sort === "popular") {
        orderByFields.push(desc(doubtsTable.likes));
    } else if (sort === "most-replied") {
        orderByFields.push(desc(replyCountSql));
    }
    orderByFields.push(desc(doubtsTable.createdAt));

    let doubts = await query
        .where(and(...conditions))
        .orderBy(...orderByFields)
        .limit(limit)
        .offset(offset);

    if (userName && doubts.length > 0) {
        const userLikes = await db
            .select({ doubtId: likesTable.doubtId })
            .from(likesTable)
            .where(eq(likesTable.userName, userName));

        const likedIds = new Set(userLikes.map((l: any) => l.doubtId));
        doubts = doubts.map((doubt: any) => ({
            ...doubt,
            hasLiked: likedIds.has(doubt.id)
        }));
    }

    if (doubts.length > 0) {
        const userBookmarks = await db
            .select({ doubtId: bookmarksTable.doubtId })
            .from(bookmarksTable)
            .where(eq(bookmarksTable.userEmail, email as string));

        const bookmarkedIds = new Set(userBookmarks.map((b: any) => b.doubtId));
        doubts = doubts.map((doubt: any) => ({
            ...doubt,
            hasBookmarked: bookmarkedIds.has(doubt.id)
        }));

        const tagRows = await db
            .select({
                doubtId: doubtTagsTable.doubtId,
                id: tagsTable.id,
                name: tagsTable.name,
                normalizedName: tagsTable.normalizedName
            })
            .from(doubtTagsTable)
            .innerJoin(tagsTable, eq(doubtTagsTable.tagId, tagsTable.id))
            .where(inArray(doubtTagsTable.doubtId, doubts.map((d: any) => d.id)));

        const tagsByDoubt = tagRows.reduce((acc: any, row: any) => {
            acc[row.doubtId] = acc[row.doubtId] || [];
            acc[row.doubtId].push({ id: row.id, name: row.name, normalizedName: row.normalizedName });
            return acc;
        }, {});

        doubts = doubts.map((doubt: any) => ({
            ...doubt,
            tags: tagsByDoubt[doubt.id] || []
        }));
    }

    const hasMore = offset + doubts.length < totalCount;

    return { doubts, totalCount, hasMore, page, limit };
}

import { categorizeDoubt } from "@/lib/ai/categorizer";
import { moderateContent, handleModerationViolation } from "@/lib/moderation";
import { checkUserBlock } from "@/lib/auth-utils";
import { createClassroomDoubtNotifications } from "@/lib/notifications/service";
import { inngest } from "@/inngest/client";

export interface CreateDoubtParams {
    email: string;
    userName: string;
    subject: string;
    content?: string | null;
    imageUrl?: string | null;
    classroomId?: number | null;
    type?: string;
    tags?: string[];
    createdAt?: Date;
}

export async function createDoubt(db: any, params: CreateDoubtParams) {
    const { email, userName, subject, content, imageUrl, classroomId, type, tags, createdAt } = params;
    const doubtType = type ?? "community";

    const { isBlocked, errorResponse: blockResponse } = await checkUserBlock(email);
    if (isBlocked) {
        // We throw ServiceError mapped from blockResponse in a real app, 
        // but for now let's just throw a basic one, or return the response?
        // Wait, checkUserBlock returns a Next.js NextResponse inside errorResponse.
        // It's better to throw ServiceError.
        throw new ServiceError(403, "User is blocked");
    }

    if (classroomId) {
        const [membership] = await db
            .select()
            .from(membershipsTable)
            .where(and(eq(membershipsTable.userEmail, email as string), eq(membershipsTable.classroomId, classroomId)));
        if (!membership) {
            throw new ServiceError(403, "Access denied: You are not a member of this classroom");
        }
    }
    
    if (content) {
        const moderation = await moderateContent(content);
        const violationError = await handleModerationViolation(email, content, moderation);
        if (violationError) {
            throw new ServiceError(400, violationError);
        }
    }

    const subTopic = await categorizeDoubt(content || "", subject, imageUrl || undefined);

    const [newDoubt] = await db
        .insert(doubtsTable)
        .values({
            userName,
            userEmail: email,
            subject,
            subTopic,
            content,
            imageUrl,
            classroomId: classroomId,
            type: doubtType,
            createdAt
        })
        .returning();

    if (classroomId) {
        inngest.send({
            name: "doubt/created",
            data: { classroomId: classroomId, doubtId: newDoubt.id }
        }).catch((err: any) => console.error("Inngest background worker exception:", err));

        createClassroomDoubtNotifications({
            classroomId: classroomId,
            doubtId: newDoubt.id,
            subject,
            authorEmail: email,
            authorName: userName,
            doubtType: doubtType
        }).catch((err: any) => console.error("Notification trigger async failure:", err));
    }

    const normalizedTags: string[] = Array.from(
        new Set(
            (Array.isArray(tags) ? tags : [])
                .map((t: unknown) => typeof t === "string" ? t.trim().replace(/\s+/g, " ").toLowerCase() : "")
                .filter(Boolean)
        )
    ).slice(0, 8);

    const savedTags: (typeof tagsTable.$inferSelect)[] = [];

    if (normalizedTags.length > 0) {
        const existingClassroomTags = await db
            .select()
            .from(tagsTable)
            .where(
                and(
                    inArray(tagsTable.normalizedName, normalizedTags),
                    classroomId ? eq(tagsTable.classroomId, classroomId) : isNull(tagsTable.classroomId)
                )
            );

        const existingTagsMap = new Map<string, typeof tagsTable.$inferSelect>(existingClassroomTags.map((t: any) => [t.normalizedName, t]));
        const tagsToInsert: (typeof tagsTable.$inferInsert)[] = [];

        for (const name of normalizedTags) {
            const match = existingTagsMap.get(name);
            if (match) {
                savedTags.push(match);
            } else {
                tagsToInsert.push({
                    name: name.replace(/\b\w/g, (char) => char.toUpperCase()),
                    normalizedName: name,
                    classroomId: classroomId,
                    createdByEmail: email
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
                tagId: t.id
            }));
            await db.insert(doubtTagsTable).values(doubtTagRelations).onConflictDoNothing();
        }
    }

    return { ...newDoubt, tags: savedTags };
}


