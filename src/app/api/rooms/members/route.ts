import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { membershipsTable } from '@/configs/schema';
import { eq, and } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import { checkUserBlock } from '@/lib/auth-utils';
import { buildErrorResponse } from '@/lib/error-handler';

const PRIVILEGED_MEMBER_ROLES = new Set(['teacher', 'admin']);

function canViewMemberEmails(role: string) {
    return PRIVILEGED_MEMBER_ROLES.has(role.toLowerCase());
}

export async function GET(req: Request) {
    try {
        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = user.primaryEmailAddress.emailAddress;

        // 0. Check if user is blocked
        const { isBlocked, errorResponse } = await checkUserBlock(email);
        if (isBlocked) return errorResponse;
        const { searchParams } = new URL(req.url);
        const classroomIdStr = searchParams.get('classroomId');

        if (!classroomIdStr) {
            return NextResponse.json({ error: 'Classroom ID is required' }, { status: 400 });
        }

        const classroomId = parseInt(classroomIdStr);

        // Security: Check if requesting user is a member of this classroom
        const [membership] = await db
            .select()
            .from(membershipsTable)
            .where(and(eq(membershipsTable.userEmail, email), eq(membershipsTable.classroomId, classroomId)));

        if (!membership) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Fetch all members of this classroom
        const members = await db
            .select({
                id: membershipsTable.id,
                userEmail: membershipsTable.userEmail,
                role: membershipsTable.role,
                joinedAt: membershipsTable.joinedAt,
            })
            .from(membershipsTable)
            .where(eq(membershipsTable.classroomId, classroomId));

        if (canViewMemberEmails(membership.role)) {
            return NextResponse.json(members.map(({ id, ...member }) => member));
        }

        const safeMembers = members.map((member) => ({
            displayName: `${member.role === 'student' ? 'Student' : 'Member'}_${member.id}`,
            role: member.role,
            joinedAt: member.joinedAt,
        }));

        return NextResponse.json(safeMembers);
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
