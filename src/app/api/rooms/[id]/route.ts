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
                inviteCodeExpiresAt: classroomsTable.inviteCodeExpiresAt,
                allowedEmailDomains: classroomsTable.allowedEmailDomains,
                pedagogyLevel: classroomsTable.pedagogyLevel,
                targetGradeLevel: classroomsTable.targetGradeLevel,
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

export async function PATCH(
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

        // Verify the user is the teacher of this classroom
        const [classroom] = await db
            .select()
            .from(classroomsTable)
            .where(and(eq(classroomsTable.id, roomId), eq(classroomsTable.teacherEmail, email)));

        if (!classroom) {
            return NextResponse.json({ error: 'Forbidden: only the teacher can modify this classroom' }, { status: 403 });
        }

        const body = await req.json();
        const updateData: Record<string, unknown> = {};

        if (body.pedagogyLevel !== undefined) {
            updateData.pedagogyLevel = body.pedagogyLevel;
        }
        if (body.targetGradeLevel !== undefined) {
            updateData.targetGradeLevel = parseInt(body.targetGradeLevel.toString());
        }
        if (body.inviteCodeExpiresAt !== undefined) {
            updateData.inviteCodeExpiresAt = body.inviteCodeExpiresAt
                ? new Date(body.inviteCodeExpiresAt)
                : null;
        }
        if (body.allowedEmailDomains !== undefined) {
            updateData.allowedEmailDomains = body.allowedEmailDomains;
        }
        if (body.regenerateInviteCode) {
            updateData.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        }

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const [updatedRoom] = await db
            .update(classroomsTable)
            .set(updateData)
            .where(eq(classroomsTable.id, roomId))
            .returning();

        return NextResponse.json(updatedRoom);
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
