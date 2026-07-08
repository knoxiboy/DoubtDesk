import { db } from "@/configs/db";
import { bookmarksTable, doubtsTable, membershipsTable } from "@/configs/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { enforceApiRateLimit } from "@/lib/ratelimit/api-rate-limit";
import { generalLimiter } from "@/lib/ratelimit/ratelimit";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const rateLimitResponse = await enforceApiRateLimit(generalLimiter, email, "general");
        if (rateLimitResponse) return rateLimitResponse;

        const { id } = await params;
        const doubtId = parseInt(id);

        const [doubt] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId)).limit(1);
        if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

        if (doubt.classroomId && email) {
            const [membership] = await db.select().from(membershipsTable).where(
                and(eq(membershipsTable.userEmail, email), eq(membershipsTable.classroomId, doubt.classroomId))
            );
            if (!membership) {
                return NextResponse.json({ error: "Access denied to this classroom's doubt" }, { status: 403 });
            }
        } else if (doubt.classroomId && !email) {
            return NextResponse.json({ error: "Unauthorized access to classroom doubt" }, { status: 401 });
        }

        // Check if already bookmarked
        const existing = await db.select().from(bookmarksTable)
            .where(and(eq(bookmarksTable.userEmail, email), eq(bookmarksTable.doubtId, doubtId)))
            .limit(1);

        if (existing.length > 0) {
            return NextResponse.json({ message: "Already bookmarked" });
        }

        const inserted = await db.insert(bookmarksTable).values({
            userEmail: email,
            doubtId
        }).returning();

        return NextResponse.json(inserted[0]);
    } catch (error) {
        console.error("Error bookmarking doubt:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const rateLimitResponse = await enforceApiRateLimit(generalLimiter, email, "general");
        if (rateLimitResponse) return rateLimitResponse;

        const { id } = await params;
        const doubtId = parseInt(id);

        const [doubt] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId)).limit(1);
        if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

        if (doubt.classroomId && email) {
            const [membership] = await db.select().from(membershipsTable).where(
                and(eq(membershipsTable.userEmail, email), eq(membershipsTable.classroomId, doubt.classroomId))
            );
            if (!membership) {
                return NextResponse.json({ error: "Access denied to this classroom's doubt" }, { status: 403 });
            }
        } else if (doubt.classroomId && !email) {
            return NextResponse.json({ error: "Unauthorized access to classroom doubt" }, { status: 401 });
        }

        await db.delete(bookmarksTable)
            .where(and(eq(bookmarksTable.userEmail, email), eq(bookmarksTable.doubtId, doubtId)));

        return NextResponse.json({ message: "Bookmark removed" });
    } catch (error) {
        console.error("Error removing bookmark:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
