import { redisClient } from '@/lib/ratelimit/ratelimit';

/**
 * Analytics data is considered fully fresh for 5 minutes.
 * For an extra window after that, we still serve the cached value
 * (stale) while a background refresh brings it up to date, instead
 * of forcing every requester to wait on the 8 heavy aggregate queries.
 */
const FRESH_TTL_SECONDS = 5 * 60;
const STALE_TTL_SECONDS = 10 * 60;
const TOTAL_TTL_SECONDS = FRESH_TTL_SECONDS + STALE_TTL_SECONDS;

interface CacheEnvelope<T> {
    data: T;
    cachedAt: number; // epoch ms
}

export type AnalyticsCacheResult<T> =
    | { status: 'fresh'; data: T }
    | { status: 'stale'; data: T }
    | { status: 'miss' };

/**
 * Builds a stable cache key for a given analytics scope.
 * Each scope (organization, single classroom, or a user's global
 * "all my classrooms" view) gets its own independent cache entry.
 */
export function buildAnalyticsCacheKey(scope: {
    type: 'organization' | 'classroom' | 'global';
    id: number | string;
}): string {
    return `analytics:${scope.type}:${scope.id}`;
}

export async function readAnalyticsCache<T>(key: string): Promise<AnalyticsCacheResult<T>> {
    try {
        const getValue = redisClient.get as (key: string) => Promise<unknown>;
        const raw = await getValue(key);
        if (!raw) return { status: 'miss' };

        const envelope: CacheEnvelope<T> = typeof raw === 'string' ? JSON.parse(raw) : (raw as CacheEnvelope<T>);
        const ageSeconds = (Date.now() - envelope.cachedAt) / 1000;

        if (ageSeconds < FRESH_TTL_SECONDS) {
            return { status: 'fresh', data: envelope.data };
        }
        if (ageSeconds < TOTAL_TTL_SECONDS) {
            return { status: 'stale', data: envelope.data };
        }
        return { status: 'miss' };
    } catch (err) {
        // Cache is a performance optimization, never a hard dependency.
        // Any read failure (Redis down, bad JSON, etc.) falls back to a live query.
        console.error('Analytics cache read failed, falling back to live query:', err);
        return { status: 'miss' };
    }
}

export async function writeAnalyticsCache<T>(key: string, data: T): Promise<void> {
    try {
        const envelope: CacheEnvelope<T> = { data, cachedAt: Date.now() };
        await redisClient.set(key, JSON.stringify(envelope), { ex: TOTAL_TTL_SECONDS });
    } catch (err) {
        console.error('Analytics cache write failed:', err);
    }
}
