import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/configs/db";
import {
  classroomInvitesTable,
  classroomsTable,
  membershipsTable,
} from "@/configs/schema";
import { checkUserBlock } from "@/lib/auth-utils";
import { buildErrorResponse } from "@/lib/error-handler";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { createClassroomInviteSchema } from "@/lib/validations/classroom";
import {
  generateInviteToken,
  getInviteExpiry,
  hashInviteToken,
} from "@/lib/invite-token";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { errorResponse, data } = await parseAndValidateRequest(
      req,
      createClassroomInviteSchema,
    );
    if (errorResponse) return errorResponse;

    const user = await currentUser();
    if (!user || !user.primaryEmailAddress?.emailAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = user.primaryEmailAddress.emailAddress;

    const { isBlocked, errorResponse: blockErrorResponse } =
      await checkUserBlock(email);
    if (isBlocked) return blockErrorResponse;

    const { id } = await params;
    const classroomId = parseInt(id);

    if (isNaN(classroomId)) {
      return NextResponse.json(
        { error: "Invalid classroom ID" },
        { status: 400 },
      );
    }

    const [classroom] = await db
      .select()
      .from(classroomsTable)
      .where(eq(classroomsTable.id, classroomId));

    if (!classroom) {
      return NextResponse.json(
        { error: "Classroom not found" },
        { status: 404 },
      );
    }

    const [teacherMembership] = await db
      .select()
      .from(membershipsTable)
      .where(
        and(
          eq(membershipsTable.userEmail, email),
          eq(membershipsTable.classroomId, classroomId),
          eq(membershipsTable.role, "teacher"),
        ),
      );

    if (classroom.teacherEmail !== email && !teacherMembership) {
      return NextResponse.json(
        {
          error:
            "Forbidden: only the classroom teacher can generate invite links",
        },
        { status: 403 },
      );
    }

    const token = generateInviteToken();
    const tokenHash = hashInviteToken(token);
    const expiresAt = getInviteExpiry(data.expiresInHours);

    const [invite] = await db
      .insert(classroomInvitesTable)
      .values({
        tokenHash,
        classroomId,
        createdBy: email,
        expiresAt,
        maxUses: data.maxUses,
      })
      .returning();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

    return NextResponse.json({
      success: true,
      inviteUrl: `${baseUrl}/join/${token}`,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
