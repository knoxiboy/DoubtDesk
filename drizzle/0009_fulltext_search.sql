ALTER TABLE "doubts" ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce("content", '') || ' ' || coalesce("subject", '') || ' ' || coalesce("subTopic", ''))) STORED;
--> statement-breakpoint
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_doubts_search_vector" ON "doubts" USING GIN ("search_vector");