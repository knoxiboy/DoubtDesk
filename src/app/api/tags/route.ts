import { db } from "@/configs/db";
import { tagsTable } from "@/configs/schema";
import { and, desc, eq, ilike, isNull, or, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { buildErrorResponse } from "@/lib/error-handler";
import {
    parseOptionalClassroomId,
    requireAuth,
    requireMembership,
} from "@/lib/auth/membership-guard";

const normalizeTagName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

export async function GET(req: Request) {
    try {
        const { email } = await requireAuth();

        const { searchParams } = new URL(req.url);
        const classroomIdParam = searchParams.get("classroomId");
        const query = searchParams.get("q")?.trim();
        const classroomId = parseOptionalClassroomId(classroomIdParam);

        if (classroomId) {
            await requireMembership(email, classroomId);
        }

        const conditions: SQL<unknown>[] = [
            classroomId
                ? or(isNull(tagsTable.classroomId), eq(tagsTable.classroomId, classroomId)) as SQL<unknown>
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
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}

export async function POST(req: Request) {
    try {
        const { email } = await requireAuth();
        const { name, classroomId: rawClassroomId } = await req.json();
        const normalizedName = normalizeTagName(name || "");
        const classroomId = parseOptionalClassroomId(rawClassroomId);

        if (!normalizedName) {
            return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
        }

        if (classroomId) {
            await requireMembership(email, classroomId);
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
            createdByEmail: email,
        }).returning();

        return NextResponse.json(tag, { status: 201 });
    } catch (error: unknown) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
