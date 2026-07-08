import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { classroomsTable, membershipsTable } from '@/configs/schema';
import { eq, count, asc } from 'drizzle-orm';
import { checkUserBlock } from '@/lib/auth/auth-utils';
import { buildErrorResponse } from '@/lib/errors/error-handler';
import {
    parseClassroomId,
    requireAuth,
    requireMembership,
} from '@/lib/auth/membership-guard';

// Roles that may view real member emails. Mirrors the roles the invites
// endpoint already trusts with classroom management access
// (src/app/api/classrooms/[id]/invites/route.ts), plus admin which shares
// the same hierarchy level as owner. "moderator" is defined in ROLE_HIERARCHY
// but currently gates no API endpoint via canModerate(), so it is intentionally
// excluded here until it has enforced privileges elsewhere.
const PRIVILEGED_MEMBER_ROLES = new Set(['teacher', 'co-teacher', 'admin', 'owner']);

function canViewMemberEmails(role: string) {
    return PRIVILEGED_MEMBER_ROLES.has(role.toLowerCase());
}

export async function GET(req: Request) {
    try {
        const { email } = await requireAuth();

        // 0. Check if user is blocked
        const { isBlocked, errorResponse } = await checkUserBlock(email);
        if (isBlocked) return errorResponse;
        const { searchParams } = new URL(req.url);
        const classroomIdStr = searchParams.get('classroomId');

        if (!classroomIdStr) {
            return NextResponse.json({ error: 'Classroom ID is required' }, { status: 400 });
        }

        const classroomId = parseClassroomId(classroomIdStr);
        const page = Math.max(Number(searchParams.get('page')) || 1, 1);
        const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100);
        const offset = (page - 1) * limit;

        const membership = await requireMembership(email, classroomId);

        // The classroom owner is identified by classrooms.teacherEmail, set
        // once at classroom creation and never mutated afterward — this is
        // a more reliable "owner" signal than membership.role, since a
        // membership row's role reflects whatever permissions a member
        // currently holds (which may include other teacher-level members),
        // not specifically who founded the classroom.
        const [classroomData] = await db
            .select({ teacherEmail: classroomsTable.teacherEmail })
            .from(classroomsTable)
            .where(eq(classroomsTable.id, classroomId));

        const ownerEmail = classroomData?.teacherEmail ?? null;

        // Total members count
        const totalMembersResult = await db
            .select({ count: count() })
            .from(membershipsTable)
            .where(eq(membershipsTable.classroomId, classroomId));

        const total = totalMembersResult[0]?.count || 0;

        // Fetch paginated members of this classroom
        const members = await db
            .select({
                id: membershipsTable.id,
                userEmail: membershipsTable.userEmail,
                role: membershipsTable.role,
                joinedAt: membershipsTable.joinedAt,
            })
            .from(membershipsTable)
            .where(eq(membershipsTable.classroomId, classroomId))
            .orderBy(asc(membershipsTable.id))
            .limit(limit)
            .offset(offset);

        const canViewEmails = canViewMemberEmails(membership.role);
        // Normalize both sides before comparing to guard against casing
        // differences that can arise when emails are stored through different
        // code paths without a consistent lowercasing step at write time.
        const normalizedOwnerEmail = ownerEmail?.toLowerCase().trim() ?? null;
        const isOwnerEmail = (email: string) =>
            normalizedOwnerEmail !== null &&
            email.toLowerCase().trim() === normalizedOwnerEmail;

        const processedMembers = canViewEmails
            ? members.map(({ id, ...m }) => ({
                ...m,
                isOwner: isOwnerEmail(m.userEmail),
            }))
            : members.map((m: any) => ({
                displayName: `${m.role.toLowerCase() === 'student' ? 'Student' : 'Member'}_${m.id}`,
                role: m.role,
                joinedAt: m.joinedAt,
                isOwner: isOwnerEmail(m.userEmail),
            }));

        return NextResponse.json({
            members: processedMembers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });

    } catch (error) {
        console.error("Error in GET rooms/members:", error);
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
