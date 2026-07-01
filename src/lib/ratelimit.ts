import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create a singleton instance of the rate limiter
// For local development or when Redis is not configured, we'll use a mock limiter
// that doesn't actually block requests but provides the same interface.

let aiLimiter: Ratelimit | MockLimiter;
let aiDailyLimiter: Ratelimit | MockLimiter;
let generalLimiter: Ratelimit | MockLimiter;
let emailNotificationLimiter: Ratelimit | MockLimiter;
let videoLimiter: Ratelimit | MockLimiter;
let redisClient: Redis | MockRedis;

interface MockLimiter {
  limit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
}

interface MockRedis {
    setnx(key: string, value: unknown): Promise<number>;
    set(
      key: string,
      value: unknown,
      opts?: { nx?: boolean; ex?: number },
    ): Promise<"OK" | null>;
    del(key: string): Promise<number>;
  expire?(key: string, seconds: number): Promise<number>;
}

const isRedisConfigured = 
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_TOKEN;
const configuredAiDailyLimit = Number.parseInt(process.env.AI_DAILY_USER_LIMIT || "100", 10);
const aiDailyLimit =
  Number.isSafeInteger(configuredAiDailyLimit) && configuredAiDailyLimit > 0
    ? configuredAiDailyLimit
    : 100;

if (isRedisConfigured) {
  const redis = Redis.fromEnv();

  // AI Solver: Stricter limit (10 req/min)
  aiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "ratelimit:ai",
  });

  aiDailyLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(aiDailyLimit, "1 d"),
    analytics: true,
    prefix: "ratelimit:ai:daily",
  });

  // General API (Doubts, Replies): 30 req/min
  generalLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
    prefix: "ratelimit:general",
  });

  // Email Notification: Max 1 email per doubt every 5 minutes
  emailNotificationLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1, "5 m"),
    analytics: true,
    prefix: "ratelimit:email_notify",
  });

  // Video Generation: Stricter limit (3 videos per hour)
  videoLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    analytics: true,
    prefix: "ratelimit:video",
  });

  redisClient = redis;
} else {
  // Simple in-memory fallback for local development
  // Note: This won't be perfectly accurate in distributed environments but works for local testing
  const memoryMap = new Map<string, { count: number; reset: number }>();

  const createMockLimiter = (limit: number, windowMs: number) => ({
    limit: async (identifier: string) => {
      const now = Date.now();
      const record = memoryMap.get(identifier) || { count: 0, reset: now + windowMs };

      if (now > record.reset) {
        record.count = 0;
        record.reset = now + windowMs;
      }

      record.count++;
      memoryMap.set(identifier, record);

      return {
        success: record.count <= limit,
        limit,
        remaining: Math.max(0, limit - record.count),
        reset: record.reset,
      };
    },
  });

  aiLimiter = createMockLimiter(10, 60 * 1000);
  aiDailyLimiter = createMockLimiter(aiDailyLimit, 24 * 60 * 60 * 1000);
  generalLimiter = createMockLimiter(30, 60 * 1000);
  emailNotificationLimiter = createMockLimiter(1, 5 * 60 * 1000); // 1 per 5 mins
  videoLimiter = createMockLimiter(3, 60 * 60 * 1000); // 3 per hour

  // Provide a mock redis client for locks
  redisClient = {
    setnx: async (key: string, value: unknown) => {
      if (memoryMap.has(key)) return 0;
      memoryMap.set(key, { count: 1, reset: Date.now() + 5 * 60 * 1000 });
      return 1;
    },
    set: async (
      key: string,
      value: unknown,
      opts?: { nx?: boolean; ex?: number },
    ): Promise<"OK" | null> => {
      if (opts?.nx && memoryMap.has(key)) return null;
      const ttlMs = opts?.ex ? opts.ex * 1000 : 5 * 60 * 1000;
      memoryMap.set(key, { count: 1, reset: Date.now() + ttlMs });
      return "OK";
    },
    del: async (key: string) => {
      memoryMap.delete(key);
      return 1;
    },
    expire: async (key: string, seconds: number) => {
      const rec = memoryMap.get(key);
      if (!rec) return 0;
      rec.reset = Date.now() + seconds * 1000;
      memoryMap.set(key, rec);
      return 1;
    }
  };
}

export { aiLimiter, aiDailyLimiter, generalLimiter, emailNotificationLimiter, videoLimiter, redisClient };