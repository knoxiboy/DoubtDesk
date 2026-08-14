import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { replyTaskStatesTable } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const replyId = parseInt(id);

        if (isNaN(replyId)) {
            return NextResponse.json({ error: "Invalid reply ID" }, { status: 400 });
        }

        const tasks = await db
            .select({
                taskIndex: replyTaskStatesTable.taskIndex,
                isCompleted: replyTaskStatesTable.isCompleted,
            })
            .from(replyTaskStatesTable)
            .where(eq(replyTaskStatesTable.replyId, replyId));

        return NextResponse.json(tasks);
    } catch (error) {
        console.error("Error fetching task states:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const replyId = parseInt(id);

        if (isNaN(replyId)) {
            return NextResponse.json({ error: "Invalid reply ID" }, { status: 400 });
        }

        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;

        if (!email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { taskIndex, isCompleted } = body;

        if (typeof taskIndex !== 'number' || typeof isCompleted !== 'boolean') {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        const [existing] = await db
            .select()
            .from(replyTaskStatesTable)
            .where(
                and(
                    eq(replyTaskStatesTable.replyId, replyId),
                    eq(replyTaskStatesTable.taskIndex, taskIndex)
                )
            )
            .limit(1);

        if (existing) {
            await db
                .update(replyTaskStatesTable)
                .set({
                    isCompleted,
                    updatedBy: email,
                    updatedAt: new Date(),
                })
                .where(eq(replyTaskStatesTable.id, existing.id));
        } else {
            await db
                .insert(replyTaskStatesTable)
                .values({
                    replyId,
                    taskIndex,
                    isCompleted,
                    updatedBy: email,
                });
        }

        return NextResponse.json({ success: true, taskIndex, isCompleted });
    } catch (error) {
        console.error("Error updating task state:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
