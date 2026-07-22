import { eq, and, gte, sql } from "drizzle-orm";
import { db } from "@/configs/db";
import { classroomsTable, membershipsTable, notificationsTable } from "@/configs/schema";
import { publishNotification, type NotificationRecord } from "@/lib/notifications/realtime";

export type NotificationInput = {
    userEmail: string;
    title: string;
    message: string;
    link: string | null;
    type: string;
};

export async function createNotifications(inputs: NotificationInput[]) {
    if (inputs.length === 0) {
        return [] as NotificationRecord[];
    }

    const created = await db.insert(notificationsTable).values(inputs).returning();

    for (const notification of created) {
        publishNotification(notification);
    }

    return created;
}

export async function createClassroomDoubtNotifications(params: {
    classroomId: number;
    doubtId: number;
    subject: string;
    authorEmail: string;
    authorName: string;
    doubtType: string;
}) {
    const { classroomId, doubtId, subject, authorEmail, authorName, doubtType } = params;

    const [room] = await db.select().from(classroomsTable).where(eq(classroomsTable.id, classroomId)).limit(1);
    if (!room) {
        return [] as NotificationRecord[];
    }

    const memberRows = await db
        .select({ userEmail: membershipsTable.userEmail })
        .from(membershipsTable)
        .where(eq(membershipsTable.classroomId, classroomId));

    const recipients = new Set<string>(memberRows.map((row) => row.userEmail));
    if (room.teacherEmail) {
        recipients.add(room.teacherEmail);
    }
    recipients.delete(authorEmail);

    const notifications = Array.from(recipients)
        .filter(Boolean)
        .map((userEmail) => ({
            userEmail,
            title: `New doubt in ${room.name}`,
            message: `${authorName} posted ${subject ? `a ${subject} doubt` : "a new doubt"} in ${room.name}.`,
            link: `/doubts/${doubtId}`,
            type: "classroom_doubt",
        }));

    return createNotifications(notifications);
}

export async function createReplyNotification(params: {
    doubtId: number;
    replyId: number;
    doubtOwnerEmail: string | null;
    replierEmail: string;
    doubtTitle: string;
    replierName: string;
    replyContent: string;
    classroomId: number | null;
    doubtType: string;
}) {
    const { doubtId, replyId, doubtOwnerEmail, replierEmail, doubtTitle, replierName, replyContent, classroomId, doubtType } = params;

    if (!doubtOwnerEmail) {
        return [] as NotificationRecord[];
    }

    if (replierEmail === doubtOwnerEmail) {
        return [] as NotificationRecord[];
    }

    const preview = replyContent?.trim() || "Open the thread to read the reply.";

    const link = `/doubts/${doubtId}`;

    return createNotifications([
        {
            userEmail: doubtOwnerEmail,
            title: `New reply on ${doubtTitle}`,
            message: `${replierName} replied: ${preview.slice(0, 120)}`,
            link,
            type: "doubt_reply",
        },
    ]);
}
// ── Urgent classroom alerts (issue #540) ──────────────────────────────────
// Notifies a classroom's teacher of urgent conditions (unresolved spike,
// stale doubt, auto-hidden flagged content), with a cooldown per
// classroom+type so repeated cron runs don't spam the same alert.
export async function createUrgentClassroomAlert(params: {
    teacherEmail: string;
    classroomId: number;
    type: string;
    title: string;
    message: string;
    link: string;
    cooldownMs: number;
}): Promise<boolean> {
    const { teacherEmail, type, title, message, link, cooldownMs } = params;
    const cutoff = new Date(Date.now() - cooldownMs);

    return db.transaction(async (tx) => {
        // Serialize concurrent calls for the same (teacherEmail, type, link) so
        // overlapping cron runs can't both pass the cooldown check before either
        // inserts (TOCTOU race).
        await tx.execute(
            sql`select pg_advisory_xact_lock(hashtext(${teacherEmail} || ${type} || ${link}))`,
        );

        const [recent] = await tx
            .select({ id: notificationsTable.id })
            .from(notificationsTable)
            .where(
                and(
                    eq(notificationsTable.userEmail, teacherEmail),
                    eq(notificationsTable.type, type),
                    eq(notificationsTable.link, link),
                    gte(notificationsTable.createdAt, cutoff),
                ),
            )
            .limit(1);

        if (recent) {
            return false;
        }

        await tx.insert(notificationsTable).values({ userEmail: teacherEmail, title, message, link, type });
        return true;
    });
}