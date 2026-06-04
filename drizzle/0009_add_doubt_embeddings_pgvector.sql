-- Enable pgvector for embedding storage and similarity search
CREATE EXTENSION IF NOT EXISTS vector;

--> statement-breakpoint
-- Add embedding column to doubts table (store a fixed-length vector)
-- Using 1536 dimensions aligns with common embedding models; if you switch models,
-- update this migration and the embedding generation code accordingly.
ALTER TABLE "doubts"
ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

--> statement-breakpoint
-- HNSW index for fast cosine similarity search.
-- Requires pgvector >= 0.5.
-- If your environment doesn't support HNSW, switch to ivfflat.
CREATE INDEX IF NOT EXISTS "doubts_embedding_cosine_idx"
ON "doubts"
USING hnsw ("embedding" vector_cosine_ops);

--> statement-breakpoint
-- Optional: btree indexes for filtering are already present (classroomId/type/createdAt).

