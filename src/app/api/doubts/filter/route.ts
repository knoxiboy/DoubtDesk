import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { doubtsTable } from "@/configs/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const classroomId = searchParams.get("classroomId");
        const subject = searchParams.get("subject");

        if (!classroomId) {
            return NextResponse.json({ error: "classroomId is required" }, { status: 400 });
        }

        const classroomIdInt = parseInt(classroomId);
        if (isNaN(classroomIdInt)) {
            return NextResponse.json({ error: "Invalid classroomId" }, { status: 400 });
        }

        const where = subject && subject !== "All"
            ? and(eq(doubtsTable.classroomId, classroomIdInt), eq(doubtsTable.subject, subject))
            : eq(doubtsTable.classroomId, classroomIdInt);

        const doubts = await db
            .select({
                id: doubtsTable.id,
                subject: doubtsTable.subject,
                content: doubtsTable.content,
                likes: doubtsTable.likes,
                isSolved: doubtsTable.isSolved,
                createdAt: doubtsTable.createdAt,
            })
            .from(doubtsTable)
            .where(where)
            .orderBy(doubtsTable.createdAt)
            .limit(100);

        return NextResponse.json({
            success: true,
            data: doubts,
            count: doubts.length,
        });
    } catch (error) {
        console.error("Filter endpoint error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
