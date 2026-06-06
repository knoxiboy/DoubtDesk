import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { membershipsTable } from '@/configs/schema';
import { eq, count } from 'drizzle-orm';
import { checkUserBlock } from '@/lib/auth-utils';
import { buildErrorResponse } from '@/lib/error-handler';
import {
    parseClassroomId,
    requireAuth,
    requireMembership,
} from '@/lib/auth/membership-guard';

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

        const total = totalMembersResult[0].count;

        
        // Fetch paginated members of this classroom
        const members = await db
            .select({
                userEmail: membershipsTable.userEmail,
                role: membershipsTable.role,
                joinedAt: membershipsTable.joinedAt,
            })
            .from(membershipsTable)
            .where(eq(membershipsTable.classroomId, classroomId))
            .limit(limit)
            .offset(offset);

        const canViewEmails = ["teacher", "owner", "admin"].includes(membership.role);
        const visibleMembers = canViewEmails
            ? members.map((member) => ({
                userEmail: member.userEmail,
                role: member.role,
                joinedAt: member.joinedAt,
            }))
            : members.map((member, index) => ({
                displayName: `Student_${offset + index + 1}`,
                role: member.role,
                joinedAt: member.joinedAt,
            }));

        return NextResponse.json({
            members: visibleMembers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });

    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
