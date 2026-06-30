import { NextResponse } from "next/server";

type RateLimitCategory = "ai" | "general" | "video";

interface RateLimiter {
  limit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
}

const RATE_LIMIT_MESSAGES: Record<RateLimitCategory, string> = {
  ai: "AI request limit reached. Please try again later.",
  general: "Write request limit reached. Please try again later.",
  video: "Video generation limit reached. Please try again later.",
};

export async function enforceApiRateLimit(
  limiter: RateLimiter,
  email: string,
  category: RateLimitCategory,
) {
  const identifier = `${category}:${email.trim().toLowerCase()}`;

  try {
    const { success, limit, remaining, reset } =
      await limiter.limit(identifier);

    if (success) {
      return null;
    }

    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        message: RATE_LIMIT_MESSAGES[category],
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      },
    );
  } catch (error) {
    console.error(`Rate limiting failed for ${category} requests:`, error);

    if (category === "general") {
      return null;
    }

    return NextResponse.json(
      {
        error:
          "Rate limiting service is temporarily unavailable. Please try again in a moment.",
      },
      { status: 503 },
    );
  }
}
