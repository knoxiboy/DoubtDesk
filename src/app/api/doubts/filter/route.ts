import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { doubtsTable } from "@/configs/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth, requireMembership, parseClassroomId } from "@/lib/auth/membership-guard";
import { toPublicDoubt } from "@/lib/anonymity";
import { buildErrorResponse } from "@/lib/error-handler";

export async function GET(req: NextRequest) {
    try {
        const { email } = await requireAuth();

        const { searchParams } = new URL(req.url);
        const classroomIdParam = searchParams.get("classroomId");
        const subject = searchParams.get("subject");

        if (!classroomIdParam) {
            return NextResponse.json({ error: "classroomId is required" }, { status: 400 });
        }

        const classroomId = parseClassroomId(classroomIdParam);

        // Only members of the classroom (or its teacher) may view its doubts.
        await requireMembership(email, classroomId);

        const conditions = [
            eq(doubtsTable.classroomId, classroomId),
            isNull(doubtsTable.deletedAt),
        ];

        if (subject && subject !== "All") {
            conditions.push(eq(doubtsTable.subject, subject));
        }

        const doubts = await db
            .select()
            .from(doubtsTable)
            .where(and(...conditions))
            .orderBy(doubtsTable.createdAt)
            .limit(100);

        // Strip author identifiers before returning — see src/lib/anonymity.ts.
        const publicDoubts = doubts.map((doubt: (typeof doubts)[number]) => toPublicDoubt(doubt, email));

        return NextResponse.json({
            success: true,
            data: publicDoubts,
            count: publicDoubts.length,
        });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
