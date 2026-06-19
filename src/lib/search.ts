// src/lib/search.ts
// Full-text search query helpers for the doubts table
// Uses PostgreSQL tsvector/tsquery for efficient GIN-indexed search

import { SQL, sql } from "drizzle-orm";

/**
 * Sanitizes raw user input — strips tsquery special characters.
 */
function sanitizeQuery(raw: string): string {
    return raw
        .trim()
        .replace(/[&|!():*<>\\]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Builds a safe tsquery SQL expression from user input.
 * - Phrase search: input wrapped in quotes → phraseto_tsquery
 * - Keyword search: plain words → plainto_tsquery
 *
 * Returns null if input is empty after sanitization.
 */
function buildTsQuery(raw: string): SQL | null {
    const clean = sanitizeQuery(raw);
    if (!clean) return null;

    const trimmed = raw.trim();

    // Phrase search: user wrapped in quotes
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        const phrase = clean.replace(/"/g, "").trim();
        if (!phrase) return null;
        return sql`phraseto_tsquery('english', ${phrase})`;
    }

    // Keyword search: safe multi-word input
    return sql`plainto_tsquery('english', ${clean})`;
}

/**
 * Returns a WHERE condition for full-text search on the doubts table.
 * Uses the GIN-indexed search_vector column for O(log n) performance.
 *
 * Supports:
 * - Public scope (no classroom filter — caller adds classroomId IS NULL)
 * - Classroom-scoped queries (caller adds classroomId = X)
 *
 * @param raw - Raw search string from user input
 * @returns SQL WHERE condition, or null if query is empty (no-op → return all)
 */
export function buildSearchCondition(raw: string): SQL | null {
    if (!raw || !raw.trim()) return null;
    const tsQuery = buildTsQuery(raw);
    if (!tsQuery) return null;

    // Reference search_vector column by name since it's a raw SQL generated column
    return sql`"doubts"."search_vector" @@ ${tsQuery}`;
}

/**
 * Returns an ORDER BY expression for relevance ranking.
 * Higher ts_rank = more relevant match → appears first in results.
 *
 * @param raw - Raw search string from user input
 * @returns SQL ORDER BY expression, or null if query is empty
 */
export function buildRankOrder(raw: string): SQL | null {
    if (!raw || !raw.trim()) return null;
    const tsQuery = buildTsQuery(raw);
    if (!tsQuery) return null;

    return sql`ts_rank("doubts"."search_vector", ${tsQuery}) DESC`;
}