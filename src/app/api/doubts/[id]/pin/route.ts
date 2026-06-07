import { db } from "@/configs/db";
import {
    doubtsTable,
    classroomsTable,
    membershipsTable,
    } from "@/configs/schema";
import { and, eq, count, isNull } from "drizzle-orm";
import { canTeach } from "@/lib/auth/membership-guard";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const doubtId = parseInt(id);

        const [doubt] = await db.select().from(doubtsTable).where(
            and(eq(doubtsTable.id, doubtId), isNull(doubtsTable.deletedAt))
        ).limit(1);
        if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

        if (!doubt.classroomId) {
            return NextResponse.json({ error: "Only classroom doubts can be pinned" }, { status: 400 });
        }

        const [membership] = await db
        .select()
        .from(membershipsTable)
        .where(
            and(
                eq(membershipsTable.userEmail, email),
                eq(membershipsTable.classroomId, doubt.classroomId)
            )
        );

        if (!membership || !canTeach(membership.role)) {
            return NextResponse.json(
                { error: "Insufficient permissions to pin doubts" },
                { status: 403 }
            );
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

        const [doubt] = await db.select().from(doubtsTable).where(
            and(eq(doubtsTable.id, doubtId), isNull(doubtsTable.deletedAt))
        ).limit(1);
        if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

        if (!doubt.classroomId) {
            return NextResponse.json({ error: "Only classroom doubts can be pinned" }, { status: 400 });
        }

        const [membership] = await db
        .select()
        .from(membershipsTable)
        .where(
            and(
                eq(membershipsTable.userEmail, email),
                eq(membershipsTable.classroomId, doubt.classroomId)
            )
        );

        if (!membership || !canTeach(membership.role)) {
            return NextResponse.json(
                { error: "Insufficient permissions to unpin doubts" },
                { status: 403 }
            );
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
