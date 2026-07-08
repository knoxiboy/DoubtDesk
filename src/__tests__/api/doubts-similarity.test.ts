import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { POST } from "@/app/api/doubts/check-similarity/route";
import { db } from "@/configs/db";
import { enforceApiRateLimit } from "@/lib/ratelimit/api-rate-limit";
import { getAnonymousQuotaIdentifier } from "@/lib/auth/request-identity";
import { getSafeErrorDetails } from "@/lib/errors/safe-error-details";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

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

jest.mock("groq-sdk", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

describe("Doubt similarity API endpoint", () => {
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

  it("allows anonymous community similarity checks", async () => {
    const req = new Request("http://localhost/api/doubts/check-similarity", {
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

  it("stops rate-limited requests before querying the database", async () => {
    enforceApiRateLimitMock.mockResolvedValue(
      NextResponse.json({ error: "Too many requests" }, { status: 429 }),
    );
    const req = new Request("http://localhost/api/doubts/check-similarity", {
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

  it("stops rate-limited classroom requests before checking membership", async () => {
    currentUserMock.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
    } as Awaited<ReturnType<typeof currentUser>>);
    enforceApiRateLimitMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        NextResponse.json({ error: "Too many requests" }, { status: 429 }),
      );
    const req = new Request("http://localhost/api/doubts/check-similarity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "How does photosynthesis convert light into energy?",
        classroomId: 7,
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(429);
    expect(enforceApiRateLimitMock).toHaveBeenCalledWith(
      expect.anything(),
      "anonymous",
      "ai",
    );
    expect(enforceApiRateLimitMock).toHaveBeenCalledWith(
      expect.anything(),
      "student@example.com",
      "ai",
    );
    expect(dbSelectMock).not.toHaveBeenCalled();
  });

  it("ignores spoofable forwarded IP values for anonymous quota keys", () => {
    const req = new Request("http://localhost/api/doubts/check-similarity", {
      headers: { "x-forwarded-for": "203.0.113.1" },
    });

    expect(getAnonymousQuotaIdentifier(req)).toBe("anonymous");
  });

  it("uses a validated trusted proxy IP for anonymous quota keys", () => {
    const req = new Request("http://localhost/api/doubts/check-similarity", {
      headers: {
        "x-forwarded-for": "spoofed",
        "x-real-ip": "203.0.113.7",
      },
    });

    expect(getAnonymousQuotaIdentifier(req)).toBe("ip:203.0.113.7");
  });

  it("keeps sensitive provider metadata out of error logs", () => {
    const error = {
      message: "provider failed",
      code: "ETIMEDOUT",
      response: { status: 503, config: { headers: { Authorization: "secret" } } },
      config: { headers: { Authorization: "secret" } },
    };

    expect(getSafeErrorDetails(error)).toEqual({
      message: "provider failed",
      status: 503,
      code: "ETIMEDOUT",
    });
  });

  it("requires authentication for classroom similarity checks", async () => {
    const req = new Request("http://localhost/api/doubts/check-similarity", {
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
});
