process.env.GROQ_API_KEY = "mock-groq-key";

import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireMembership } from "@/lib/auth/membership-guard";

jest.mock("@/lib/ai/groq-client", () => ({
  groq: {
    embeddings: {
      create: jest.fn(),
    },
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  },
}));

import { POST } from "@/app/api/doubts/check-duplicate/route";
import { db } from "@/configs/db";
import { enforceApiRateLimit } from "@/lib/ratelimit/api-rate-limit";
import { getAnonymousQuotaIdentifier } from "@/lib/auth/request-identity";
import { getSafeErrorDetails } from "@/lib/errors/safe-error-details";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/lib/auth/membership-guard", () => {
  const actual = jest.requireActual("@/lib/auth/membership-guard");
  return {
    ...actual,
    requireMembership: jest.fn(),
  };
});

jest.mock("@/lib/ratelimit/api-rate-limit", () => ({
  enforceApiRateLimit: jest.fn(),
}));

jest.mock("@/lib/ai/kill-switch", () => ({
  buildAiProviderErrorResponse: jest.fn(
    () =>
      new Response(JSON.stringify({ error: "AI provider unavailable" }), {
        status: 503,
      }),
  ),
  enforceAiAvailability: jest.fn().mockResolvedValue(null),
}));

const createQueryMock = () => {
  const query: any = {
    from: () => query,
    where: () => query,
    orderBy: () => query,
    limit: () => query,
    then: (resolve: any) => Promise.resolve(resolve([])),
  };
  return query;
};

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(() => createQueryMock()),
  },
}));



describe("Doubt check-duplicate API endpoint", () => {
  const currentUserMock = currentUser as jest.MockedFunction<typeof currentUser>;
  const enforceApiRateLimitMock = enforceApiRateLimit as jest.MockedFunction<
    typeof enforceApiRateLimit
  >;
  const dbSelectMock = db.select as jest.Mock;

  beforeEach(() => {
    currentUserMock.mockReset();
    currentUserMock.mockResolvedValue(null);
    enforceApiRateLimitMock.mockReset();
    enforceApiRateLimitMock.mockResolvedValue(null);
    dbSelectMock.mockClear();
  });

  it("allows anonymous community duplicate checks", async () => {
    const req = new Request("http://localhost/api/doubts/check-duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "How does photosynthesis convert light into energy?",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ similarDoubts: [] });
    expect(currentUserMock).not.toHaveBeenCalled();
  });

  it("stops rate-limited requests before querying database", async () => {
    enforceApiRateLimitMock.mockResolvedValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
    const req = new Request("http://localhost/api/doubts/check-duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "How does photosynthesis convert light into energy?",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(429);
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("requires authentication for classroom duplicate checks", async () => {
    const req = new Request("http://localhost/api/doubts/check-duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "How does photosynthesis convert light into energy?",
        classroomId: 7,
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: "Unauthorized" });
  });

  it("excludes hidden doubts from candidate query", async () => {
    let capturedWhereArg: any = null;
    const trackingQuery: any = {
      from: () => trackingQuery,
      where: (arg: any) => {
        capturedWhereArg = arg;
        return trackingQuery;
      },
      orderBy: () => trackingQuery,
      limit: () => trackingQuery,
      then: (resolve: any) => Promise.resolve(resolve([])),
    };
    dbSelectMock.mockReturnValue(trackingQuery);

    const req = new Request("http://localhost/api/doubts/check-duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "How does photosynthesis convert light into energy?",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(capturedWhereArg).not.toBeNull();
    const hasIsHidden = (expr: any): boolean => {
      if (!expr || typeof expr !== "object") return false;
      if (expr.name === "isHidden") return true;
      if (expr.queryChunks)
        return expr.queryChunks.some((c: any) => hasIsHidden(c));
      return false;
    };
    expect(hasIsHidden(capturedWhereArg)).toBe(true);
  });

  it("succeeds for authenticated classroom duplicate checks", async () => {
    const requireMembershipMock = requireMembership as jest.MockedFunction<typeof requireMembership>;
    requireMembershipMock.mockResolvedValue({ role: "student" });
    currentUserMock.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" }
    } as any);

    const req = new Request("http://localhost/api/doubts/check-duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "How does photosynthesis convert light into energy?",
        classroomId: 7,
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ similarDoubts: [] });
    expect(enforceApiRateLimitMock).toHaveBeenCalledWith(
      expect.anything(),
      "student@example.com",
      "ai"
    );
    expect(requireMembershipMock).toHaveBeenCalledWith("student@example.com", 7);
  });
});
