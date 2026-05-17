import { db } from "@/configs/db";
import { bookmarksTable } from "@/configs/schema";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const doubtId = parseInt(id);

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

        const { id } = await params;
        const doubtId = parseInt(id);

        await db.delete(bookmarksTable)
            .where(and(eq(bookmarksTable.userEmail, email), eq(bookmarksTable.doubtId, doubtId)));

        return NextResponse.json({ message: "Bookmark removed" });
    } catch (error) {
        console.error("Error removing bookmark:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
