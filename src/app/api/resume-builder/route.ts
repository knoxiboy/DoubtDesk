import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { resumesTable } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { checkUserBlock } from "@/lib/auth-utils";

function normalizeParsedResumeData(value: unknown): Record<string, unknown> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        return value as Record<string, unknown>;
    }
    return {};
}

// Postgres 4-byte signed integer max limit
const MAX_PG_INT = 2147483647;

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userEmail = user.primaryEmailAddress?.emailAddress;
        if (!userEmail) {
            return NextResponse.json({ error: "User email not found" }, { status: 400 });
        }

        // 0. Check if user is blocked
        const { isBlocked, errorResponse } = await checkUserBlock(userEmail);
        if (isBlocked) return errorResponse;

        const { id, resumeName, resumeData } = await req.json();

        if (id) {
            // Validate incoming ID to prevent database integer overflows
            const parsedId = parseInt(id, 10);
            if (isNaN(parsedId) || parsedId < 1 || parsedId > MAX_PG_INT) {
                return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
            }

            // Update existing
            const updated = await db
                .update(resumesTable)
                .set({
                    resumeName,
                    resumeData: JSON.stringify(resumeData),
                    updatedAt: new Date(),
                })
                .where(and(eq(resumesTable.id, parsedId), eq(resumesTable.userEmail, userEmail)))
                .returning();

            if (updated.length === 0) {
                return NextResponse.json({ error: "Resume not found" }, { status: 404 });
            }

            return NextResponse.json(updated[0]);
        } else {
            // Create new
            const inserted = await db
                .insert(resumesTable)
                .values({
                    userEmail,
                    resumeName,
                    resumeData: JSON.stringify(resumeData),
                })
                .returning();

            return NextResponse.json(inserted[0]);
        }
    } catch (error: unknown) {
        console.error("Resume Save Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userEmail = user.primaryEmailAddress?.emailAddress;
        if (!userEmail) {
            return NextResponse.json({ error: "User email not found" }, { status: 400 });
        }

        // 0. Check if user is blocked
        const { isBlocked, errorResponse } = await checkUserBlock(userEmail);
        if (isBlocked) return errorResponse;

        const { searchParams } = new URL(req.url);
        const idParam = searchParams.get("id");

        if (idParam) {
            // Validate GET ID parameter
            if (!/^\d+$/.test(idParam)) {
                return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
            }

            const id = parseInt(idParam, 10);
            if (id > MAX_PG_INT) {
                return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
            }

            const result = await db
                .select()
                .from(resumesTable)
                .where(and(eq(resumesTable.id, id), eq(resumesTable.userEmail, userEmail)));

            if (result.length === 0) {
                return NextResponse.json({ error: "Resume not found" }, { status: 404 });
            }

            let parsedData: unknown = {};
            try {
                parsedData = JSON.parse(result[0].resumeData);
            } catch (e) {
                console.error("Single Resume Parse Error:", e);
                parsedData = {};
            }

            const resume = {
                ...result[0],
                resumeData: normalizeParsedResumeData(parsedData)
            };

            return NextResponse.json(resume);
        }

        const results = await db
            .select()
            .from(resumesTable)
            .where(eq(resumesTable.userEmail, userEmail));

        const resumes = results.map((item: (typeof results)[number]) => {
            try {
                const parsed = JSON.parse(item.resumeData);
                return {
                    ...item,
                    resumeData: normalizeParsedResumeData(parsed)
                };
            } catch (e) {
                console.error("Parse Error:", e);
                return { ...item, resumeData: {} };
            }
        });

        return NextResponse.json(resumes);
    } catch (error: unknown) {
        console.error("Resume Fetch Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userEmail = user.primaryEmailAddress?.emailAddress;
        if (!userEmail) {
            return NextResponse.json({ error: "User email not found" }, { status: 400 });
        }

        // 0. Check if user is blocked
        const { isBlocked, errorResponse } = await checkUserBlock(userEmail);
        if (isBlocked) return errorResponse;

        const { searchParams } = new URL(req.url);
        const idParam = searchParams.get("id");

        if (!idParam) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        // Clean, structured integer check
        if (!/^\d+$/.test(idParam)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const id = parseInt(idParam, 10);
        if (id > MAX_PG_INT) {
             return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        // Only return the id column — no need to pull the full row (resumeData) just to check existence
        const deleted = await db
            .delete(resumesTable)
            .where(and(eq(resumesTable.id, id), eq(resumesTable.userEmail, userEmail)))
            .returning({ id: resumesTable.id });

        if (deleted.length === 0) {
            return NextResponse.json({ error: "Resume not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Resume Delete Error:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, { status: 500 });
    }
}