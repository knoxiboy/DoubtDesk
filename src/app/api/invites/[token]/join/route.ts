import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/configs/db";
import {
  classroomInvitesTable,
  classroomsTable,
  membershipsTable,
} from "@/configs/schema";
import { checkUserBlock } from "@/lib/auth/auth-utils";
import { buildErrorResponse } from "@/lib/errors/error-handler";
import { hashInviteToken } from "@/lib/invites/invite-token";

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

    // IMPORTANT: the neon-http driver Drizzle is configured with (see
    // src/configs/db.tsx) does not support interactive transactions —
    // `db.transaction(...)` throws "No transactions support in neon-http
    // driver" unconditionally (confirmed directly against the installed
    // driver). A multi-step insert-then-update-then-compensate sequence
    // would leave a window where a membership row exists without a
    // claimed usage slot if the process died mid-sequence, so instead the
    // slot claim and the membership insert are combined into a single
    // SQL statement using a data-modifying CTE. Postgres executes one
    // statement as one atomic unit on its own — no explicit transaction
    // wrapper or compensation logic is needed, and there's only one
    // network round trip.
    //
    // The CTE claims a usage slot first (UPDATE ... RETURNING id), and
    // the INSERT only runs against rows produced by that CTE (INSERT ...
    // SELECT ... FROM slot_claim), so a membership is *only* ever created
    // when a slot was actually claimed in the same statement. The slot
    // claim itself is additionally guarded by `NOT EXISTS (existing
    // membership)`, so a duplicate concurrent join from the same user
    // can't consume a second slot for a membership that will just
    // conflict away.
    const joinResult = await db.execute(sql`
      WITH slot_claim AS (
        UPDATE ${classroomInvitesTable}
        SET used_count = used_count + 1
        WHERE id = ${inviteData.inviteId}
          AND revoked_at IS NULL
          AND expires_at > now()
          AND (max_uses IS NULL OR used_count < max_uses)
          AND NOT EXISTS (
            SELECT 1 FROM ${membershipsTable}
            WHERE user_email = ${email}
              AND classroom_id = ${inviteData.classroomId}
          )
        RETURNING id
      )
      INSERT INTO ${membershipsTable} (user_email, classroom_id, role)
      SELECT ${email}, ${inviteData.classroomId}, 'student'
      FROM slot_claim
      ON CONFLICT (user_email, classroom_id) DO NOTHING
      RETURNING id AS membership_id
    `);

    if (joinResult.rows.length > 0) {
      // The CTE claimed a slot and inserted the membership atomically.
      return NextResponse.json({
        success: true,
        alreadyMember: false,
        classroom: {
          id: inviteData.classroomId,
          name: inviteData.classroomName,
          university: inviteData.university,
          year: inviteData.year,
        },
      });
    }

    // No row came back: either the slot claim's WHERE clause failed
    // (revoked, expired, or at its usage cap as of this statement), or
    // the user was already a member (NOT EXISTS failed, so no slot was
    // claimed and nothing was inserted) — including a same-user race
    // where a concurrent request's membership committed first. A cheap
    // follow-up read distinguishes the two so the response stays
    // accurate without weakening the atomicity guarantee above, since
    // this read doesn't gate any write.
    const [existingMember] = await db
      .select({ id: membershipsTable.id })
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

    return NextResponse.json(
      { error: "This invite link has reached its usage limit" },
      { status: 410 },
    );
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}