import { db } from "@/configs/db";
import { sendWarningEmail, sendBlockEmail } from "@/lib/email";

jest.mock("@/configs/db", () => ({
  db: {
    transaction: jest.fn(),
  },
}));

jest.mock("@/lib/email", () => ({
  sendWarningEmail: jest.fn().mockResolvedValue(undefined),
  sendBlockEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn(),
  sql: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) =>
    ({ raw: strings.join(""), values })
  ),
}));

// ── helpers ──────────────────────────────────────────────────────────────────

function makeTxChain(returnRows: object[]) {
  const chain = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue(returnRows),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockResolvedValue(undefined),
  };
  return chain;
}

const ALLOWED_RESULT = { isAllowed: false, reason: "Abusive content", violationType: "abusive" as const };

// ── tests ─────────────────────────────────────────────────────────────────────

describe("handleModerationViolation — atomic counter", () => {
  const mockSendWarningEmail = sendWarningEmail as jest.Mock;
  const mockSendBlockEmail = sendBlockEmail as jest.Mock;
  const mockTransaction = db.transaction as jest.Mock;

  beforeEach(() => jest.clearAllMocks());

  it("returns null immediately when content is allowed", async () => {
    const { handleModerationViolation } = await import("@/lib/moderation");
    const result = await handleModerationViolation("u@test.com", "fine content", { isAllowed: true, reason: "OK" });
    expect(result).toBeNull();
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("runs inside a db.transaction (no raw read-modify-write)", async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      const tx = makeTxChain([{ violationCount: 1, blockCount: 0, blockedUntil: null }]);
      return fn(tx);
    });

    const { handleModerationViolation } = await import("@/lib/moderation");
    await handleModerationViolation("u@test.com", "bad content", ALLOWED_RESULT);
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("does NOT call sendBlockEmail on strike 1 or 2", async () => {
    for (const count of [1, 2]) {
      mockTransaction.mockImplementationOnce(async (fn: Function) => {
        const tx = makeTxChain([{ violationCount: count, blockCount: 0, blockedUntil: null }]);
        return fn(tx);
      });
      const { handleModerationViolation } = await import("@/lib/moderation");
      await handleModerationViolation("u@test.com", "bad", ALLOWED_RESULT);
      expect(mockSendBlockEmail).not.toHaveBeenCalled();
    }
  });

  it("blocks user and calls sendBlockEmail exactly once on strike 3", async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      const tx = makeTxChain([{ violationCount: 3, blockCount: 0, blockedUntil: null }]);
      // second update (block state) — chain returns gracefully
      tx.returning.mockResolvedValueOnce([{ violationCount: 3, blockCount: 0, blockedUntil: null }]);
      return fn(tx);
    });

    const { handleModerationViolation } = await import("@/lib/moderation");
    const msg = await handleModerationViolation("u@test.com", "bad", ALLOWED_RESULT);

    expect(mockSendBlockEmail).toHaveBeenCalledTimes(1);
    expect(msg).toMatch(/blocked/i);
  });

  it("concurrent calls each open their own transaction (no shared mutable state)", async () => {
    // Both concurrent calls see violationCount = 3 (DB handled the atomic increment)
    // — sendBlockEmail must be called once per transaction that hits strike 3.
    let txCallCount = 0;
    mockTransaction.mockImplementation(async (fn: Function) => {
      txCallCount++;
      const tx = makeTxChain([{ violationCount: 3, blockCount: 0, blockedUntil: null }]);
      return fn(tx);
    });

    const { handleModerationViolation } = await import("@/lib/moderation");
    await Promise.all([
      handleModerationViolation("u@test.com", "bad1", ALLOWED_RESULT),
      handleModerationViolation("u@test.com", "bad2", ALLOWED_RESULT),
    ]);

    // Two concurrent violations → two separate transactions opened.
    expect(txCallCount).toBe(2);
    // Each transaction that sees count >= 3 sends the block email.
    expect(mockSendBlockEmail).toHaveBeenCalledTimes(2);
    // Warning email sent once per violation.
    expect(mockSendWarningEmail).toHaveBeenCalledTimes(2);
  });

  it("returns null when user row is not found", async () => {
    mockTransaction.mockImplementation(async (fn: Function) => {
      const tx = makeTxChain([]); // empty RETURNING — user not found
      return fn(tx);
    });

    const { handleModerationViolation } = await import("@/lib/moderation");
    const result = await handleModerationViolation("ghost@test.com", "bad", ALLOWED_RESULT);
    expect(result).toBeNull();
    expect(mockSendWarningEmail).not.toHaveBeenCalled();
  });
});