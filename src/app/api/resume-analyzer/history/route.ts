import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { resumeAnalysisTable } from "@/configs/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq, desc, and } from "drizzle-orm";
import { checkUserBlock } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
    try {
        const user = await currentUser();
        const userEmail = user?.primaryEmailAddress?.emailAddress;

        if (!userEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 0. Check if user is blocked
        const { isBlocked, errorResponse } = await checkUserBlock(userEmail);
        if (isBlocked) return errorResponse;

        const history = await db.select()
            .from(resumeAnalysisTable)
            .where(eq(resumeAnalysisTable.userEmail, userEmail))
            .orderBy(desc(resumeAnalysisTable.createdAt));

        // Parse JSON strings back to objects
        const parsedHistory = history.map(item => ({
            ...item,
            analysisData: JSON.parse(item.analysisData)
        }));

        return NextResponse.json(parsedHistory);

    } catch (error: any) {
        console.error("Fetch Resume History Error:", error.message);
        return NextResponse.json({
            error: "Failed to fetch resume history",
        }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await currentUser();
        const userEmail = user?.primaryEmailAddress?.emailAddress;

        if (!userEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 0. Check if user is blocked
        const { isBlocked, errorResponse } = await checkUserBlock(userEmail);
        if (isBlocked) return errorResponse;

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        await db.delete(resumeAnalysisTable)
            .where(
                and(
                    eq(resumeAnalysisTable.id, parseInt(id)),
                    eq(resumeAnalysisTable.userEmail, userEmail)
                )
            )
            .execute();

        return NextResponse.json({ message: "Resume analysis deleted successfully" });
    } catch (error: any) {
        console.error("Delete Resume Analysis Error:", error.message);
        return NextResponse.json({ error: "Failed to delete resume analysis" }, { status: 500 });
    }
}
