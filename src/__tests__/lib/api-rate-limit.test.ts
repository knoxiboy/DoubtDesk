import { enforceApiRateLimit } from "@/lib/ratelimit/api-rate-limit";

const createLimiter = (result: {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}) => ({
  limit: jest.fn().mockResolvedValue(result),
});

describe("enforceApiRateLimit", () => {
  it("uses a normalized authenticated email key", async () => {
    const limiter = createLimiter({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now() + 60_000,
    });

    const response = await enforceApiRateLimit(
      limiter,
      "  Student@Example.COM ",
      "ai",
    );

    expect(response).toBeNull();
    expect(limiter.limit).toHaveBeenCalledWith("ai:student@example.com");
  });

  it("returns a clear 429 response with rate-limit headers", async () => {
    const reset = Date.now() + 30_000;
    const limiter = createLimiter({
      success: false,
      limit: 3,
      remaining: 0,
      reset,
    });

    const response = await enforceApiRateLimit(
      limiter,
      "student@example.com",
      "video",
    );
    const body = await response?.json();

    expect(response?.status).toBe(429);
    const retryAfter = Number(response?.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThanOrEqual(29);
    expect(retryAfter).toBeLessThanOrEqual(30);
    expect(response?.headers.get("X-RateLimit-Limit")).toBe("3");
    expect(response?.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(response?.headers.get("X-RateLimit-Reset")).toBe(reset.toString());
    expect(body).toEqual({
      error: "Too many requests. Please try again later.",
      message: "Video generation limit reached. Please try again later.",
    });
  });

  it("fails open when the general limiter is unavailable", async () => {
    const limiter = {
      limit: jest.fn().mockRejectedValue(new Error("Redis unavailable")),
    };

    await expect(
      enforceApiRateLimit(limiter, "student@example.com", "general"),
    ).resolves.toBeNull();
  });

  it("fails closed when an expensive-route limiter is unavailable", async () => {
    const limiter = {
      limit: jest.fn().mockRejectedValue(new Error("Redis unavailable")),
    };

    const response = await enforceApiRateLimit(
      limiter,
      "student@example.com",
      "ai",
    );

    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toEqual({
      error:
        "Rate limiting service is temporarily unavailable. Please try again in a moment.",
    });
  });
});
