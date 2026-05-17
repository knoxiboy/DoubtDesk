import { db } from "@/configs/db";
import { doubtsTable, likesTable, repliesTable, membershipsTable, classroomsTable, usersTable } from "@/configs/schema";
import { categorizeDoubt } from "@/lib/ai/categorizer";
import { and, eq, desc, isNull, or, not, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { moderateContent, handleModerationViolation } from "@/lib/moderation";
import { buildErrorResponse } from "@/lib/error-handler";

export async function GET(req: Request) {
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
        } else if (classroomId && !email) {
            // For hackathon simplicity, allow if they have the link
        }

        let query = db.select().from(doubtsTable);
        const conditions: any[] = [];

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

        let doubts = await query.where(and(...conditions)).orderBy(desc(doubtsTable.createdAt));

        if (userName && doubts.length > 0) {
            const userLikes = await db.select({ doubtId: likesTable.doubtId })
                .from(likesTable)
                .where(eq(likesTable.userName, userName));
            const likedIds = new Set(userLikes.map(l => l.doubtId));
            doubts = doubts.map((doubt: any) => ({ ...doubt, hasLiked: likedIds.has(doubt.id) }));
        }

        const replyCounts = await db.select({
            doubtId: repliesTable.doubtId,
            count: sql<number>`count(*)`.mapWith(Number),
        })
            .from(repliesTable)
            .groupBy(repliesTable.doubtId);

        const countsMap: Record<string, number> = Object.fromEntries(
            replyCounts.map((r: any) => [r.doubtId, r.count])
        );

        doubts = (doubts as any[]).map((doubt: any) => ({
            ...doubt,
            replyCount: countsMap[doubt.id] || 0,
        }));

        return NextResponse.json(doubts);
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

        const { userName, subject, content, imageUrl, classroomId, type = 'community' } = await req.json();

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

        const newDoubt = await db.insert(doubtsTable).values({
            userName,
            userEmail: email,
            subject,
            subTopic,
            content,
            imageUrl,
            classroomId: classroomId ? parseInt(classroomId.toString()) : null,
            type,
        }).returning();

        return NextResponse.json(newDoubt[0]);
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
