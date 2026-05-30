import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { coverLettersTable } from "@/configs/schema";
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
            .from(coverLettersTable)
            .where(eq(coverLettersTable.userEmail, userEmail))
            .orderBy(desc(coverLettersTable.createdAt));

        return NextResponse.json(history);

    } catch (error: any) {
        console.error("Fetch Cover Letter History Error:", error.message);
        return NextResponse.json({
            error: "Failed to fetch cover letter history",
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

        await db.delete(coverLettersTable)
            .where(
                and(
                    eq(coverLettersTable.id, parseInt(id)),
                    eq(coverLettersTable.userEmail, userEmail)
                )
            )
            .execute();

        return NextResponse.json({ message: "Cover letter deleted successfully" });
    } catch (error: any) {
        console.error("Delete Cover Letter Error:", error.message);
        return NextResponse.json({ error: "Failed to delete cover letter" }, { status: 500 });
    }
}
