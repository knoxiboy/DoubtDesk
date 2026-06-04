import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/configs/db";
import {
  classroomInvitesTable,
  classroomsTable,
  membershipsTable,
} from "@/configs/schema";
import { buildErrorResponse } from "@/lib/error-handler";
import { hashInviteToken } from "@/lib/invite-token";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { status: "invalid", error: "Invalid invite link" },
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
        { status: "invalid", error: "Invalid invite link" },
        { status: 404 },
      );
    }

    if (inviteData.revokedAt) {
      return NextResponse.json(
        { status: "revoked", error: "This invite link has been revoked" },
        { status: 410 },
      );
    }

    if (new Date(inviteData.expiresAt) < new Date()) {
      return NextResponse.json(
        { status: "expired", error: "This invite link has expired" },
        { status: 410 },
      );
    }

    if (
      inviteData.maxUses !== null &&
      inviteData.usedCount >= inviteData.maxUses
    ) {
      return NextResponse.json(
        {
          status: "expired",
          error: "This invite link has reached its usage limit",
        },
        { status: 410 },
      );
    }

    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress;

    if (email) {
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
          status: "already-member",
          classroom: {
            id: inviteData.classroomId,
            name: inviteData.classroomName,
            university: inviteData.university,
            year: inviteData.year,
          },
          expiresAt: inviteData.expiresAt,
        });
      }
    }

    return NextResponse.json({
      status: "valid",
      classroom: {
        id: inviteData.classroomId,
        name: inviteData.classroomName,
        university: inviteData.university,
        year: inviteData.year,
      },
      expiresAt: inviteData.expiresAt,
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
