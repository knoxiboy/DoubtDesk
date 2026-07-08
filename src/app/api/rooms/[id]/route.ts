import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { classroomsTable } from '@/configs/schema';
import { eq } from 'drizzle-orm';
import { checkUserBlock } from '@/lib/auth/auth-utils';
import { buildErrorResponse } from '@/lib/errors/error-handler';
import {
    parseClassroomId,
    requireAuth,
    requireMembership,
    requireTeacher,
} from '@/lib/auth/membership-guard';

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { email } = await requireAuth();

        // 0. Check if user is blocked
        const { isBlocked, errorResponse } = await checkUserBlock(email);
        if (isBlocked) return errorResponse;
        const { id } = await params;
        const roomId = parseClassroomId(id);
        const membership = await requireMembership(email, roomId);

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
            })
            .from(classroomsTable)
            .where(eq(classroomsTable.id, roomId));

        if (!roomData) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        return NextResponse.json({ ...roomData, role: membership.role });
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
        const { email } = await requireAuth();

        // 0. Check if user is blocked
        const { isBlocked, errorResponse } = await checkUserBlock(email);
        if (isBlocked) return errorResponse;

        const { id } = await params;
        const roomId = parseClassroomId(id);
        await requireTeacher(email, roomId);

        const body = await req.json();
        const updateData: Record<string, unknown> = {};

        if (body.pedagogyLevel !== undefined) {
            updateData.pedagogyLevel = body.pedagogyLevel;
        }
        if (body.targetGradeLevel !== undefined) {
            const parsed = parseInt(body.targetGradeLevel.toString());
            if (!Number.isFinite(parsed)) {
                return NextResponse.json({ error: 'Invalid targetGradeLevel' }, { status: 400 });
            }
            updateData.targetGradeLevel = parsed;
        }
        if (body.inviteCodeExpiresAt !== undefined) {
            if (body.inviteCodeExpiresAt === null) {
                updateData.inviteCodeExpiresAt = null;
            } else {
                const parsedDate = new Date(body.inviteCodeExpiresAt);
                if (isNaN(parsedDate.getTime())) {
                    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
                }
                updateData.inviteCodeExpiresAt = parsedDate;
            }
        }
        if (body.allowedEmailDomains !== undefined) {
            updateData.allowedEmailDomains = body.allowedEmailDomains;
        }
        if (body.regenerateInviteCode) {
            updateData.inviteCode = randomBytes(4).toString('hex').toUpperCase().substring(0, 6);
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
