import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { membershipsTable } from '@/configs/schema';
import { eq, and, count } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import { checkUserBlock } from '@/lib/auth-utils';
import { buildErrorResponse } from '@/lib/error-handler';

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

        const classroomId = Number(classroomIdStr);
        const page = Math.max(Number(searchParams.get('page')) || 1, 1);
        const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100);
        const offset = (page - 1) * limit;
        
        // Security: Check if requesting user is a member of this classroom
       const [membership] = await db
            .select()
            .from(membershipsTable)
            .where(
                and(
                    eq(membershipsTable.userEmail, email),
                    eq(membershipsTable.classroomId, classroomId)
                )
            );

        if (!membership) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

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

        return NextResponse.json({
            members,
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