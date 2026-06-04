import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { classroomsTable, membershipsTable, usersTable } from '@/configs/schema';
import { eq, and } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import { checkUserBlock } from '@/lib/auth-utils';
import { buildErrorResponse } from '@/lib/error-handler';
import { parseAndValidateRequest } from '@/lib/validations/validate';
import { joinClassroomSchema } from '@/lib/validations/classroom';

export async function POST(req: Request) {
    try {
        const { errorResponse, data } = await parseAndValidateRequest(req, joinClassroomSchema);
        if (errorResponse) return errorResponse;

        const { inviteCode } = data;

        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = user.primaryEmailAddress.emailAddress;

        // 0. Check if user is blocked
        const { isBlocked, errorResponse: blockErrorResponse } = await checkUserBlock(email);
        if (isBlocked) return blockErrorResponse;

        // 1. Find the classroom by invite code
        const [classroom] = await db
            .select()
            .from(classroomsTable)
            .where(eq(classroomsTable.inviteCode, inviteCode.toUpperCase()));

        if (!classroom) {
            return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
        }

        // 2. Check if already a member
        const [existingMember] = await db
            .select()
            .from(membershipsTable)
            .where(
                and(eq(membershipsTable.userEmail, email), eq(membershipsTable.classroomId, classroom.id))
            );

        if (existingMember) {
            return NextResponse.json({ error: 'Already a member of this classroom' }, { status: 400 });
        }

        // 3. Get user role to determine membership role
        const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        const role = dbUser?.role || 'student';

        // 4. Add membership (the foreign key ensures referential integrity; the unique
        //    constraint on memberships(userEmail, classroomId) prevents duplicates at the DB level too)
        const [newMembership] = await db.insert(membershipsTable).values({
            userEmail: email,
            classroomId: classroom.id,
            role,
        }).returning();

        return NextResponse.json({
            success: true,
            classroom: {
                id: classroom.id,
                name: classroom.name,
                university: classroom.university,
            },
        });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
