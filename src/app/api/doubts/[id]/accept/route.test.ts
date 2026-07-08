import { NextRequest } from "next/server";

// ── Mutable per-test state shared between mocks ──────────────────────────────
let mockDoubt: {
    userEmail: string;
    isSolved: string;
    solvedReplyId: number | null;
} | null = {
    userEmail: "asker@test.com",
    isSolved: "unsolved",
    solvedReplyId: null,
};

let mockReply: {
    userEmail: string;
    doubtId: number;
} | null = {
    userEmail: "answerer@test.com",
    doubtId: 1,
};

let mockUpdatedDoubt: { id: number } | null = { id: 1 };

const mockInngestSend = jest.fn();

// ── Mocks ─────────────────────────────────────────────────────────────────────
jest.mock("@clerk/nextjs/server", () => ({
    currentUser: jest.fn().mockResolvedValue({
        primaryEmailAddress: { emailAddress: "asker@test.com" },
    }),
}));

jest.mock("@/inngest/client", () => ({
    inngest: { send: mockInngestSend },
}));

let mockSelectCallCount = 0;

jest.mock("@/configs/db", () => {
    const makeSelectChain = (result: unknown[]) => ({
        from: () => ({ where: () => ({ limit: () => Promise.resolve(result) }) }),
    });
    const makeUpdateChain = (result: unknown[]) => ({
        set: () => ({ where: () => ({ returning: () => Promise.resolve(result) }) }),
    });

    return {
        db: {
            select: jest.fn().mockImplementation(() => {
                mockSelectCallCount += 1;
                if (mockSelectCallCount === 1) {
                    return makeSelectChain(mockDoubt ? [mockDoubt] : []);
                }
                return makeSelectChain(mockReply ? [mockReply] : []);
            }),
            update: jest.fn().mockImplementation(() =>
                makeUpdateChain(mockUpdatedDoubt ? [mockUpdatedDoubt] : [])
            ),
        },
    };
});

jest.mock("@/configs/schema", () => ({
    doubtsTable: {
        id: "id",
        userEmail: "userEmail",
        isSolved: "isSolved",
        solvedReplyId: "solvedReplyId",
    },
    repliesTable: { id: "id", doubtId: "doubtId", userEmail: "userEmail" },
}));

jest.mock("drizzle-orm", () => {
    const actual = jest.requireActual("drizzle-orm") as typeof import("drizzle-orm");
    return {
        ...actual,
        eq: jest.fn(),
        and: jest.fn(),
        or: jest.fn(),
        ne: jest.fn(),
        isNull: jest.fn(),
    };
});


// ── Helper ────────────────────────────────────────────────────────────────────
function makeRequest(replyId: number): NextRequest {
    return new NextRequest("http://localhost/api/doubts/1/accept", {
        method: "POST",
        body: JSON.stringify({ replyId }),
        headers: { "Content-Type": "application/json" },
    });
}

async function callPost(replyId = 42) {
    // Dynamic import so mocks are registered first
    const { POST } = await import("./route");
    return POST(makeRequest(replyId), {
        params: Promise.resolve({ id: "1" }),
    } as any);
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("POST /api/doubts/[id]/accept — idempotency (issue #687)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockInngestSend.mockReset();
        mockSelectCallCount = 0;

        // Default: unsolved doubt, valid reply, state-changing update
        mockDoubt = { userEmail: "asker@test.com", isSolved: "unsolved", solvedReplyId: null };
        mockReply = { userEmail: "answerer@test.com", doubtId: 1 };
        mockUpdatedDoubt = { id: 1 };
    });

    it("accepts an answer and emits karma event exactly once on first call", async () => {
        const res = await callPost(42);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.message).toBe("Answer accepted successfully");
        // karma event fired exactly once
        expect(mockInngestSend).toHaveBeenCalledTimes(1);
        expect(mockInngestSend).toHaveBeenCalledWith(
            expect.objectContaining({ name: "karma/answer.accepted" })
        );
    });

    it("returns 200 no-op and does NOT emit karma event on duplicate accept (same replyId)", async () => {
        // Simulate DB state: doubt already solved with replyId 42.
        // The atomic UPDATE WHERE clause finds no matching row → returns [].
        mockDoubt = { userEmail: "asker@test.com", isSolved: "solved", solvedReplyId: 42 };
        mockUpdatedDoubt = null; // no row changed → already solved with this reply

        const res = await callPost(42);
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.success).toBe(true);
        expect(body.message).toBe("Answer was already accepted (no-op)");
        // No karma event fired
        expect(mockInngestSend).not.toHaveBeenCalled();
    });

    it("karmaScore is awarded only once after two POSTs with the same replyId", async () => {
        // First POST — genuine state transition
        const res1 = await callPost(42);
        expect((await res1.json()).message).toBe("Answer accepted successfully");
        expect(mockInngestSend).toHaveBeenCalledTimes(1);

        // Second POST — UPDATE finds no row to change (idempotency guard at DB level)
        mockSelectCallCount = 0;
        mockInngestSend.mockClear();
        mockDoubt = { userEmail: "asker@test.com", isSolved: "solved", solvedReplyId: 42 };
        mockUpdatedDoubt = null;

        const res2 = await callPost(42);
        expect((await res2.json()).message).toBe("Answer was already accepted (no-op)");
        // inngest.send was NOT called on the second request
        expect(mockInngestSend).not.toHaveBeenCalled();
    });

    it("returns 500 with a generic message and does not leak error details", async () => {
        // Make the DB throw to exercise the catch block
        const { db } = await import("@/configs/db");
        jest.mocked(db.select).mockImplementationOnce(() => {
            throw new Error("relation \"doubts\" does not exist");
        });

        const res = await callPost(42);
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.error).toBe("Internal Server Error");
        // Ensure raw DB error text is NOT sent to the client
        expect(JSON.stringify(body)).not.toContain("relation");
        expect(JSON.stringify(body)).not.toContain("does not exist");
    });
});