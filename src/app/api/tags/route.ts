import { db } from "@/configs/db";
import { membershipsTable, tagsTable, doubtsTable, doubtTagsTable } from "@/configs/schema";
import { and, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { enforceApiRateLimit } from "@/lib/ratelimit/api-rate-limit";
import { generalLimiter } from "@/lib/ratelimit/ratelimit";
import { buildErrorResponse } from "@/lib/errors/error-handler";
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
        const subject = searchParams.get("subject")?.trim();
        const classroomId = parseOptionalClassroomId(classroomIdParam);

        if (classroomId) {
            await requireMembership(email, classroomId);
        }

        if (subject) {
            // Query to return top 5 tags ordered by frequency under the selected subject
            const popularTags = await db.select({
                id: tagsTable.id,
                name: tagsTable.name,
                normalizedName: tagsTable.normalizedName,
                classroomId: tagsTable.classroomId,
                createdByEmail: tagsTable.createdByEmail,
                createdAt: tagsTable.createdAt
            })
            .from(tagsTable)
            .innerJoin(doubtTagsTable, eq(tagsTable.id, doubtTagsTable.tagId))
            .innerJoin(doubtsTable, eq(doubtTagsTable.doubtId, doubtsTable.id))
            .where(
                and(
                    eq(doubtsTable.subject, subject),
                    classroomId
                        ? or(isNull(tagsTable.classroomId), eq(tagsTable.classroomId, classroomId))
                        : isNull(tagsTable.classroomId)
                )
            )
            .groupBy(tagsTable.id)
            .orderBy(desc(sql`count(${doubtTagsTable.id})`))
            .limit(5);

            if (popularTags.length > 0) {
                return NextResponse.json(popularTags);
            }

            // Fallback: overall most popular tags across the entire platform
            const fallbackTags = await db.select({
                id: tagsTable.id,
                name: tagsTable.name,
                normalizedName: tagsTable.normalizedName,
                classroomId: tagsTable.classroomId,
                createdByEmail: tagsTable.createdByEmail,
                createdAt: tagsTable.createdAt
            })
            .from(tagsTable)
            .innerJoin(doubtTagsTable, eq(tagsTable.id, doubtTagsTable.tagId))
            .where(
                classroomId
                    ? or(isNull(tagsTable.classroomId), eq(tagsTable.classroomId, classroomId))
                    : isNull(tagsTable.classroomId)
            )
            .groupBy(tagsTable.id)
            .orderBy(desc(sql`count(${doubtTagsTable.id})`))
            .limit(5);

            if (fallbackTags.length > 0) {
                return NextResponse.json(fallbackTags);
            }

            // Fallback 2: if there are no popular tags at all (e.g. fresh DB), get the 5 most recently created tags
            const recentTags = await db.select()
                .from(tagsTable)
                .where(
                    classroomId
                        ? or(isNull(tagsTable.classroomId), eq(tagsTable.classroomId, classroomId))
                        : isNull(tagsTable.classroomId)
                )
                .orderBy(desc(tagsTable.createdAt))
                .limit(5);

            return NextResponse.json(recentTags);
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

        const rateLimitResponse = await enforceApiRateLimit(generalLimiter, email, "general");
        if (rateLimitResponse) return rateLimitResponse;

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
