// src/app/api/inngest/UrgentActivityDetector.ts
// Detects classroom conditions that need a teacher's immediate attention:
// - Too many unresolved doubts piling up
// - A doubt that's gone unanswered for too long
// - Content that got auto-hidden due to flags
// Each condition notifies the classroom's teacher, with a per-classroom,
// per-alert-type cooldown so the 15-minute cron doesn't spam.
import { inngest } from "@/inngest/client";
import { db } from "@/configs/db";
import { classroomsTable, doubtsTable } from "@/configs/schema";
import { and, eq, isNull, ne, or, asc, count, lt, sql } from "drizzle-orm";
import { createUrgentClassroomAlert } from "@/lib/notifications/service";

const UNRESOLVED_THRESHOLD = 10;
const STALE_MS = 72 * 60 * 60 * 1000; // 72 hours
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours per classroom+type

interface InngestEvent {
    data: Record<string, unknown>;
}

type InngestStep = {
    run: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
};

export const checkUrgentClassroomActivity = inngest.createFunction(
    { id: "check-urgent-classroom-activity", triggers: [{ cron: "*/15 * * * *" }] },
    async ({ step }: { step: InngestStep }) => {
        const classrooms = await step.run("fetch-classrooms", async () => {
            return db
                .select({ id: classroomsTable.id, teacherEmail: classroomsTable.teacherEmail, name: classroomsTable.name })
                .from(classroomsTable);
        });

        // ── Batch fetch both signals in 2 queries total instead of 2 per classroom ──
        const staleCutoff = new Date(Date.now() - STALE_MS);

        const { unresolvedCounts, staleDoubts } = await step.run("fetch-activity-signals", async () => {
            const unresolvedRows = await db
                .select({ classroomId: doubtsTable.classroomId, value: count() })
                .from(doubtsTable)
                .where(
                    and(
                        or(ne(doubtsTable.isSolved, "solved"), isNull(doubtsTable.isSolved)),
                        eq(doubtsTable.isHidden, false),
                        isNull(doubtsTable.deletedAt),
                    ),
                )
                .groupBy(doubtsTable.classroomId);

            const staleResult = await db.execute<{ classroomId: number; id: number; subject: string | null; createdAt: string }>(sql`
                select distinct on (${doubtsTable.classroomId})
                    ${doubtsTable.classroomId} as "classroomId",
                    ${doubtsTable.id} as "id",
                    ${doubtsTable.subject} as "subject",
                    ${doubtsTable.createdAt} as "createdAt"
                from ${doubtsTable}
                where (${doubtsTable.isSolved} is distinct from 'solved')
                    and ${doubtsTable.isHidden} = false
                    and ${doubtsTable.deletedAt} is null
                    and ${doubtsTable.createdAt} < ${staleCutoff}
                order by ${doubtsTable.classroomId}, ${doubtsTable.createdAt} asc
            `);

            return {
                unresolvedCounts: unresolvedRows.map((row) => [row.classroomId, row.value] as const),
                staleDoubts: staleResult.rows.map((row) => [row.classroomId, row] as const),
            };
        });

        const unresolvedByClassroom = new Map(unresolvedCounts);
        const staleByClassroom = new Map(staleDoubts);

        let alertsCreated = 0;

        for (const classroom of classrooms) {
            const result = await step.run(`check-classroom-${classroom.id}`, async () => {
                if (!classroom.teacherEmail) return { created: 0 };

                let created = 0;

                // ── Condition 1: too many unresolved doubts ──────────────────
                const unresolvedCount = unresolvedByClassroom.get(classroom.id) ?? 0;

                if (unresolvedCount > UNRESOLVED_THRESHOLD) {
                    const sent = await createUrgentClassroomAlert({
                        teacherEmail: classroom.teacherEmail,
                        classroomId: classroom.id,
                        type: "urgent_unresolved_spike",
                        title: `${unresolvedCount} unresolved doubts in ${classroom.name}`,
                        message: `${classroom.name} has ${unresolvedCount} open doubts — more than students should be waiting on.`,
                        link: `/dashboard/teacher?classroomId=${classroom.id}`,
                        cooldownMs: ALERT_COOLDOWN_MS,
                    });
                    if (sent) created++;
                }

                // ── Condition 2: a doubt has gone stale ───────────────────────
                const staleDoubt = staleByClassroom.get(classroom.id);

                if (staleDoubt) {
                    const sent = await createUrgentClassroomAlert({
                        teacherEmail: classroom.teacherEmail,
                        classroomId: classroom.id,
                        type: "urgent_stale_doubt",
                        title: `A doubt in ${classroom.name} has waited 72h+`,
                        message: `A ${staleDoubt.subject || "student"} doubt has been unresolved for over 3 days.`,
                        link: `/dashboard/teacher?classroomId=${classroom.id}`,
                        cooldownMs: ALERT_COOLDOWN_MS,
                    });
                    if (sent) created++;
                }

                return { created };
            });

            alertsCreated += result.created;
        }

        return { classroomsChecked: classrooms.length, alertsCreated };
    },
);

// Fired directly from the flag route the moment a doubt is auto-hidden —
// more immediate and precise than waiting for the next cron pass.
export const notifyFlaggedContentHidden = inngest.createFunction(
    { id: "notify-flagged-content-hidden", triggers: [{ event: "doubt/auto-hidden" }] },
    async ({ event, step }: { event: InngestEvent; step: InngestStep }) => {
        const { doubtId, classroomId } = event.data as { doubtId?: number; classroomId?: number };

        if (!doubtId || !classroomId) {
            return { skipped: "Missing doubtId or classroomId" };
        }

        const result = await step.run("notify-teacher", async () => {
            const [classroom] = await db
                .select({ teacherEmail: classroomsTable.teacherEmail, name: classroomsTable.name })
                .from(classroomsTable)
                .where(eq(classroomsTable.id, classroomId))
                .limit(1);

            if (!classroom?.teacherEmail) return { sent: false };

            const sent = await createUrgentClassroomAlert({
                teacherEmail: classroom.teacherEmail,
                classroomId,
                type: "urgent_flagged_content",
                title: `Content auto-hidden in ${classroom.name}`,
                message: "A doubt was automatically hidden after multiple flags and needs review.",
                link: `/dashboard/teacher?classroomId=${classroomId}`,
                cooldownMs: ALERT_COOLDOWN_MS,
            });

            return { sent };
        });

        return result;
    },
);
