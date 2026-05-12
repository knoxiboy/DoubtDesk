import { db } from "@/configs/db";
import { doubtsTable, likesTable, repliesTable, membershipsTable, classroomsTable, usersTable } from "@/configs/schema";
import { categorizeDoubt } from "@/lib/ai/categorizer";
import { and, eq, desc, isNull, or, not, sql, ilike } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { moderateContent, handleModerationViolation } from "@/lib/moderation";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get("subject");
    const search = searchParams.get("search");
    const userName = searchParams.get("userName");
    const classroomIdStr = searchParams.get("classroomId");
    const classroomId = classroomIdStr ? parseInt(classroomIdStr) : null;
    const type = searchParams.get("type") || 'community';

    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const email = user.primaryEmailAddress?.emailAddress;

        // Security: If classroomId is provided, check membership
        if (classroomId && email) {
            console.log(`Security Check: Classroom ${classroomId}, User ${email}`);
            const [membership] = await db.select().from(membershipsTable).where(
                and(
                    eq(membershipsTable.userEmail, email),
                    eq(membershipsTable.classroomId, classroomId)
                )
            );
            if (!membership) {
                console.warn(`Denied access to classroom ${classroomId} for user ${email}`);
                return NextResponse.json({ error: "Access denied to this classroom" }, { status: 403 });
            }
        } else if (classroomId && !email) {
            console.warn(`Anonymous user attempting to access classroom ${classroomId}`);
            // For hackathon simplicity, we might allow it if they have the link, 
            // but usually this should be blocked.
        }

        let query = db.select().from(doubtsTable);
        let conditions = [];

        // Base Classroom scoping
        if (classroomId) {
            conditions.push(eq(doubtsTable.classroomId, classroomId));
        } else {
            conditions.push(isNull(doubtsTable.classroomId));
        }

        // Fetch classroom role info
        const [room] = classroomId ? await db.select().from(classroomsTable).where(eq(classroomsTable.id, classroomId)) : [null];
        const isTeacher = room && email && room.teacherEmail === email;

        // GLOBAL VISIBILITY FILTER
        // If not the teacher, you can only see 'teacher' doubts if you are the owner
        if (!isTeacher && email) {
            conditions.push(
                or(
                    not(eq(doubtsTable.type, 'teacher')),
                    eq(doubtsTable.userEmail, email)
                )
            );
        } else if (!isTeacher && !email) {
            // Extreme fallback: if no email, only show non-teacher doubts
            conditions.push(not(eq(doubtsTable.type, 'teacher')));
        }

        // Filters
        if (subject && subject !== "All") {
            conditions.push(eq(doubtsTable.subject, subject));
        }

        if (search) {
            conditions.push(
                or(
                    ilike(doubtsTable.content, `%${search}%`),
                    ilike(doubtsTable.subject, `%${search}%`),
                    ilike(doubtsTable.userName, `%${search}%`)
                )
            );
        }

        if (type && type !== "All") {
            conditions.push(eq(doubtsTable.type, type));
            // Security/Privacy: AI history is personal
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

            doubts = doubts.map(doubt => ({
                ...doubt,
                hasLiked: likedIds.has(doubt.id)
            }));
        }

        // Fetch reply counts using an aggregate query
        const replyCounts = await db.select({
            doubtId: repliesTable.doubtId,
            count: sql<number>`count(*)`.mapWith(Number)
        })
        .from(repliesTable)
        .groupBy(repliesTable.doubtId);

        const countsMap = Object.fromEntries(replyCounts.map(r => [r.doubtId, r.count]));

        doubts = doubts.map(doubt => ({
            ...doubt,
            replyCount: countsMap[doubt.id] || 0
        }));

        return NextResponse.json(doubts);
    } catch (error) {
        console.error("Error fetching doubts:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
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
            return NextResponse.json({ 
                error: `Your account is temporarily blocked due to safety violations. Access will be restored on ${unlockDate}.` 
            }, { status: 403 });
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
            type
        }).returning();

        return NextResponse.json(newDoubt[0]);
    } catch (error: any) {
        console.error("Error saving doubt:", error);
        return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
    }
}
