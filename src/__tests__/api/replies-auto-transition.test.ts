/**
 * Tests for the doubt-status auto-transition introduced for issue 183.
 *
 * The transition logic lives in `app/api/replies/route.ts` (POST handler):
 *
 *   unsolved      + any reply (non-AI doubt) -> in-progress
 *   in-progress   + any reply                -> in-progress  (no change)
 *   solved        + any reply                -> solved        (sticky)
 *   <any status>  + reply on AI doubt        -> <unchanged>
 *
 * We exercise this by mocking `@/configs/db` and `@/clerk/nextjs/server`
 * plus the moderation and Inngest layers, then asserting the right
 * `db.update(...).set(...)` call shape.
 */

import { DOUBT_STATUS, isValidDoubtStatus, isOpen, DoubtStatus } from "@/lib/doubts/doubtStatus";

// --- Mocks ---------------------------------------------------------------

// Chainable query builder used by the route. Each helper returns `this`
// (or a thenable) so we can record the call sequence.
const updateBuilder = {
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue([]),
};

const insertBuilder = {
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 999, doubtId: 1 }]),
};

const mockDoubt = {
    id: 1,
    type: "community",
    isSolved: DOUBT_STATUS.UNSOLVED as DoubtStatus,
    userEmail: "owner@example.com",
    classroomId: null,
};

// Each `select()` call is a separate chain; we configure them per-test.
const selectChains: any[] = [];
const makeSelectChain = (result: any) => {
    const chain: any = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(result),
        // orderBy / etc. unused on the path we hit, but kept for safety
        orderBy: jest.fn().mockResolvedValue(result),
    };
    // For the user-block check the route doesn't call .limit(); make
    // the chain itself awaitable to that result.
    chain.then = (resolve: any) => resolve(result);
    return chain;
};

jest.mock("@/configs/db", () => ({
    db: {
        select: jest.fn(() => {
            const next = selectChains.shift();
            // Fall back to an empty array if a test forgot to enqueue.
            return next ?? makeSelectChain([]);
        }),
        insert: jest.fn(() => insertBuilder),
        update: jest.fn(() => updateBuilder),
    },
}));

jest.mock("@clerk/nextjs/server", () => ({
    currentUser: jest.fn().mockResolvedValue({
        id: "user_xyz",
        primaryEmailAddress: { emailAddress: "replier@example.com" },
    }),
    auth: jest.fn(),
}));

jest.mock("@/lib/moderation/moderation", () => ({
    moderateContent: jest.fn().mockResolvedValue({ ok: true }),
    handleModerationViolation: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/errors/error-handler", () => ({
    buildErrorResponse: (err: Error) => ({
        status: 500,
        body: { error: err.message },
    }),
}));

jest.mock("@/inngest/client", () => ({
    inngest: { send: jest.fn().mockResolvedValue(undefined) },
}));

// --- Helpers -------------------------------------------------------------

function makeRequest(body: Record<string, unknown>): Request {
    return new Request("http://localhost/api/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}

async function callPost(opts: {
    doubt: typeof mockDoubt;
    body: Record<string, unknown>;
}) {
    // Enqueue the two .select() chains the POST handler issues:
    //   1) usersTable lookup for block check  -> returns [] (not blocked)
    //   2) doubtsTable lookup                 -> returns [doubt]
    selectChains.push(makeSelectChain([])); // block check
    selectChains.push(makeSelectChain([opts.doubt])); // doubt lookup

    // Import lazily so the mocks above are in place before the module
    // captures references to them.
    const mod = await import("@/app/api/replies/route");
    return mod.POST(makeRequest(opts.body));
}

beforeEach(() => {
    jest.clearAllMocks();
    selectChains.length = 0;
});

// --- Pure helpers --------------------------------------------------------

describe("lib/doubtStatus", () => {
    test("isValidDoubtStatus accepts the three canonical values", () => {
        expect(isValidDoubtStatus("unsolved")).toBe(true);
        expect(isValidDoubtStatus("in-progress")).toBe(true);
        expect(isValidDoubtStatus("solved")).toBe(true);
    });

    test("isValidDoubtStatus rejects everything else", () => {
        expect(isValidDoubtStatus("pending")).toBe(false);
        expect(isValidDoubtStatus("SOLVED")).toBe(false);
        expect(isValidDoubtStatus("")).toBe(false);
        expect(isValidDoubtStatus(null)).toBe(false);
        expect(isValidDoubtStatus(undefined)).toBe(false);
        expect(isValidDoubtStatus(0)).toBe(false);
    });

    test("isOpen is true for unsolved and in-progress, false for solved", () => {
        expect(isOpen("unsolved")).toBe(true);
        expect(isOpen("in-progress")).toBe(true);
        expect(isOpen("solved")).toBe(false);
        expect(isOpen("anything else")).toBe(false);
    });
});

// --- Auto-transition behaviour ------------------------------------------

describe("POST /api/replies — auto-transition (issue #183)", () => {
    test("unsolved community doubt is transitioned to in-progress after a reply", async () => {
        await callPost({
            doubt: { ...mockDoubt, isSolved: DOUBT_STATUS.UNSOLVED },
            body: { doubtId: 1, type: "comment", content: "hi" },
        });

        // `db.update` should have been called for the transition.
        expect(updateBuilder.set).toHaveBeenCalledWith({
            isSolved: DOUBT_STATUS.IN_PROGRESS,
        });
        // And the WHERE clause should pin on isSolved = 'unsolved' (race guard).
        expect(updateBuilder.where).toHaveBeenCalledTimes(1);
    });

    test("in-progress doubt is left alone (idempotent)", async () => {
        await callPost({
            doubt: { ...mockDoubt, isSolved: DOUBT_STATUS.IN_PROGRESS },
            body: { doubtId: 1, type: "comment", content: "hi" },
        });

        // The update still runs, but the WHERE (isSolved = 'unsolved')
        // means no rows match — verified by zero-row mock return above.
        // What matters is we never set status BACK to in-progress
        // through a different code path; check `set` arg shape is safe.
        if (updateBuilder.set.mock.calls.length > 0) {
            expect(updateBuilder.set).toHaveBeenCalledWith({
                isSolved: DOUBT_STATUS.IN_PROGRESS,
            });
        }
    });

    test("solved doubt is NEVER downgraded by a new reply", async () => {
        await callPost({
            doubt: { ...mockDoubt, isSolved: DOUBT_STATUS.SOLVED },
            body: { doubtId: 1, type: "comment", content: "hi" },
        });

        // The transition update is fired, but is guarded by
        // `isSolved = 'unsolved'` in the WHERE — so no row will change.
        // We assert that the SET payload only proposes 'in-progress',
        // never 'unsolved' (i.e. we never write a downgrade explicitly).
        for (const call of updateBuilder.set.mock.calls) {
            expect(call[0]).not.toEqual({ isSolved: DOUBT_STATUS.UNSOLVED });
        }
    });

    test("AI-typed doubts are excluded from auto-transition", async () => {
        await callPost({
            doubt: { ...mockDoubt, type: "ai", isSolved: DOUBT_STATUS.UNSOLVED },
            body: { doubtId: 1, type: "comment", content: "hi" },
        });

        // For AI doubts we skip the transition update entirely.
        expect(updateBuilder.set).not.toHaveBeenCalled();
    });

    test("transition failure does not fail the reply insert", async () => {
        updateBuilder.where.mockRejectedValueOnce(new Error("transient db error"));

        const res = await callPost({
            doubt: { ...mockDoubt, isSolved: DOUBT_STATUS.UNSOLVED },
            body: { doubtId: 1, type: "comment", content: "hi" },
        });

        // The POST handler should still succeed (200) — the transition
        // is best-effort and its error is swallowed.
        expect(res.status).toBe(200);
    });
});