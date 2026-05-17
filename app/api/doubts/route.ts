import { db } from "@/configs/db";
import { bookmarksTable, doubtTagsTable, doubtsTable, likesTable, repliesTable, membershipsTable, classroomsTable, tagsTable, usersTable } from "@/configs/schema";
import { categorizeDoubt } from "@/lib/ai/categorizer";
import { and, eq, desc, inArray, isNull, or, not, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { moderateContent, handleModerationViolation } from "@/lib/moderation";
import { buildErrorResponse } from "@/lib/error-handler";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const userName = searchParams.get("userName");
    const classroomIdStr = searchParams.get("classroomId");
    const classroomId = classroomIdStr ? parseInt(classroomIdStr) : null;
    const type = searchParams.get("type") || 'community';
    const tag = searchParams.get("tag");
    const isSolved = searchParams.get("isSolved");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const email = user.primaryEmailAddress?.emailAddress;

        const { searchParams } = new URL(req.url);
        const subject = searchParams.get("subject");
        const userName = searchParams.get("userName");
        const classroomIdStr = searchParams.get("classroomId");
        const classroomId = classroomIdStr ? parseInt(classroomIdStr) : null;
        const type = searchParams.get("type") || 'community';

        // Security: If classroomId is provided, check membership
        if (classroomId && email) {
            const [membership] = await db.select().from(membershipsTable).where(
                and(eq(membershipsTable.userEmail, email), eq(membershipsTable.classroomId, classroomId))
            );
            if (!membership) {
                return NextResponse.json({ error: "Access denied to this classroom" }, { status: 403 });
            }
        }

        let conditions = [];

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
        if (!isTeacher && email) {
            conditions.push(or(not(eq(doubtsTable.type, 'teacher')), eq(doubtsTable.userEmail, email)));
        } else if (!isTeacher && !email) {
            conditions.push(not(eq(doubtsTable.type, 'teacher')));
        }

        if (subject && subject !== "All") {
            conditions.push(eq(doubtsTable.subject, subject));
        }

        if (type && type !== "All") {
            conditions.push(eq(doubtsTable.type, type));
            if (type === 'ai' && email) {
                conditions.push(eq(doubtsTable.userEmail, email));
            }
        }

        if (isSolved && isSolved !== "All") {
            const status = isSolved === 'pending' ? 'unsolved' : 'solved';
            conditions.push(eq(doubtsTable.isSolved, status));
        }

        // TAG FILTERING
        if (tag && tag !== "All") {
            const normalizedTag = tag.trim().replace(/\s+/g, " ").toLowerCase();
            const taggedDoubts = await db.select({ doubtId: doubtTagsTable.doubtId })
                .from(doubtTagsTable)
                .innerJoin(tagsTable, eq(doubtTagsTable.tagId, tagsTable.id))
                .where(and(
                    eq(tagsTable.normalizedName, normalizedTag),
                    classroomId ? eq(tagsTable.classroomId, classroomId) : isNull(tagsTable.classroomId)
                ));
            
            const taggedDoubtIds = taggedDoubts.map(row => row.doubtId);
            if (taggedDoubtIds.length > 0) {
                conditions.push(inArray(doubtsTable.id, taggedDoubtIds));
            } else {
                conditions.push(eq(doubtsTable.id, -1));
            }
        }

        // Count total for pagination metadata
        const [totalCount] = await db.select({ count: sql<number>`count(*)` })
            .from(doubtsTable)
            .where(and(...conditions));

        let doubts = await db.select().from(doubtsTable)
            .where(and(...conditions))
            .orderBy(desc(doubtsTable.isPinned), desc(doubtsTable.createdAt))
            .limit(limit)
            .offset(offset);

        if (doubts.length > 0) {
            const doubtIds = doubts.map(d => d.id);

            // User Specific Data: Likes
            if (userName) {
                const userLikes = await db.select({ doubtId: likesTable.doubtId })
                    .from(likesTable)
                    .where(eq(likesTable.userName, userName));
                const likedIds = new Set(userLikes.map(l => l.doubtId));
                doubts = doubts.map(d => ({ ...d, hasLiked: likedIds.has(d.id) }));
            }

            // User Specific Data: Bookmarks
            if (email) {
                const userBookmarks = await db.select({ doubtId: bookmarksTable.doubtId })
                    .from(bookmarksTable)
                    .where(eq(bookmarksTable.userEmail, email));
                const bookmarkedIds = new Set(userBookmarks.map(b => b.doubtId));
                doubts = doubts.map(d => ({ ...d, hasBookmarked: bookmarkedIds.has(d.id) }));
            }
            
            // Reply counts
            const replyCounts = await db.select({
                doubtId: repliesTable.doubtId,
                count: sql<number>`count(*)`.mapWith(Number)
            })
            .from(repliesTable)
            .where(inArray(repliesTable.doubtId, doubtIds))
            .groupBy(repliesTable.doubtId);
            const countsMap = Object.fromEntries(replyCounts.map(r => [r.doubtId, r.count]));

            // Tags
            const tagRows = await db.select({
                doubtId: doubtTagsTable.doubtId,
                id: tagsTable.id,
                name: tagsTable.name,
                normalizedName: tagsTable.normalizedName,
            })
            .from(doubtTagsTable)
            .innerJoin(tagsTable, eq(doubtTagsTable.tagId, tagsTable.id))
            .where(inArray(doubtTagsTable.doubtId, doubtIds));

            const tagsByDoubt = tagRows.reduce<Record<number, any[]>>((acc, row) => {
                acc[row.doubtId] = acc[row.doubtId] || [];
                acc[row.doubtId].push({ id: row.id, name: row.name, normalizedName: row.normalizedName });
                return acc;
            }, {});

            doubts = doubts.map(doubt => ({
                ...doubt,
                replyCount: countsMap[doubt.id] || 0,
                tags: tagsByDoubt[doubt.id] || []
            }));
        }

        return NextResponse.json({
            doubts,
            pagination: {
                total: Number(totalCount.count),
                limit,
                offset,
                hasMore: Number(totalCount.count) > offset + limit
            }
        });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}

export async function POST(req: Request) {
    try {
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

        const { userName, subject, content, imageUrl, classroomId, type = 'community', tags = [] } = await req.json();
        const parsedClassroomId = classroomId ? parseInt(classroomId.toString()) : null;

        if (!userName || !subject || (!content?.trim() && !imageUrl)) {
            return NextResponse.json({ error: "Missing required fields (provide text or image)" }, { status: 400 });
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

        const savedTags: any[] = [];
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
    } catch (error: any) {
        console.error("Error saving doubt:", error);
        return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
    }
}
