import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { membershipsTable } from '@/configs/schema';
import { eq, count, asc } from 'drizzle-orm';
import { checkUserBlock } from '@/lib/auth-utils';
import { buildErrorResponse } from '@/lib/error-handler';
import {
    parseClassroomId,
    requireAuth,
    requireMembership,
} from '@/lib/auth/membership-guard';

const PRIVILEGED_MEMBER_ROLES = new Set(['teacher', 'admin', 'owner']);

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
        const processedMembers = canViewEmails
            ? members.map(({ id, ...m }) => m)
            : members.map((m) => ({
                displayName: `${m.role.toLowerCase() === 'student' ? 'Student' : 'Member'}_${m.id}`,
                role: m.role,
                joinedAt: m.joinedAt,
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
