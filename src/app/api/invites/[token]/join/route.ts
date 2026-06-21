import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/configs/db";
import {
  classroomInvitesTable,
  classroomsTable,
  membershipsTable,
} from "@/configs/schema";
import { checkUserBlock } from "@/lib/auth-utils";
import { ApiError, buildErrorResponse } from "@/lib/error-handler";
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

    // NOTE: revokedAt / expiresAt / maxUses were already read above for a
    // cheap, user-friendly early-exit, but none of those checks are
    // re-validated atomically here, a concurrent request could revoke the
    // link or push usedCount to the cap between that read and this write.
    // The transaction below re-checks everything that can change
    // concurrently (membership existence + the usage cap) as part of the
    // same atomic operations that perform the writes, so the final outcome
    // is always correct regardless of request timing.
    const result = await db.transaction(async (tx) => {
      // Conditionally insert membership. If this user is already a member
      // of this classroom (including a duplicate concurrent join request
      // racing this one), the unique (userEmail, classroomId) constraint
      // causes this to no-op instead of throwing, and `returning()` comes
      // back empty so we can detect it.
      const [insertedMembership] = await tx
        .insert(membershipsTable)
        .values({
          userEmail: email,
          classroomId: inviteData.classroomId,
          role: "student",
        })
        .onConflictDoNothing()
        .returning();

      if (!insertedMembership) {
        // Already a member,no new seat consumed, so the invite's usage
        // count must not be incremented.
        return { alreadyMember: true as const };
      }

      // Atomically claim a usage slot: the WHERE clause re-checks
      // revoked/expired/under-cap at the moment of the write (not at the
      // moment of the earlier read), and the increment only commits if a
      // row actually matched. Concurrent requests serialize on this single
      // UPDATE, so only as many can succeed as there are slots remaining.
      const [updatedInvite] = await tx
        .update(classroomInvitesTable)
        .set({
          usedCount: sql`${classroomInvitesTable.usedCount} + 1`,
        })
        .where(
          and(
            eq(classroomInvitesTable.id, inviteData.inviteId),
            isNull(classroomInvitesTable.revokedAt),
            or(
              isNull(classroomInvitesTable.maxUses),
              lt(
                classroomInvitesTable.usedCount,
                classroomInvitesTable.maxUses,
              ),
            ),
          ),
        )
        .returning({ id: classroomInvitesTable.id });

      if (!updatedInvite) {
        // No row matched: the link was revoked or hit its usage cap
        // between our earlier read and this write. Throwing here rolls
        // back the membership insert above so no seat is granted without
        // a valid slot.
        throw new ApiError(
          410,
          "This invite link has reached its usage limit",
        );
      }

      return { alreadyMember: false as const };
    });

    return NextResponse.json({
      success: true,
      alreadyMember: result.alreadyMember,
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
