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
import { and, eq, inArray, isNull, or, not, sql, SQL, ilike, desc, getTableColumns } from "drizzle-orm";
import { moderateContent, handleModerationViolation } from "@/lib/moderation";
import { buildErrorResponse } from "@/lib/error-handler";
import { checkUserBlock } from "@/lib/auth-utils";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { createDoubtSchema } from "@/lib/validations/doubt";
import { createClassroomDoubtNotifications } from "@/lib/notifications/service";
import { inngest } from "@/inngest/client"; 
import { canTeach } from "@/lib/auth/membership-guard";
import { currentUser } from "@clerk/nextjs/server";


export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const search = searchParams.get("search");
    const userName = searchParams.get("userName");
    const classroomIdStr = searchParams.get("classroomId");
    const type = searchParams.get("type") || "community";
    const tag = searchParams.get("tag");
    const sort = searchParams.get("sort") || "newest";
    const bookmarked = searchParams.get("bookmarked") === "true";

    try {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress ?? null;
        const classroomId = classroomIdStr ? parseInt(classroomIdStr) : null;

        if (classroomId) {
            if (!email) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }

        if ((type === "ai" || bookmarked) && !email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const conditions: SQL[] = [];

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
                        eq(membershipsTable.classroomId, classroomId)
                    )
                );

            if (!membership) {
                return NextResponse.json(
                    { error: "Access denied" },
                    { status: 403 }
                );
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
            const searchCondition = or(
                ilike(doubtsTable.content, `%${search}%`),
                ilike(doubtsTable.subject, `%${search}%`),
                ilike(doubtsTable.userName, `%${search}%`)
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
            const bookmarkedIds = userBookmarks.map((b) => b.doubtId);
            if (bookmarkedIds.length > 0) {
                conditions.push(inArray(doubtsTable.id, bookmarkedIds));
            } else {
                conditions.push(eq(doubtsTable.id, -1));
            }
        }

        const pageStr = searchParams.get("page");
        const offsetStr = searchParams.get("offset");
        const limitStr = searchParams.get("limit");
        const page = pageStr ? parseInt(pageStr, 10) : 1;
        const limit = limitStr ? parseInt(limitStr, 10) : 20;
        const offset = offsetStr ? parseInt(offsetStr, 10) : (page - 1) * limit;

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

        // Clean mapping chunk evaluation token to avoid standard database drivers cast bugs
        const replyCountSql = sql<number>`coalesce((SELECT count(*)::int FROM ${repliesTable} WHERE ${repliesTable.doubtId} = ${doubtsTable.id}), 0)`.mapWith(Number);

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

            const likedIds = new Set(userLikes.map((l) => l.doubtId));
            doubts = doubts.map((doubt) => ({
                ...doubt,
                hasLiked: likedIds.has(doubt.id)
            }));
        }

        if (doubts.length > 0 && email) {
            const userBookmarks = await db
                .select({ doubtId: bookmarksTable.doubtId })
                .from(bookmarksTable)
                .where(eq(bookmarksTable.userEmail, email));

            const bookmarkedIds = new Set(userBookmarks.map((b) => b.doubtId));
            doubts = doubts.map((doubt) => ({
                ...doubt,
                hasBookmarked: bookmarkedIds.has(doubt.id)
            }));
        }

        if (doubts.length > 0) {
            const tagRows = await db
                .select({
                    doubtId: doubtTagsTable.doubtId,
                    id: tagsTable.id,
                    name: tagsTable.name,
                    normalizedName: tagsTable.normalizedName
                })
                .from(doubtTagsTable)
                .innerJoin(tagsTable, eq(doubtTagsTable.tagId, tagsTable.id))
                .where(inArray(doubtTagsTable.doubtId, doubts.map((d) => d.id)));

            const tagsByDoubt = tagRows.reduce<Record<number, { id: number; name: string; normalizedName: string }[]>>((acc, row) => {
                acc[row.doubtId] = acc[row.doubtId] || [];
                acc[row.doubtId].push({ id: row.id, name: row.name, normalizedName: row.normalizedName });
                return acc;
            }, {});

            doubts = doubts.map((doubt) => ({
                ...doubt,
                tags: tagsByDoubt[doubt.id] || []
            }));
        }

        return NextResponse.json(doubts);
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}

export async function POST(req: Request) {
    try {
        const { errorResponse, data } = await parseAndValidateRequest(req, createDoubtSchema);
        if (errorResponse) return errorResponse;
        
        const { userName, subject, content, imageUrl, classroomId, type, tags } = data;
        const doubtType = type ?? "community";
        const parsedClassroomId = classroomId;
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;

        if (!email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { isBlocked, errorResponse: blockResponse } = await checkUserBlock(email);
        if (isBlocked) return blockResponse;

        if (parsedClassroomId) {
            const [membership] = await db
            .select()
            .from(membershipsTable)
            .where(
                and(
                    eq(membershipsTable.userEmail, email),
                    eq(membershipsTable.classroomId, parsedClassroomId)
                )
            );

            if (!membership) {
                return NextResponse.json(
                    { error: "Access denied" },
                    { status: 403 }
                );
            }
        }                                

        if (content) {
            const moderation = await moderateContent(content);
            const violationError = await handleModerationViolation(email, content, moderation);
            if (violationError) {
                return NextResponse.json({ error: violationError }, { status: 400 });
            }
        }

        const subTopic = await categorizeDoubt(content || "", subject, imageUrl);

        const [newDoubt] = await db
            .insert(doubtsTable)
            .values({
                userName,
                userEmail: email,
                subject,
                subTopic,
                content,
                imageUrl,
                classroomId: parsedClassroomId,
                type: doubtType
            })
            .returning();

        if (parsedClassroomId) {
            inngest.send({
                name: "doubt/created",
                data: { classroomId: parsedClassroomId, doubtId: newDoubt.id }
            }).catch((err) => console.error("Inngest background worker exception:", err));

            createClassroomDoubtNotifications({
                classroomId: parsedClassroomId,
                doubtId: newDoubt.id,
                subject,
                authorEmail: email,
                authorName: userName,
                doubtType: doubtType
            }).catch((err) => console.error("Notification trigger async failure:", err));
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
                        parsedClassroomId ? eq(tagsTable.classroomId, parsedClassroomId) : isNull(tagsTable.classroomId)
                    )
                );

            const existingTagsMap = new Map(existingClassroomTags.map((t) => [t.normalizedName, t]));
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

        return NextResponse.json({ ...newDoubt, tags: savedTags });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
