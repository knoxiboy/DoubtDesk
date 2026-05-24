/**
 * Doubt status taxonomy.
 *
 * Doubts move through three states:
 *   - `unsolved`    : initial state when a doubt is posted.
 *   - `in-progress` : someone has replied but the doubt has not been marked solved by the owner or a teacher yet.
 *   - `solved`      : explicitly marked solved by the owner (or a teacher, subject to the rules in `app/api/doubts/action/[id]`).
 *
 * The transition rules live in two places:
 *   - `app/api/replies/route.ts`           - auto-transition unsolved → in-progress
 *                                            on the first reply (any reply type,
 *                                            except for AI-typed doubts).
 *   - `app/api/doubts/action/[id]/route.ts` - manual transitions via the
 *                                            "solve" action (owner / teacher).
 *
 * Status never auto-downgrades: `solved` is sticky and only an explicit action can move it back to `unsolved`.
 *
 * The underlying column is `doubtsTable.isSolved varchar(20)` - the name
 * is preserved for backwards compatibility with the existing API surface
 * and the analytics aggregation in `app/api/analytics/route.ts`.
 */
export const DOUBT_STATUS = {
    UNSOLVED: "unsolved",
    IN_PROGRESS: "in-progress",
    SOLVED: "solved",
} as const;

export type DoubtStatus = typeof DOUBT_STATUS[keyof typeof DOUBT_STATUS];

export const ALL_DOUBT_STATUSES: DoubtStatus[] = [
    DOUBT_STATUS.UNSOLVED,
    DOUBT_STATUS.IN_PROGRESS,
    DOUBT_STATUS.SOLVED,
];

/** Type-guard for values coming from the wire (request body, query param, db read). */
export function isValidDoubtStatus(value: unknown): value is DoubtStatus {
    return (
        value === DOUBT_STATUS.UNSOLVED ||
        value === DOUBT_STATUS.IN_PROGRESS ||
        value === DOUBT_STATUS.SOLVED
    );
}

/** Convenience: anything that is not `solved` is considered "open". */
export function isOpen(status: unknown): boolean {
    return status === DOUBT_STATUS.UNSOLVED || status === DOUBT_STATUS.IN_PROGRESS;
}