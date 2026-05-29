import { db } from "@/configs/db";
import { membershipsTable, tagsTable } from "@/configs/schema";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

const normalizeTagName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

async function canAccessClassroom(classroomId: number, email?: string | null) {
    if (!email) return false;

    const [membership] = await db.select().from(membershipsTable).where(
        and(
            eq(membershipsTable.userEmail, email),
            eq(membershipsTable.classroomId, classroomId)
        )
    ).limit(1);

    return !!membership;
}

export async function GET(req: Request) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const classroomIdParam = searchParams.get("classroomId");
        const query = searchParams.get("q")?.trim();
        const classroomId = classroomIdParam ? parseInt(classroomIdParam) : null;
        const email = user.primaryEmailAddress?.emailAddress;

        if (classroomId && !(await canAccessClassroom(classroomId, email))) {
            return NextResponse.json({ error: "Access denied to this classroom" }, { status: 403 });
        }

        const conditions: any[] = [
            classroomId
                ? or(isNull(tagsTable.classroomId), eq(tagsTable.classroomId, classroomId))
                : isNull(tagsTable.classroomId)
        ];

        if (query) {
            conditions.push(ilike(tagsTable.name, `%${query}%`));
        }

        const tags = await db.select().from(tagsTable)
            .where(and(...conditions))
            .orderBy(desc(tagsTable.createdAt));

        return NextResponse.json(tags);
    } catch (error) {
        console.error("Error fetching tags:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const email = user.primaryEmailAddress?.emailAddress;
        const { name, classroomId: rawClassroomId } = await req.json();
        const normalizedName = normalizeTagName(name || "");
        const classroomId = rawClassroomId ? parseInt(rawClassroomId.toString()) : null;

        if (!normalizedName) {
            return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
        }

        if (classroomId && !(await canAccessClassroom(classroomId, email))) {
            return NextResponse.json({ error: "Access denied to this classroom" }, { status: 403 });
        }

        const [existing] = await db.select().from(tagsTable).where(
            and(
                eq(tagsTable.normalizedName, normalizedName),
                classroomId ? eq(tagsTable.classroomId, classroomId) : isNull(tagsTable.classroomId)
            )
        ).limit(1);

        if (existing) return NextResponse.json(existing);

        const [tag] = await db.insert(tagsTable).values({
            name: normalizedName.replace(/\b\w/g, (char) => char.toUpperCase()),
            normalizedName,
            classroomId,
            createdByEmail: email || null,
        }).returning();

        return NextResponse.json(tag, { status: 201 });
    } catch (error: any) {
        console.error("Error saving tag:", error);
        return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
    }
}
