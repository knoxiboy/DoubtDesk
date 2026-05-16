import { db } from "@/configs/db";
import { repliesTable, doubtsTable, classroomsTable, replyLikesTable } from "@/configs/schema";
import { eq, asc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { moderateContent, handleModerationViolation } from "@/lib/moderation";
import { usersTable } from "@/configs/schema";

export async function GET(req: Request) {
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

        const { searchParams } = new URL(req.url);
        const doubtIdStr = searchParams.get("doubtId");
        const userName = searchParams.get("userName");

        if (!doubtIdStr) {
            return NextResponse.json({ error: "Doubt ID required" }, { status: 400 });
        }
        const doubtId = parseInt(doubtIdStr);

        // Security: Verify doubt visibility
        const [doubt] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId));
        if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

        if (doubt.type === 'teacher') {
            const [room] = await db.select().from(classroomsTable).where(eq(classroomsTable.id, doubt.classroomId!));
            const isTeacher = room && email && room.teacherEmail === email;
            const isOwner = email && doubt.userEmail === email;

            if (!isTeacher && !isOwner) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
        }

        const data = await db.select()
            .from(repliesTable)
            .where(eq(repliesTable.doubtId, doubtId))
            .orderBy(asc(repliesTable.createdAt));

        // If userName is provided, check which replies are upvoted by this user
        let repliesWithVotes = data;
        if (userName) {
            const userUpvotes = await db.select()
                .from(replyLikesTable)
                .where(eq(replyLikesTable.userName, userName));
            
            const upvotedReplyIds = new Set(userUpvotes.map(v => v.replyId));
            
            repliesWithVotes = data.map(reply => ({
                ...reply,
                hasUpvoted: upvotedReplyIds.has(reply.id)
            }));
        }

        return NextResponse.json(repliesWithVotes);
    } catch (error) {
        console.error("Error fetching replies:", error);
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

        const { doubtId, userName, type, content, imageUrl } = await req.json();

        if (!doubtId || !userName || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. AI Moderation Check
        if (content) {
            const moderation = await moderateContent(content);
            const violationError = await handleModerationViolation(email, content, moderation);
            if (violationError) {
                return NextResponse.json({ error: violationError }, { status: 400 });
            }
        }

        // Security: Check if it's a teacher doubt
        const [doubt] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, parseInt(doubtId)));
        if (doubt?.type === 'teacher') {
            const [room] = await db.select().from(classroomsTable).where(eq(classroomsTable.id, doubt.classroomId!));
            if (room && email && room.teacherEmail !== email) {
                return NextResponse.json({ error: "Only the teacher can reply to this doubt" }, { status: 403 });
            }
        }

        const newReply = await db.insert(repliesTable).values({
            doubtId: parseInt(doubtId),
            userName,
            type,
            content: content || null,
            imageUrl: imageUrl || null
        }).returning();

        return NextResponse.json(newReply[0]);
    } catch (error: any) {
        console.error("Error creating reply:", error);
        return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
    }
}
