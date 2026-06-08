import { currentUser } from "@clerk/nextjs/server";

import { POST } from "@/app/api/doubts/check-similarity/route";
import { getAnonymousQuotaIdentifier } from "@/lib/request-identity";
import { getSafeErrorDetails } from "@/lib/safe-error-details";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
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

  beforeEach(() => {
    currentUserMock.mockReset();
    currentUserMock.mockResolvedValue(null);
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
