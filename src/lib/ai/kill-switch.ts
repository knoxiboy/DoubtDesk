import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { aiDailyLimiter } from "@/lib/ratelimit/ratelimit";

const TRANSIENT_PROVIDER_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const TRANSIENT_PROVIDER_CODES = new Set([
  "ECONNABORTED",
  "ECONNRESET",
  "ETIMEDOUT",
]);

function isAiEnabled(): boolean {
  // Read on every request so runtime environment changes are not module-cached.
  const configuredValue = process.env.AI_ENABLED?.trim().toLowerCase();
  return !["false", "0", "off"].includes(configuredValue || "");
}

function buildQuotaKey(identifier: string): string {
  const normalized = identifier.trim().toLowerCase();
  const digest = createHash("sha256").update(normalized).digest("hex");
  return `ai-daily:${digest}`;
}

function getProviderStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const candidate = error as {
    status?: unknown;
    response?: { status?: unknown };
  };
  const status = candidate.status ?? candidate.response?.status;

  return typeof status === "number" ? status : undefined;
}

function isTransientProviderError(error: unknown): boolean {
  if (TRANSIENT_PROVIDER_STATUSES.has(getProviderStatus(error) ?? 0)) {
    return true;
  }

  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown };
  if (
    typeof candidate.code === "string" &&
    TRANSIENT_PROVIDER_CODES.has(candidate.code)
  ) {
    return true;
  }

  const message =
    typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";

  return (
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("temporarily unavailable")
  );
}

export async function enforceAiAvailability(identifier: string) {
  if (!isAiEnabled()) {
    return NextResponse.json(
      {
        error: "AI features are temporarily unavailable.",
        code: "AI_DISABLED",
      },
      { status: 503 },
    );
  }

  try {
    const { success, limit, remaining, reset } =
      await aiDailyLimiter.limit(buildQuotaKey(identifier));

    if (success) {
      return null;
    }

    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

    return NextResponse.json(
      {
        error: "Your daily AI request limit has been reached.",
        code: "AI_DAILY_LIMIT_REACHED",
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
    console.error("AI availability check failed:", error);

    return NextResponse.json(
      {
        error: "AI features are temporarily unavailable.",
        code: "AI_QUOTA_UNAVAILABLE",
      },
      {
        status: 503,
        headers: {
          "Retry-After": "60",
        },
      },
    );
  }
}

export function buildAiProviderErrorResponse(error: unknown) {
  const transient = isTransientProviderError(error);

  return NextResponse.json(
    {
      error: transient
        ? "The AI provider is temporarily unavailable. Please try again shortly."
        : "The AI request could not be completed.",
      code: transient ? "AI_PROVIDER_UNAVAILABLE" : "AI_PROVIDER_ERROR",
    },
    { status: transient ? 503 : 500 },
  );
}
