process.env.GROQ_API_KEY = "mock-groq-key";

import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
});
