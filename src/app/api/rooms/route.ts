import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { classroomsTable, membershipsTable, usersTable } from '@/configs/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import { checkUserBlock } from '@/lib/auth-utils';
import { buildErrorResponse, errorResponse } from '@/lib/error-handler';
import { parseAndValidateRequest } from '@/lib/validations/validate';
import { createClassroomSchema } from '@/lib/validations/classroom';
import { Classroom } from '@/types';

// 1. GET: List classrooms for the user + Recommendations
export async function GET(req: Request) {
    try {
        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return errorResponse('Unauthorized', 401);
        }

        const email = user.primaryEmailAddress.emailAddress;

        // 0. Check if user is blocked
        const { isBlocked, errorResponse: blockErrorResponse } = await checkUserBlock(email);
        if (isBlocked) return blockErrorResponse;

        // Fetch classrooms where user is a member
        const joinedRooms = await db
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
            .innerJoin(membershipsTable, eq(classroomsTable.id, membershipsTable.classroomId))
            .where(eq(membershipsTable.userEmail, email));

        // Fetch current DB user
const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

let recommendedRooms: Classroom[] = [];

if (dbUser && dbUser.university && dbUser.year) {
    const joinedIds = joinedRooms.map((r) => r.id);
    
    let conditions = [
        eq(classroomsTable.university, dbUser.university),
        eq(classroomsTable.year, dbUser.year)
    ];
    
    if (joinedIds.length > 0) {
        conditions.push(notInArray(classroomsTable.id, joinedIds));
    }

    recommendedRooms = await db
        .select()
        .from(classroomsTable)
        .where(and(...conditions));
}

        return NextResponse.json({
            joined: joinedRooms,
            recommended: recommendedRooms,
        });
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}

// 2. POST: Create a classroom (Teacher Only)
export async function POST(req: Request) {
    try {
        const { errorResponse: validationResponse, data } = await parseAndValidateRequest(req, createClassroomSchema);
        if (validationResponse) return validationResponse;

        const { name, year } = data;

        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return errorResponse('Unauthorized', 401);
        }

        const email = user.primaryEmailAddress.emailAddress;

        // 0. Check if user is blocked
        const { isBlocked, errorResponse: blockErrorResponse } = await checkUserBlock(email);
        if (isBlocked) return blockErrorResponse;

        // Final check for teacher/admin role in DB
        const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (!dbUser || (dbUser.role !== 'teacher' && dbUser.role !== 'admin')) {
            return errorResponse('Only teachers can create classrooms', 403);
        }

        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Transactional insert: create room and then add teacher as member atomically
        const newRoom = await db.transaction(async (tx) => {
            const [room] = await tx
                .insert(classroomsTable)
                .values({
                    name,
                    university: dbUser.university || 'Unspecified',
                    year,
                    teacherEmail: email,
                    inviteCode,
                })
                .returning();

            await tx.insert(membershipsTable).values({
                userEmail: email,
                classroomId: room.id,
                role: 'teacher',
            });

            return room;
        });

        return NextResponse.json(newRoom);
    } catch (error) {
        const { status, body } = buildErrorResponse(error);
        return NextResponse.json(body, { status });
    }
}
