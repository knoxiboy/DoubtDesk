import { POST as bookmarkPost } from "@/app/api/doubts/[id]/bookmark/route";
import { POST as upvotePost } from "@/app/api/doubts/[id]/upvote/route";
import { POST as flagPost } from "@/app/api/doubts/flag/route";
import { currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/lib/ratelimit/api-rate-limit", () => ({
  enforceApiRateLimit: jest.fn().mockResolvedValue(null),
}));
jest.mock("@/lib/ratelimit/ratelimit", () => ({
  generalLimiter: {},
}));
jest.mock("@/inngest/client", () => ({
  inngest: { send: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/auth/membership-guard", () => ({
  requireMembership: jest.fn(),
}));
jest.mock("@/lib/validations/validate", () => ({
  limitRequestBodySize: jest.fn().mockResolvedValue(null),
}));

const selectResultQueue: any[] = [];

const createQueryMock = (data: any) => {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
    then: (resolve: any) => Promise.resolve(resolve(data)),
  };
  return chain;
};

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(() => createQueryMock(selectResultQueue.shift() ?? [])),
    insert: jest.fn(() => ({
      values: jest.fn().mockResolvedValue([]),
    })),
    transaction: jest.fn(),
  },
}));

import { inngest } from "@/inngest/client";

const params = { params: Promise.resolve({ id: "42" }) };

describe("soft-deleted doubt mutations (issue #1355)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectResultQueue.length = 0;
    (currentUser as jest.Mock).mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
    });
  });

  it("returns 404 when bookmarking a soft-deleted doubt", async () => {
    selectResultQueue.push([]);

    const res = await bookmarkPost(new Request("http://localhost/api/doubts/42/bookmark", { method: "POST" }), params);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Doubt not found");
  });

  it("returns 404 and does not emit karma when upvoting a reply on a soft-deleted doubt", async () => {
    selectResultQueue.push(
      [{ userEmail: "author@example.com", doubtId: 42 }],
      [],
    );

    const res = await upvotePost(
      new Request("http://localhost/api/doubts/42/upvote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId: 9 }),
      }) as any,
      params,
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Doubt not found");
    expect(inngest.send).not.toHaveBeenCalled();
  });

  it("returns 404 when flagging a soft-deleted doubt", async () => {
    selectResultQueue.push([]);

    const res = await flagPost(
      new Request("http://localhost/api/doubts/flag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doubtId: 42, reason: "spam" }),
      }) as any,
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("Doubt not found");
  });
});
