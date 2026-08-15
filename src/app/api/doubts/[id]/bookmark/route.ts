import { db } from "@/configs/db";
import { bookmarksTable, doubtsTable, membershipsTable } from "@/configs/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
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

        const [doubt] = await db.select().from(doubtsTable).where(and(eq(doubtsTable.id, doubtId), isNull(doubtsTable.deletedAt))).limit(1);
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

        const result = await db.transaction(async (tx) => {
            // Serialize against soft deletion and re-check active state in the
            // same transaction that creates the bookmark.
            const locked = await tx.execute(
                sql`SELECT ${doubtsTable.id} FROM ${doubtsTable} WHERE ${doubtsTable.id} = ${doubtId} AND ${doubtsTable.deletedAt} IS NULL FOR UPDATE`,
            );
            if (!locked.rows?.length) return { status: "missing" as const };

            const existing = await tx.select().from(bookmarksTable)
                .where(and(eq(bookmarksTable.userEmail, email), eq(bookmarksTable.doubtId, doubtId)))
                .limit(1);
            if (existing.length > 0) return { status: "existing" as const };

            const [inserted] = await tx.insert(bookmarksTable).values({
                userEmail: email,
                doubtId,
            }).returning();
            return { status: "inserted" as const, inserted };
        });

        if (result.status === "missing") {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }
        if (result.status === "existing") {
            return NextResponse.json({ message: "Already bookmarked" });
        }
        return NextResponse.json(result.inserted);
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

        const [doubt] = await db.select().from(doubtsTable).where(and(eq(doubtsTable.id, doubtId), isNull(doubtsTable.deletedAt))).limit(1);
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

        const removed = await db.transaction(async (tx) => {
            const locked = await tx.execute(
                sql`SELECT ${doubtsTable.id} FROM ${doubtsTable} WHERE ${doubtsTable.id} = ${doubtId} AND ${doubtsTable.deletedAt} IS NULL FOR UPDATE`,
            );
            if (!locked.rows?.length) return false;

            await tx.delete(bookmarksTable)
                .where(and(eq(bookmarksTable.userEmail, email), eq(bookmarksTable.doubtId, doubtId)));
            return true;
        });

        if (!removed) {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Bookmark removed" });
    } catch (error) {
        console.error("Error removing bookmark:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
