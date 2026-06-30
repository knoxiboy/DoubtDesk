import { db } from "@/configs/db";
import { sendDigestEmail } from "@/lib/email";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(),
    delete: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock("@/lib/email", () => ({
  sendDigestEmail: jest.fn(),
}));

// Minimal drizzle-orm stubs
jest.mock("drizzle-orm", () => ({
  eq: jest.fn((_col: unknown, val: unknown) => ({ col: _col, val })),
  inArray: jest.fn((_col: unknown, vals: unknown) => ({ col: _col, vals })),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

type PendingRow = {
  id: number;
  doubtId: number;
  doubtSubject: string;
  doubtContent: string;
  replyId: number;
  replierName: string;
  replyContent: string;
};

const makeDbChain = (resolveWith: unknown) => {
  const chain = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(resolveWith),
    innerJoin: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };
  return chain;
};

/**
 * Minimal Inngest step shim: each `step.run(id, fn)` executes `fn()` and
 * memoises the result under `id` so subsequent calls with the same id are
 * no-ops (mirrors Inngest's real retry semantics).
 */
function makeStep() {
  const memo = new Map<string, unknown>();
  return {
    run: jest.fn(async (id: string, fn: () => Promise<unknown>) => {
      if (memo.has(id)) return memo.get(id);
      const result = await fn();
      memo.set(id, result);
      return result;
    }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("sendDailyDigest — per-user step isolation", () => {
  const mockSendDigestEmail = sendDigestEmail as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes pending rows only for users whose email succeeded", async () => {
    // Two users: alice succeeds, bob's email throws.
    const users = [{ email: "alice@test.com" }, { email: "bob@test.com" }];

    const alicePending: PendingRow[] = [
      { id: 1, doubtId: 10, doubtSubject: "Q1", doubtContent: "...", replyId: 100, replierName: "x@t.com", replyContent: "ans" },
    ];
    const bobPending: PendingRow[] = [
      { id: 2, doubtId: 20, doubtSubject: "Q2", doubtContent: "...", replyId: 200, replierName: "y@t.com", replyContent: "ans" },
    ];

    // db.select() calls: first → users list, second → alice pending, third → bob pending
    const dbMock = db as jest.Mocked<typeof db>;
    let selectCallCount = 0;
    (dbMock.select as jest.Mock).mockImplementation(() => {
      selectCallCount++;
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
      } as Record<string, jest.Mock>;

      if (selectCallCount === 1) {
        chain.where = jest.fn().mockResolvedValue(users);
      } else if (selectCallCount === 2) {
        chain.where = jest.fn().mockResolvedValue(alicePending);
      } else {
        chain.where = jest.fn().mockResolvedValue(bobPending);
      }
      return chain;
    });

    const deleteChain = { where: jest.fn().mockResolvedValue(undefined) };
    (dbMock.delete as jest.Mock).mockReturnValue(deleteChain);

    // Alice succeeds, Bob throws
    mockSendDigestEmail
      .mockResolvedValueOnce({ success: true })            // alice: ok
      .mockResolvedValueOnce({ success: false, error: "SMTP timeout" }); // bob: failmockSendDigestEmail
      
    // Import the function under test after mocks are set.
    // We simulate the Inngest function invocation directly.
    const { sendDailyDigest } = await import("@/inngest/functions");

    const step = makeStep();
    // @ts-expect-error — internal test invocation bypasses Inngest runtime types
    await expect(sendDailyDigest({ step })).rejects.toThrow("SMTP timeout");

    // Alice's row MUST have been deleted (email succeeded).
    expect(dbMock.delete).toHaveBeenCalledTimes(1);
    expect(deleteChain.where).toHaveBeenCalledTimes(1);

    // Bob's row must NOT have been deleted (email failed, step threw).
    // The delete call count would be 2 if bob's rows were removed — confirm it's 1.
    const deleteCalls = (dbMock.delete as jest.Mock).mock.calls.length;
    expect(deleteCalls).toBe(1);
  });

  it("does not re-send to a user whose step already completed (retry idempotency)", async () => {
    const users = [{ email: "carol@test.com" }];
    const carolPending: PendingRow[] = [
      { id: 3, doubtId: 30, doubtSubject: "Q3", doubtContent: "...", replyId: 300, replierName: "z@t.com", replyContent: "ans" },
    ];

    const dbMock = db as jest.Mocked<typeof db>;
    let selectCallCount = 0;
    (dbMock.select as jest.Mock).mockImplementation(() => {
      selectCallCount++;
      const chain = { from: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), innerJoin: jest.fn().mockReturnThis() } as Record<string, jest.Mock>;
      if (selectCallCount === 1) chain.where = jest.fn().mockResolvedValue(users);
      else chain.where = jest.fn().mockResolvedValue(carolPending);
      return chain;
    });

    const deleteChain = { where: jest.fn().mockResolvedValue(undefined) };
    (dbMock.delete as jest.Mock).mockReturnValue(deleteChain);
    mockSendDigestEmail.mockResolvedValue(undefined);

    const { sendDailyDigest } = await import("@/inngest/functions");

    // First run — completes successfully.
    const step = makeStep();
    // @ts-expect-error
    await sendDailyDigest({ step });
    expect(mockSendDigestEmail).toHaveBeenCalledTimes(1);

    // Simulate Inngest retry: same step shim (memoised results) → per-user step is a no-op.
    // @ts-expect-error
    await sendDailyDigest({ step });
    // sendDigestEmail must NOT be called again.
    expect(mockSendDigestEmail).toHaveBeenCalledTimes(1);
  });
});