import { PATCH } from "@/app/api/doubts/action/[id]/route";
import { POST as pinPost, DELETE as pinDelete } from "@/app/api/doubts/[id]/pin/route";
import { currentUser } from "@clerk/nextjs/server";
import { getAnonymousHandle } from "@/lib/anonymity/anonymity";

const AUTHOR_EMAIL = "alice.author@example.com";
const VIEWER_EMAIL = "bob.viewer@example.com";

const authoredDoubt = {
  id: 42,
  userEmail: AUTHOR_EMAIL,
  classroomId: 1,
  subject: "Thermodynamics",
  content: "Why is entropy always increasing?",
  likes: 2,
  isSolved: "unsolved",
  type: "community",
  isPinned: false,
  deletedAt: null,
};

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/lib/validations/validate", () => ({
  parseAndValidateRequest: jest.fn(),
}));

jest.mock("@/lib/validations/doubt", () => ({
  updateDoubtActionSchema: {},
}));

jest.mock("@/lib/moderation/moderation", () => ({
  moderateContent: jest.fn().mockResolvedValue({ isAllowed: true }),
  handleModerationViolation: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/audit/audit", () => ({
  auditLog: jest.fn(),
  AUDIT_ACTIONS: { DOUBT_SOLVED: "doubt.solved", DOUBT_EDITED: "doubt.edited", DOUBT_PINNED: "doubt.pinned", DOUBT_UNPINNED: "doubt.unpinned" },
}));

jest.mock("@/lib/auth/membership-guard", () => ({
  canTeach: jest.fn((role: string) => ["teacher", "owner", "admin"].includes(role)),
}));

const selectResultQueue: any[] = [];
const updateReturning = jest.fn();
const transactionMock = jest.fn();

const createQueryMock = (data: any) => {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
    innerJoin: () => chain,
    then: (resolve: any) => Promise.resolve(resolve(data)),
  };
  return chain;
};

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(() => createQueryMock(selectResultQueue.shift() ?? [])),
    update: jest.fn(() => ({
      set: () => ({
        where: () => ({
          returning: (...args: unknown[]) => updateReturning(...args),
        }),
      }),
    })),
    transaction: (...args: unknown[]) => transactionMock(...args),
  },
}));

import { parseAndValidateRequest } from "@/lib/validations/validate";

const params = { params: Promise.resolve({ id: "42" }) };

function assertNoIdentityLeak(json: Record<string, unknown>) {
  const serialized = JSON.stringify(json);
  expect(serialized).not.toContain(AUTHOR_EMAIL);
  expect(json).not.toHaveProperty("userEmail");
  expect(json.author).toBe(getAnonymousHandle(AUTHOR_EMAIL));
}

describe("Doubt mutation anonymity (issue #1356)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectResultQueue.length = 0;
    (currentUser as jest.Mock).mockResolvedValue({
      primaryEmailAddress: { emailAddress: VIEWER_EMAIL },
    });
  });

  it("strips userEmail from like responses", async () => {
    (parseAndValidateRequest as jest.Mock).mockResolvedValue({
      errorResponse: null,
      data: { action: "like" },
    });
    selectResultQueue.push([authoredDoubt], [{ role: "student" }]);
    transactionMock.mockResolvedValue({ ...authoredDoubt, likes: 3, hasLiked: true });

    const res = await PATCH(new Request("http://localhost/api/doubts/action/42", { method: "PATCH" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.hasLiked).toBe(true);
    expect(json.isOwnPost).toBe(false);
    assertNoIdentityLeak(json);
  });

  it("strips userEmail from solve responses", async () => {
    (currentUser as jest.Mock).mockResolvedValue({
      primaryEmailAddress: { emailAddress: AUTHOR_EMAIL },
    });
    (parseAndValidateRequest as jest.Mock).mockResolvedValue({
      errorResponse: null,
      data: { action: "solve" },
    });
    selectResultQueue.push([authoredDoubt], [{ role: "student" }]);
    updateReturning.mockResolvedValue([{ ...authoredDoubt, isSolved: "solved" }]);

    const res = await PATCH(new Request("http://localhost/api/doubts/action/42", { method: "PATCH" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isOwnPost).toBe(true);
    assertNoIdentityLeak(json);
  });

  it("strips userEmail from edit responses", async () => {
    (currentUser as jest.Mock).mockResolvedValue({
      primaryEmailAddress: { emailAddress: AUTHOR_EMAIL },
    });
    (parseAndValidateRequest as jest.Mock).mockResolvedValue({
      errorResponse: null,
      data: { action: "edit", content: "updated", subject: "Thermo" },
    });
    selectResultQueue.push([authoredDoubt], [{ role: "student" }]);
    transactionMock.mockResolvedValue({
      updated: { ...authoredDoubt, content: "updated", subject: "Thermo" },
      savedTags: [],
    });

    const res = await PATCH(new Request("http://localhost/api/doubts/action/42", { method: "PATCH" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.tags).toEqual([]);
    assertNoIdentityLeak(json);
  });

  it("strips userEmail from pin responses", async () => {
    selectResultQueue.push([authoredDoubt], [{ role: "teacher" }]);
    transactionMock.mockResolvedValue({
      updated: [{ ...authoredDoubt, isPinned: true }],
    });

    const res = await pinPost(new Request("http://localhost/api/doubts/42/pin", { method: "POST" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isPinned).toBe(true);
    assertNoIdentityLeak(json);
  });

  it("strips userEmail from unpin responses", async () => {
    selectResultQueue.push([authoredDoubt], [{ role: "teacher" }]);
    updateReturning.mockResolvedValue([{ ...authoredDoubt, isPinned: false }]);

    const res = await pinDelete(new Request("http://localhost/api/doubts/42/pin", { method: "DELETE" }), params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.isPinned).toBe(false);
    assertNoIdentityLeak(json);
  });
});
