import type { Ratelimit } from "@upstash/ratelimit";

// @upstash/redis pulls in ESM-only deps Jest cannot parse, so stub the Upstash
// packages to allow loading the real ratelimit module below.
jest.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    limit = jest.fn();
  },
}));

jest.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: jest.fn(),
  },
}));

type LimiterLike = Pick<
  Ratelimit | { limit(identifier: string): Promise<unknown> },
  "limit"
>;

// jest.setup.ts registers a global mock for this module, so load the real
// implementation to verify its namespace isolation.
const loadRealModule = () => {
  jest.resetModules();
  return jest.requireActual("@/lib/ratelimit/ratelimit") as typeof import("@/lib/ratelimit/ratelimit");
};

const limit = async (limiter: LimiterLike, identifier: string) =>
  (await limiter.limit(identifier)) as {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  };

describe("mock rate limiter namespace isolation", () => {
  beforeAll(() => {
    process.env.UPSTASH_REDIS_REST_URL = "";
    process.env.UPSTASH_REDIS_REST_TOKEN = "";
  });

  it("keeps AI and General counters independent for the same identifier", async () => {
    const { aiLimiter, generalLimiter } = loadRealModule();

    for (let i = 0; i < 10; i++) {
      const ai = await limit(aiLimiter, "user@example.com");
      expect(ai.success).toBe(true);
    }

    const aiExhausted = await limit(aiLimiter, "user@example.com");
    expect(aiExhausted.success).toBe(false);
    expect(aiExhausted.remaining).toBe(0);

    const general = await limit(generalLimiter, "user@example.com");
    expect(general.success).toBe(true);
    expect(general.remaining).toBe(30);
  });

  it("produces different keys for different limiter namespaces", async () => {
    const { aiLimiter, videoLimiter } = loadRealModule();

    const ai = await limit(aiLimiter, "user@example.com");
    const video = await limit(videoLimiter, "user@example.com");

    expect(ai.remaining).toBe(10);
    expect(video.remaining).toBe(3);
  });

  it("preserves existing behavior within a single limiter", async () => {
    const { generalLimiter } = loadRealModule();

    const first = await limit(generalLimiter, "user@example.com");
    const second = await limit(generalLimiter, "user@example.com");

    expect(first.remaining).toBe(30);
    expect(first.success).toBe(true);
    expect(second.remaining).toBe(29);
    expect(second.success).toBe(true);
  });

  it("does not collide when identifiers contain ':' characters", async () => {
    const { aiLimiter, aiDailyLimiter } = loadRealModule();

    // aiLimiter with identifier "daily:user@example.com"
    const ai = await limit(aiLimiter, "daily:user@example.com");
    expect(ai.success).toBe(true);
    expect(ai.remaining).toBe(10);

    // aiDailyLimiter with identifier "user@example.com" should be independent
    // Default aiDailyLimit is 100 when env var is not set
    const expectedAiDailyLimit = 100;
    const aiDaily = await limit(aiDailyLimiter, "user@example.com");
    expect(aiDaily.success).toBe(true);
    expect(aiDaily.remaining).toBe(expectedAiDailyLimit);

    // Consuming aiLimiter should not affect aiDailyLimiter
    const aiDailyAfter = await limit(aiDailyLimiter, "user@example.com");
    expect(aiDailyAfter.success).toBe(true);
    expect(aiDailyAfter.remaining).toBe(expectedAiDailyLimit - 1);
  });
});
