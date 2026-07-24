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
let inviteCodeLimiter: Ratelimit | MockLimiter;
let redisClient: Redis | MockRedis;

interface MockLimiter {
  limit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
}

interface MockRedisValue {
  value: unknown;
  expiresAt?: number;
}

interface MockRedis {
    get<T = unknown>(key: string): Promise<T | null>;
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

  // Classroom Invite Code Joining: Strict brute-force protection (5 req/min per IP)
  inviteCodeLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(5, "1 m"),
    analytics: true,
    prefix: "ratelimit:invite_code",
  });

  redisClient = redis;
} else {
  // Simple in-memory fallback for local development
  // Note: This won't be perfectly accurate in distributed environments but works for local testing
  const memoryMap = new Map<string, { count: number; reset: number }>();

  // // Dedicated in-memory store used to emulate generic Redis key-value operations.
  const redisStore = new Map<string, MockRedisValue>();

  // Retrieves a value from the mock Redis store and performs lazy expiration.
  const getRedisEntry = (key: string): MockRedisValue | null => {
    const entry = redisStore.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      redisStore.delete(key);
      return null;
    }

    return entry;
  };

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
  inviteCodeLimiter = createMockLimiter(5, 60 * 1000); // 5 per minute

  // Provide a mock redis client for locks
  redisClient = {
    get: async <T = unknown>(key: string): Promise<T | null> => {
      const entry = getRedisEntry(key);
      return entry ? entry.value as T : null;
    },
    setnx: async (key: string, value: unknown) => {
      const entry = getRedisEntry(key);
      if (entry) {
        return 0;
      }

      redisStore.set(key, { value, expiresAt: undefined });
      return 1;
    },
    set: async (
      key: string,
      value: unknown,
      opts?: { nx?: boolean; ex?: number },
    ): Promise<"OK" | null> => {
      const entry = getRedisEntry(key);
      
      if (opts?.nx && entry) return null;

      const expiresAt = 
        opts?.ex !== undefined 
          ? Date.now() + opts.ex * 1000 
          : undefined;
          
      redisStore.set(key, {value, expiresAt});

      return "OK";
    },
    del: async (key: string) => {
      return redisStore.delete(key) ? 1 : 0;
    },
    expire: async (key: string, seconds: number) => {
      const entry = getRedisEntry(key);
      if (!entry) {
        return 0;
      }

      entry.expiresAt = Date.now() + seconds * 1000;
      return 1;
    }
  };
}

export { aiLimiter, aiDailyLimiter, generalLimiter, emailNotificationLimiter, videoLimiter, inviteCodeLimiter, redisClient };