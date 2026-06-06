import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/configs/db";
import {
  classroomInvitesTable,
  classroomsTable,
  membershipsTable,
} from "@/configs/schema";
import { checkUserBlock } from "@/lib/auth-utils";
import { buildErrorResponse } from "@/lib/error-handler";
import { hashInviteToken } from "@/lib/invite-token";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const user = await currentUser();
    if (!user || !user.primaryEmailAddress?.emailAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = user.primaryEmailAddress.emailAddress;

    const { isBlocked, errorResponse } = await checkUserBlock(email);
    if (isBlocked) return errorResponse;

    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Invalid invite link" },
        { status: 400 },
      );
    }

    const tokenHash = hashInviteToken(token);

    const [inviteData] = await db
      .select({
        inviteId: classroomInvitesTable.id,
        classroomId: classroomInvitesTable.classroomId,
        expiresAt: classroomInvitesTable.expiresAt,
        revokedAt: classroomInvitesTable.revokedAt,
        usedCount: classroomInvitesTable.usedCount,
        maxUses: classroomInvitesTable.maxUses,
        classroomName: classroomsTable.name,
        university: classroomsTable.university,
        year: classroomsTable.year,
      })
      .from(classroomInvitesTable)
      .innerJoin(
        classroomsTable,
        eq(classroomsTable.id, classroomInvitesTable.classroomId),
      )
      .where(eq(classroomInvitesTable.tokenHash, tokenHash));

    if (!inviteData) {
      return NextResponse.json(
        { error: "Invalid invite link" },
        { status: 404 },
      );
    }

    if (inviteData.revokedAt) {
      return NextResponse.json(
        { error: "This invite link has been revoked" },
        { status: 410 },
      );
    }

    if (new Date(inviteData.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This invite link has expired" },
        { status: 410 },
      );
    }

    if (
      inviteData.maxUses !== null &&
      inviteData.usedCount >= inviteData.maxUses
    ) {
      return NextResponse.json(
        { error: "This invite link has reached its usage limit" },
        { status: 410 },
      );
    }

    const [existingMember] = await db
      .select()
      .from(membershipsTable)
      .where(
        and(
          eq(membershipsTable.userEmail, email),
          eq(membershipsTable.classroomId, inviteData.classroomId),
        ),
      );

    if (existingMember) {
      return NextResponse.json({
        success: true,
        alreadyMember: true,
        classroom: {
          id: inviteData.classroomId,
          name: inviteData.classroomName,
          university: inviteData.university,
          year: inviteData.year,
        },
      });
    }

    await db.insert(membershipsTable).values({
      userEmail: email,
      classroomId: inviteData.classroomId,
      role: "student",
    });

    await db
      .update(classroomInvitesTable)
      .set({
        usedCount: sql`${classroomInvitesTable.usedCount} + 1`,
      })
      .where(eq(classroomInvitesTable.id, inviteData.inviteId));

    return NextResponse.json({
      success: true,
      classroom: {
        id: inviteData.classroomId,
        name: inviteData.classroomName,
        university: inviteData.university,
        year: inviteData.year,
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
