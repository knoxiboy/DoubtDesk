import { db } from "@/configs/db";
import { doubtsTable } from "@/configs/schema";
import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { classroomsTable } from "@/configs/schema";

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { doubtId } = await req.json();
        if (!doubtId) return NextResponse.json({ error: "Doubt ID required" }, { status: 400 });

        // Fetch the soft-deleted doubt
        const [doubt] = await db.select().from(doubtsTable)
            .where(eq(doubtsTable.id, parseInt(doubtId)))
            .limit(1);

        if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        if (!doubt.deletedAt) return NextResponse.json({ error: "Doubt is not deleted" }, { status: 400 });

        // Only owner or teacher can restore
        const isOwner = doubt.userEmail === email;
        let isTeacher = false;

        if (doubt.classroomId) {
            const [room] = await db.select().from(classroomsTable)
                .where(eq(classroomsTable.id, doubt.classroomId));
            isTeacher = !!(room && room.teacherEmail === email);
        }

        if (!isOwner && !isTeacher) {
            return NextResponse.json({ error: "Unauthorized to restore this doubt" }, { status: 403 });
        }

        // Restore the doubt
        const [restored] = await db.update(doubtsTable)
            .set({ deletedAt: null })
            .where(eq(doubtsTable.id, parseInt(doubtId)))
            .returning();

        return NextResponse.json({ message: "Doubt restored successfully", doubt: restored });
    } catch (error) {
        console.error("Error restoring doubt:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
