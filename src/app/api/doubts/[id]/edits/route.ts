import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { doubtEditsTable, doubtsTable, membershipsTable } from "@/configs/schema";
import { eq, desc, and, isNull } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { canTeach } from "@/lib/auth/membership-guard";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const doubtId = parseInt(id);

        if (isNaN(doubtId)) {
            return NextResponse.json({ error: "Invalid doubt ID" }, { status: 400 });
        }

        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress;

        // Fetch doubt to check access
        const [doubt] = await db
            .select()
            .from(doubtsTable)
            .where(and(eq(doubtsTable.id, doubtId), isNull(doubtsTable.deletedAt)))
            .limit(1);

        if (!doubt) {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }

        // Security: Verify doubt visibility/classroom membership
        if (doubt.classroomId) {
            if (!email) {
                return NextResponse.json({ error: "Unauthorized access to classroom doubt" }, { status: 401 });
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
            if (!membership) {
                return NextResponse.json({ error: "Access denied to this classroom's doubt" }, { status: 403 });
            }
        }

        const edits = await db
            .select({
                id: doubtEditsTable.id,
                doubtId: doubtEditsTable.doubtId,
                previousSubject: doubtEditsTable.previousSubject,
                previousContent: doubtEditsTable.previousContent,
                editedByEmail: doubtEditsTable.editedByEmail, // Kept internal, UI can show "by Author"
                editedAt: doubtEditsTable.editedAt,
            })
            .from(doubtEditsTable)
            .where(eq(doubtEditsTable.doubtId, doubtId))
            .orderBy(desc(doubtEditsTable.editedAt));

        return NextResponse.json(edits);
    } catch (error) {
        console.error("Error fetching doubt edits:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
