import { db } from "@/configs/db";
import { doubtsTable, classroomsTable } from "@/configs/schema";
import { and, eq, count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const doubtId = parseInt(id);

        const [doubt] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId)).limit(1);
        if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

        if (!doubt.classroomId) {
            return NextResponse.json({ error: "Only classroom doubts can be pinned" }, { status: 400 });
        }

        const [room] = await db.select().from(classroomsTable).where(eq(classroomsTable.id, doubt.classroomId)).limit(1);
        if (!room || room.teacherEmail !== email) {
            return NextResponse.json({ error: "Only the teacher can pin doubts" }, { status: 403 });
        }

        // Check pin count
        const [pinCount] = await db.select({ value: count() })
            .from(doubtsTable)
            .where(and(eq(doubtsTable.classroomId, doubt.classroomId), eq(doubtsTable.isPinned, true)));

        if (pinCount.value >= 3) {
            return NextResponse.json({ error: "Maximum of 3 pinned doubts allowed per classroom" }, { status: 400 });
        }

        const updated = await db.update(doubtsTable)
            .set({ isPinned: true })
            .where(eq(doubtsTable.id, doubtId))
            .returning();

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error("Error pinning doubt:", error);
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

        const [doubt] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId)).limit(1);
        if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

        if (!doubt.classroomId) {
            return NextResponse.json({ error: "Only classroom doubts can be pinned" }, { status: 400 });
        }

        const [room] = await db.select().from(classroomsTable).where(eq(classroomsTable.id, doubt.classroomId)).limit(1);
        if (!room || room.teacherEmail !== email) {
            return NextResponse.json({ error: "Only the teacher can unpin doubts" }, { status: 403 });
        }

        const updated = await db.update(doubtsTable)
            .set({ isPinned: false })
            .where(eq(doubtsTable.id, doubtId))
            .returning();

        return NextResponse.json(updated[0]);
    } catch (error) {
        console.error("Error unpinning doubt:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
