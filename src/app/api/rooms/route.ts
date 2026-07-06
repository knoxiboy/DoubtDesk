import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { classroomsTable, membershipsTable, usersTable, organizationsTable, organizationMembershipsTable } from '@/configs/schema';
import { eq, and, notInArray, isNull } from 'drizzle-orm';
import { currentUser } from '@clerk/nextjs/server';
import { checkUserBlock } from '@/lib/auth-utils';
import { buildErrorResponse, errorResponse } from '@/lib/error-handler';
import { parseAndValidateRequest } from '@/lib/validations/validate';
import { createClassroomSchema } from '@/lib/validations/classroom';
import { Classroom } from '@/types';
import { enforceApiRateLimit } from '@/lib/api-rate-limit';
import { generalLimiter } from '@/lib/ratelimit';

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

        // Fetch classrooms where user is a member, including optional organization details
        const joinedRooms = await db
            .select({
                id: classroomsTable.id,
                organizationId: classroomsTable.organizationId,
                organizationName: organizationsTable.name,
                name: classroomsTable.name,
                university: classroomsTable.university,
                year: classroomsTable.year,
                teacherEmail: classroomsTable.teacherEmail,
                inviteCode: classroomsTable.inviteCode,
                inviteCodeExpiresAt: classroomsTable.inviteCodeExpiresAt,
                allowedEmailDomains: classroomsTable.allowedEmailDomains,
                role: membershipsTable.role,
            })
            .from(classroomsTable)
            .innerJoin(membershipsTable, eq(classroomsTable.id, membershipsTable.classroomId))
            .leftJoin(organizationsTable, eq(classroomsTable.organizationId, organizationsTable.id))
            .where(eq(membershipsTable.userEmail, email));

        // Fetch current DB user
        const [dbUser] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, email));

        let recommendedRooms: Classroom[] = [];

        if (dbUser && dbUser.university && dbUser.year) {
            const joinedIds = joinedRooms.map((r: any) => r.id);
            
            let conditions = [
                eq(classroomsTable.university, dbUser.university),
                eq(classroomsTable.year, dbUser.year),
                isNull(classroomsTable.organizationId) // Prevents private tenant metadata leaks
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

// 2. POST: Create a classroom (Teacher Only or Org Admin/Teacher)
export async function POST(req: Request) {
    try {
        const { errorResponse: validationResponse, data } = await parseAndValidateRequest(req, createClassroomSchema);
        if (validationResponse) return validationResponse;

        const { name, year, organizationId } = data;

        const user = await currentUser();
        if (!user || !user.primaryEmailAddress?.emailAddress) {
            return errorResponse('Unauthorized', 401);
        }

        const email = user.primaryEmailAddress.emailAddress;

        const rateLimitResponse = await enforceApiRateLimit(generalLimiter, email, 'general');
        if (rateLimitResponse) return rateLimitResponse;


        // 0. Check if user is blocked
        const { isBlocked, errorResponse: blockErrorResponse } = await checkUserBlock(email);
        if (isBlocked) return blockErrorResponse;

        const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (!dbUser) {
            return errorResponse('Unauthorized: User profile not found', 401);
        }

        // FIXED: Authorize based on scope. Tenant privileges override global privileges.
        if (organizationId) {
            const [orgMembership] = await db
                .select({ role: organizationMembershipsTable.role })
                .from(organizationMembershipsTable)
                .where(and(
                    eq(organizationMembershipsTable.organizationId, organizationId),
                    eq(organizationMembershipsTable.userEmail, email),
                ));

            if (!orgMembership || !['owner', 'admin', 'teacher'].includes(orgMembership.role)) {
                return errorResponse('Forbidden: invalid organization privileges', 403);
            }
        } else {
            // Final check for STANDALONE teacher/admin role in DB
            if (dbUser.role !== 'teacher' && dbUser.role !== 'admin') {
                return errorResponse('Only teachers can create standalone classrooms', 403);
            }
        }

        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        // Transactional insert: create room and then add teacher as member atomically
        const newRoom = await db.transaction(async (tx: any) => {
            const [room] = await tx
                .insert(classroomsTable)
                .values({
                    name,
                    organizationId: organizationId || null,
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