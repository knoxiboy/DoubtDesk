import { NextResponse } from "next/server";
import { db } from "@/configs/db";
import { doubtsTable, repliesTable, tagsTable, doubtTagsTable, bookmarksTable, likesTable } from "@/configs/schema";
import { eq, sql, and, getTableColumns } from "drizzle-orm";
import { getOptionalAuth, requireMembership } from "@/lib/auth/membership-guard";
import { buildErrorResponse } from "@/lib/error-handler";
import { sanitizeDoubt } from "@/lib/sanitize-response";
import { currentUser } from "@clerk/nextjs/server";

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

        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress ?? null;
        const userId = user?.id ?? null;

        const [doubt] = await db
            .select({
                ...getTableColumns(doubtsTable),
                isSolved: doubtsTable.isSolved,
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

        // Interaction flags - ALWAYS set these, default to false
        let hasLiked = false;
        let hasBookmarked = false;

        // Check if user has liked this doubt
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

        // Check if user has bookmarked this doubt
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

        // Determine if the doubt is anonymous
        const isAnonymous = doubt.userEmail === null || doubt.type === 'anonymous';

        // Prepare the doubt with all fields, ensuring defaults
        const doubtWithDetails = {
            ...doubt,
            tags: tags || [],
            hasLiked: hasLiked || false,
            hasBookmarked: hasBookmarked || false,
            isAnonymous: isAnonymous,
            // Add displayName for the sanitization function to use
            displayName: isAnonymous ? 'Anonymous' : user?.fullName || 'User',
            // Add authorId for isOwnPost comparison
            authorId: userId,
        };

        // Sanitize before returning - removes userEmail, authorId, etc.
        const safeDoubt = sanitizeDoubt(doubtWithDetails, userId);

        return NextResponse.json(safeDoubt);

    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const doubtId = parseInt(id, 10);

        if (isNaN(doubtId)) {
            return NextResponse.json({ error: "Invalid doubt ID" }, { status: 400 });
        }

        const user = await currentUser();
        const email = user?.primaryEmailAddress?.emailAddress ?? null;
        const userId = user?.id ?? null;

        if (!email || !userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch the doubt first to verify ownership and permissions
        const [doubt] = await db
            .select()
            .from(doubtsTable)
            .where(eq(doubtsTable.id, doubtId))
            .limit(1);

        if (!doubt) {
            return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
        }

        // Authorization check - compare server-side, never expose author email to client
        let isAuthorized = doubt.userEmail === email;

        if (!isAuthorized && doubt.classroomId) {
            try {
                const membership = await requireMembership(email, doubt.classroomId);
                const isTeacher = ["teacher", "owner", "admin"].includes(membership.role.toLowerCase());
                if (isTeacher) {
                    isAuthorized = true;
                }
            } catch (err) {
                isAuthorized = false;
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await db.delete(doubtsTable).where(eq(doubtsTable.id, doubtId));

        return NextResponse.json({ success: true });

    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}