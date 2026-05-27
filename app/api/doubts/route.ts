import { db } from "@/configs/db";
import { bookmarksTable, doubtTagsTable, doubtsTable, likesTable, repliesTable, membershipsTable, classroomsTable, tagsTable } from "@/configs/schema";
import { categorizeDoubt } from "@/lib/ai/categorizer";
import { and, eq, inArray, isNull, or, not, sql, ilike, SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { moderateContent, handleModerationViolation } from "@/lib/moderation";
import { buildErrorResponse } from "@/lib/error-handler";
import { checkUserBlock } from "@/lib/auth-utils";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { createDoubtSchema } from "@/lib/validations/doubt";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const search = searchParams.get("search");
    const userName = searchParams.get("userName");
    const classroomIdStr = searchParams.get("classroomId");
    const classroomId = classroomIdStr ? parseInt(classroomIdStr) : null;
    const type = searchParams.get("type") || 'community';
    const tag = searchParams.get("tag");
    const sort = searchParams.get("sort") || "newest";

    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const email = user.primaryEmailAddress?.emailAddress;

        if (classroomId && email) {
            const [membership] = await db.select().from(membershipsTable).where(
                and(eq(membershipsTable.userEmail, email), eq(membershipsTable.classroomId, classroomId))
            );
            if (!membership) {
                return NextResponse.json({ error: "Access denied to this classroom" }, { status: 403 });
            }
        } else if (classroomId && !email) {
            // For hackathon simplicity, we might allow it if they have the link, 
            // but usually this should be blocked.
        }

        let query = db.select().from(doubtsTable);
        let conditions: SQL<unknown>[] = [];

        // Base Classroom scoping
        if (classroomId) {
            conditions.push(eq(doubtsTable.classroomId, classroomId));
        } else {
            conditions.push(isNull(doubtsTable.classroomId));
        }

        // Fetch classroom role info
        const [room] = classroomId
            ? await db.select().from(classroomsTable).where(eq(classroomsTable.id, classroomId))
            : [null];
        const isTeacher = room && email && room.teacherEmail === email;

        // GLOBAL VISIBILITY FILTER
        // If not the teacher, you can only see 'teacher' doubts if you are the owner
        if (!isTeacher && email) {
            conditions.push(or(not(eq(doubtsTable.type, 'teacher')), eq(doubtsTable.userEmail, email!))!);
        } else if (!isTeacher && !email) {
            // Extreme fallback: if no email, only show non-teacher doubts
            conditions.push(not(eq(doubtsTable.type, 'teacher')));
        }

        if (subject && subject !== "All") {
            conditions.push(eq(doubtsTable.subject, subject));
        }

        if (search) {
            conditions.push(
                or(
                    ilike(doubtsTable.content, `%${search}%`),
                    ilike(doubtsTable.subject, `%${search}%`),
                    ilike(doubtsTable.userName, `%${search}%`)
                )!
            );
        }

        if (type && type !== "All") {
            conditions.push(eq(doubtsTable.type, type));
            // Security/Privacy: AI history is personal
            if (type === 'ai' && email) {
                conditions.push(eq(doubtsTable.userEmail, email));
            }
        }

        const pageStr = searchParams.get("page");
        const offsetStr = searchParams.get("offset");
        const limitStr = searchParams.get("limit");
        const page = pageStr ? parseInt(pageStr) : 1;
        const limit = limitStr ? parseInt(limitStr) : 20;
        const offset = offsetStr ? parseInt(offsetStr) : (page - 1) * limit;

        let doubts: any[] = await query.where(and(...conditions));

        if (tag && tag !== "All" && doubts.length > 0) {
            const normalizedTag = tag.trim().replace(/\s+/g, " ").toLowerCase();
            const doubtIds = doubts.map((doubt) => doubt.id);
            const taggedDoubts = await db.select({ doubtId: doubtTagsTable.doubtId })
                .from(doubtTagsTable)
                .innerJoin(tagsTable, eq(doubtTagsTable.tagId, tagsTable.id))
                .where(and(
                    inArray(doubtTagsTable.doubtId, doubtIds),
                    eq(tagsTable.normalizedName, normalizedTag)
                ));

            const taggedDoubtIds = new Set(taggedDoubts.map((row) => row.doubtId));
            doubts = doubts.filter((doubt) => taggedDoubtIds.has(doubt.id));
        }

        if (sort === "unsolved") {
            doubts = doubts.filter((doubt) => doubt.isSolved === "unsolved");
        }

        const replyCounts = doubts.length > 0
            ? await db.select({
                doubtId: repliesTable.doubtId,
                count: sql<number>`count(*)`.mapWith(Number)
            })
            .from(repliesTable)
            .groupBy(repliesTable.doubtId)
            : [];

        const countsMap = Object.fromEntries(replyCounts.map(r => [r.doubtId, r.count]));

        doubts = doubts.map(doubt => ({
            ...doubt,
            replyCount: countsMap[doubt.id] || 0
        }));

        const createdAtValue = (value: unknown) => new Date(value as string).getTime() || 0;
        const pinnedScore = (value: unknown) => (value ? 1 : 0);

        doubts = (doubts as any[]).sort((a: any, b: any) => {
            const pinnedDiff = pinnedScore(b.isPinned) - pinnedScore(a.isPinned);
            if (pinnedDiff !== 0) return pinnedDiff;

            if (sort === "popular") {
                const likesDiff = (b.likes ?? 0) - (a.likes ?? 0);
                if (likesDiff !== 0) return likesDiff;
            } else if (sort === "most-replied") {
                const repliesDiff = (b.replyCount ?? 0) - (a.replyCount ?? 0);
                if (repliesDiff !== 0) return repliesDiff;
            }

            return createdAtValue(b.createdAt) - createdAtValue(a.createdAt);
        });

        doubts = (doubts as any[]).slice(offset, offset + limit);

        if (userName && doubts.length > 0) {
            const userLikes = await db.select({ doubtId: likesTable.doubtId })
                .from(likesTable)
                .where(eq(likesTable.userName, userName));

            const likedIds = new Set(userLikes.map(l => l.doubtId));

            doubts = doubts.map(doubt => ({
                ...doubt,
                hasLiked: likedIds.has(doubt.id)
            }));
        }

        if (email && doubts.length > 0) {
            const userBookmarks = await db.select({ doubtId: bookmarksTable.doubtId })
                .from(bookmarksTable)
                .where(eq(bookmarksTable.userEmail, email));

            const bookmarkedIds = new Set(userBookmarks.map(b => b.doubtId));

            doubts = doubts.map(doubt => ({
                ...doubt,
                hasBookmarked: bookmarkedIds.has(doubt.id)
            }));
        }

        if (doubts.length > 0) {
            const tagRows = await db.select({
                doubtId: doubtTagsTable.doubtId,
                id: tagsTable.id,
                name: tagsTable.name,
                normalizedName: tagsTable.normalizedName,
            })
            .from(doubtTagsTable)
            .innerJoin(tagsTable, eq(doubtTagsTable.tagId, tagsTable.id))
            .where(inArray(doubtTagsTable.doubtId, doubts.map((doubt) => doubt.id)));

            const tagsByDoubt = tagRows.reduce<Record<number, { id: number; name: string; normalizedName: string }[]>>((acc, row) => {
                acc[row.doubtId] = acc[row.doubtId] || [];
                acc[row.doubtId].push({ id: row.id, name: row.name, normalizedName: row.normalizedName });
                return acc;
            }, {});

            doubts = doubts.map((doubt) => ({
                ...doubt,
                tags: tagsByDoubt[doubt.id] || [],
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
        const parsedClassroomId = classroomId ? parseInt(classroomId.toString()) : null;

        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        const { isBlocked, errorResponse: blockResponse } = await checkUserBlock(email);
        if (isBlocked) return blockResponse;

        // Security: Check classroom membership before allowing post
        if (parsedClassroomId) {
            const [membership] = await db.select().from(membershipsTable).where(
                and(eq(membershipsTable.userEmail, email), eq(membershipsTable.classroomId, parsedClassroomId))
            );
            if (!membership) {
                return NextResponse.json({ error: "Access denied: You are not a member of this classroom" }, { status: 403 });
            }
        }
        // 1. AI Moderation Check
        if (content) {
            const moderation = await moderateContent(content);
            const violationError = await handleModerationViolation(email, content, moderation);
            if (violationError) {
                return NextResponse.json({ error: violationError }, { status: 400 });
            }
        }

        // 2. Auto-detect sub-topic using AI
        const subTopic = await categorizeDoubt(content || "", subject, imageUrl);

        const [newDoubt] = await db.insert(doubtsTable).values({
            userName,
            userEmail: email,
            subject,
            subTopic,
            content,
            imageUrl,
            classroomId: parsedClassroomId,
            type
        }).returning();

        const normalizedTags: string[] = Array.from(new Set(
            (Array.isArray(tags) ? tags : [])
                .map((tag: string) => tag.trim().replace(/\s+/g, " ").toLowerCase())
                .filter(Boolean)
        )).slice(0, 8);

        const savedTags: (typeof tagsTable.$inferSelect)[] = [];
        for (const normalizedName of normalizedTags) {
            const [existingTag] = await db.select().from(tagsTable).where(and(
                eq(tagsTable.normalizedName, normalizedName),
                parsedClassroomId ? eq(tagsTable.classroomId, parsedClassroomId) : isNull(tagsTable.classroomId)
            )).limit(1);

            const [tagRecord] = existingTag
                ? [existingTag]
                : await db.insert(tagsTable).values({
                    name: normalizedName.replace(/\b\w/g, (char) => char.toUpperCase()),
                    normalizedName,
                    classroomId: parsedClassroomId,
                    createdByEmail: email,
                }).returning();

            savedTags.push(tagRecord);
            await db.insert(doubtTagsTable).values({
                doubtId: newDoubt.id,
                tagId: tagRecord.id,
            }).onConflictDoNothing();
        }

        return NextResponse.json({ ...newDoubt, tags: savedTags });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
