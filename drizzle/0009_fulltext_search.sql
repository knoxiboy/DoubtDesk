ALTER TABLE "doubts" ADD COLUMN IF NOT EXISTS "search_vector" tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce("content", '') || ' ' || coalesce("subject", '') || ' ' || coalesce("sub_topic", ''))) STORED;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doubts_search_vector" ON "doubts" USING GIN ("search_vector");