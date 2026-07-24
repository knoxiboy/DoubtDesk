import { createHash } from "node:crypto";

import {
  buildAiProviderErrorResponse,
  enforceAiAvailability,
} from "@/lib/ai/kill-switch";
import { aiDailyLimiter } from "@/lib/ratelimit/ratelimit";

jest.mock("@/lib/ratelimit/ratelimit", () => ({
  aiDailyLimiter: {
    limit: jest.fn(),
  },
}));

describe("AI availability controls", () => {
  const originalAiEnabled = process.env.AI_ENABLED;
  const mockDailyLimit = aiDailyLimiter.limit as jest.MockedFunction<
    typeof aiDailyLimiter.limit
  >;

  beforeEach(() => {
    process.env.AI_ENABLED = "true";
    mockDailyLimit.mockReset();
    mockDailyLimit.mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 86_400_000,
    });
  });

  afterAll(() => {
    if (originalAiEnabled === undefined) {
      delete process.env.AI_ENABLED;
    } else {
      process.env.AI_ENABLED = originalAiEnabled;
    }
  });

  it("disables AI without consuming quota", async () => {
    process.env.AI_ENABLED = "false";

    const response = await enforceAiAvailability("student@example.com");

    expect(response?.status).toBe(503);
    expect(mockDailyLimit).not.toHaveBeenCalled();
    await expect(response?.json()).resolves.toEqual({
      error: "AI features are temporarily unavailable.",
      code: "AI_DISABLED",
    });
  });

  it("uses a normalized, hashed per-user daily quota key", async () => {
    await expect(
      enforceAiAvailability("  Student@Example.COM "),
    ).resolves.toBeNull();

    const digest = createHash("sha256")
      .update("student@example.com")
      .digest("hex");
    expect(mockDailyLimit).toHaveBeenCalledWith(
      `ai-daily:${digest}`,
    );
  });

  it("returns a retryable response when the daily quota is exhausted", async () => {
    mockDailyLimit.mockResolvedValueOnce({
      success: false,
      limit: 100,
      remaining: 0,
      reset: Date.now() + 60_000,
    });

    const response = await enforceAiAvailability("student@example.com");

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBeTruthy();
    await expect(response?.json()).resolves.toEqual({
      error: "Your daily AI request limit has been reached.",
      code: "AI_DAILY_LIMIT_REACHED",
    });
  });

  it("returns a retryable response when the quota backend fails", async () => {
    mockDailyLimit.mockRejectedValueOnce(new Error("redis unavailable"));
    const consoleError = jest.spyOn(console, "error").mockImplementation();

    const response = await enforceAiAvailability("student@example.com");

    expect(response?.status).toBe(503);
    expect(response?.headers.get("Retry-After")).toBe("60");
    await expect(response?.json()).resolves.toEqual({
      error: "AI features are temporarily unavailable.",
      code: "AI_QUOTA_UNAVAILABLE",
    });
    consoleError.mockRestore();
  });

  it("maps transient provider failures to a graceful 503", async () => {
    const response = buildAiProviderErrorResponse({ status: 503 });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "The AI provider is temporarily unavailable. Please try again shortly.",
      code: "AI_PROVIDER_UNAVAILABLE",
    });
  });

  it("maps permanent provider failures to a non-leaking 500", async () => {
    const response = buildAiProviderErrorResponse({
      status: 400,
      message: "raw provider detail",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "The AI request could not be completed.",
      code: "AI_PROVIDER_ERROR",
    });
  });
});
