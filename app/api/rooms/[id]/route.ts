import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { classroomsTable, membershipsTable } from '@/configs/schema';
import { eq, and } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import { checkUserBlock } from '@/lib/auth-utils';
import { buildErrorResponse } from '@/lib/error-handler';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = user.primaryEmailAddress.emailAddress;

        // 0. Check if user is blocked
        const { isBlocked, errorResponse } = await checkUserBlock(email);
        if (isBlocked) return errorResponse;
        const { id } = await params;
        const roomId = parseInt(id);

        if (isNaN(roomId)) {
            return NextResponse.json({ error: 'Invalid room ID' }, { status: 400 });
        }

        // Optimised query: Fetch classroom and membership in a single join
        const [roomData] = await db
            .select({
                id: classroomsTable.id,
                name: classroomsTable.name,
                university: classroomsTable.university,
                year: classroomsTable.year,
                teacherEmail: classroomsTable.teacherEmail,
                inviteCode: classroomsTable.inviteCode,
                role: membershipsTable.role,
            })
            .from(classroomsTable)
            .innerJoin(
                membershipsTable,
                and(eq(membershipsTable.classroomId, classroomsTable.id), eq(membershipsTable.userEmail, email))
            )
            .where(eq(classroomsTable.id, roomId));

        if (!roomData) {
            return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 });
        }

        return NextResponse.json(roomData);
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
