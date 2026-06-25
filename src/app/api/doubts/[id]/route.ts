import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { doubtsTable, repliesTable, tagsTable, doubtTagsTable, bookmarksTable, likesTable } from "@/configs/schema";
import { eq, sql, and, getTableColumns } from "drizzle-orm";
import { getOptionalAuth, requireMembership } from "@/lib/auth/membership-guard";
import { buildErrorResponse } from "@/lib/error-handler";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const doubtId = parseInt(id, 10);

        if (isNaN(doubtId)) {
            return NextResponse.json({ error: "Invalid doubt ID" }, { status: 400 });
        }

        const auth = await getOptionalAuth();
        const email = auth?.email ?? null;

        const [doubt] = await db
            .select({
                ...getTableColumns(doubtsTable),
                replyCount: sql<number>`coalesce((SELECT count(*)::int FROM ${repliesTable} WHERE ${repliesTable.doubtId} = ${doubtsTable.id}), 0)`.mapWith(Number),
            })
            .from(doubtsTable)
            .where(eq(doubtsTable.id, doubtId))
            .limit(1);

        if (!doubt) {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }

        // Classroom membership guard
        if (doubt.classroomId) {
            if (!email) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            const membership = await requireMembership(email, doubt.classroomId);

            // Teacher doubts visibility guard
            if (doubt.type === "teacher") {
                const isTeacher = ["teacher", "owner", "admin"].includes(membership.role.toLowerCase());
                const isAuthor = doubt.userEmail === email;
                if (!isTeacher && !isAuthor) {
                    return NextResponse.json({ error: "Access denied to this doubt" }, { status: 403 });
                }
            }
        }

        // Fetch tags
        const tags = await db
            .select({
                id: tagsTable.id,
                name: tagsTable.name,
                normalizedName: tagsTable.normalizedName,
            })
            .from(doubtTagsTable)
            .innerJoin(tagsTable, eq(doubtTagsTable.tagId, tagsTable.id))
            .where(eq(doubtTagsTable.doubtId, doubtId));

        // Interaction flags.
        //
        // `hasLiked` is derived strictly from the authenticated session. A leftover
        // `userName` query param from the userName -> userEmail migration used to be
        // accepted here and compared against `likesTable.userEmail`. That was both
        // dead (a client handle never matched the email column) and unsafe: it let an
        // unauthenticated caller pass an arbitrary identifier to probe whether a
        // specific user had liked a doubt. We now trust only the server-side session.
        let hasLiked = false;
        let hasBookmarked = false;

        if (email) {
            const [likeRecord] = await db
                .select()
                .from(likesTable)
                .where(
                    and(
                        eq(likesTable.userEmail, email),
                        eq(likesTable.doubtId, doubtId)
                    )
                )
                .limit(1);
            hasLiked = !!likeRecord;
        }

        if (email) {
            const [bookmarkRecord] = await db
                .select()
                .from(bookmarksTable)
                .where(
                    and(
                        eq(bookmarksTable.userEmail, email),
                        eq(bookmarksTable.doubtId, doubtId)
                    )
                )
                .limit(1);
            hasBookmarked = !!bookmarkRecord;
        }

        return NextResponse.json({
            ...doubt,
            tags,
            hasLiked,
            hasBookmarked,
        });

    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
