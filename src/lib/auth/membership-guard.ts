export const ROLE_HIERARCHY = {
  owner: 5,
  admin: 5,
  teacher: 4,
  "co-teacher": 3,
  moderator: 2,
  student: 1,
} as const;

export function hasRole(role: string, required: string) {
  if (!(role in ROLE_HIERARCHY) || !(required in ROLE_HIERARCHY)) {
    return false;
  }

  return (
    ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY] >=
    ROLE_HIERARCHY[required as keyof typeof ROLE_HIERARCHY]
  );
}

export function canModerate(role: string) {
  return hasRole(role, "moderator");
}

export function canTeach(role: string) {
  return hasRole(role, "teacher");
}

import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/configs/db";
import { classroomsTable, membershipsTable } from "@/configs/schema";
import { ApiError } from "@/lib/errors/error-handler";

const TEACHER_ROLES = new Set(["teacher", "owner", "admin"]);

export type AuthenticatedUser = NonNullable<
    Awaited<ReturnType<typeof currentUser>>
>;

export type ClassroomMembership = {
    role: string;
};

export type AuthenticatedContext = {
    user: AuthenticatedUser;
    email: string;
};

export async function getOptionalAuth(): Promise<AuthenticatedContext | null> {
    const user = await currentUser();

    if (!user) {
        return null;
    }

    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
        throw new ApiError(401, "Unauthorized");
    }

    return { user, email };
}

export async function requireAuth(): Promise<AuthenticatedContext> {
    const auth = await getOptionalAuth();

    if (!auth) {
        throw new ApiError(401, "Unauthorized");
    }

    return auth;
}

export function parseClassroomId(value: unknown): number {
    const classroomId = typeof value === "number"
        ? value
        : typeof value === "string" && /^[1-9]\d*$/.test(value)
          ? Number(value)
          : Number.NaN;

    if (!Number.isSafeInteger(classroomId) || classroomId <= 0) {
        throw new ApiError(400, "Invalid classroom ID");
    }

    return classroomId;
}

export function parseOptionalClassroomId(value: unknown): number | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    return parseClassroomId(value);
}

export async function requireMembership(
    email: string,
    classroomId: number,
): Promise<ClassroomMembership> {
    const [membership] = await db
        .select({ role: membershipsTable.role })
        .from(membershipsTable)
        .where(
            and(
                eq(membershipsTable.userEmail, email),
                eq(membershipsTable.classroomId, classroomId),
            ),
        );

    if (!membership) {
        const [ownedClassroom] = await db
            .select({ teacherEmail: classroomsTable.teacherEmail })
            .from(classroomsTable)
            .where(
                and(
                    eq(classroomsTable.id, classroomId),
                    eq(classroomsTable.teacherEmail, email),
                ),
            );

        if (ownedClassroom) {
            return { role: "owner" };
        }

        throw new ApiError(403, "Access denied to this classroom");
    }

    return membership;
}

export async function requireTeacher(
    email: string,
    classroomId: number,
): Promise<ClassroomMembership> {
    const membership = await requireMembership(email, classroomId);

    if (!TEACHER_ROLES.has(membership.role)) {
        throw new ApiError(403, "Forbidden: teacher access required");
    }

    return membership;
}
