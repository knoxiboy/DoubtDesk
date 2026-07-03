import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { doubtsTable } from "@/configs/schema";
import { and, eq, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const classroomId = searchParams.get("classroomId");
        const query = searchParams.get("q");

        if (!classroomId || !query) {
            return NextResponse.json({ error: "classroomId and q are required" }, { status: 400 });
        }

        const classroomIdInt = parseInt(classroomId);
        if (isNaN(classroomIdInt) || query.length < 2) {
            return NextResponse.json({ error: "Invalid classroomId or query too short" }, { status: 400 });
        }

        const results = await db
            .select({
                id: doubtsTable.id,
                content: doubtsTable.content,
                subject: doubtsTable.subject,
                likes: doubtsTable.likes,
                isSolved: doubtsTable.isSolved,
                createdAt: doubtsTable.createdAt,
            })
            .from(doubtsTable)
            .where(and(
                eq(doubtsTable.classroomId, classroomIdInt),
                sql`(${doubtsTable.content}::text ILIKE ${'%' + query + '%'} OR ${doubtsTable.subject}::text ILIKE ${'%' + query + '%'})`
            ))
            .orderBy(doubtsTable.createdAt)
            .limit(10);

        return NextResponse.json({
            success: true,
            data: results,
            count: results.length,
        });
    } catch (error) {
        console.error("Search error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
