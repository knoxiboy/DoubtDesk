-- Enable pgvector for embedding storage and similarity search
CREATE EXTENSION IF NOT EXISTS vector;

--> statement-breakpoint
-- Add embedding column to doubts table (store a fixed-length vector)
-- Using 1536 dimensions aligns with common embedding models; if you switch models,
-- update this migration and the embedding generation code accordingly.
ALTER TABLE "doubts"
ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

--> statement-breakpoint
-- Similarity index.
-- Prefer HNSW when supported by the installed pgvector version/extension.
-- If HNSW isn't available, fall back to IVFFLAT (supported in older pgvector versions).
DO $$
BEGIN
  -- If the extension supports HNSW, create the HNSW index.
  -- Feature detection is best-effort: if HNSW creation fails, we fall back to IVFFLAT.
  -- (Different pgvector versions expose different catalog objects, so a strict check is brittle.)
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc
    WHERE proname ILIKE '%hnsw%'
  ) THEN

    -- Best-effort: if HNSW support exists, create the HNSW index.
    EXECUTE 'CREATE INDEX IF NOT EXISTS "doubts_embedding_cosine_idx_hnsw" ' ||
            'ON "doubts" USING hnsw ("embedding" vector_cosine_ops)';
  ELSE
    -- Older pgvector: create IVFFLAT index.
    EXECUTE 'CREATE INDEX IF NOT EXISTS "doubts_embedding_cosine_idx_ivfflat" ' ||
            'ON "doubts" USING ivfflat ("embedding" vector_cosine_ops)';
  END IF;
EXCEPTION
  WHEN others THEN
    -- If the HNSW detection/creation fails for any reason, fall back to IVFFLAT.
    EXECUTE 'CREATE INDEX IF NOT EXISTS "doubts_embedding_cosine_idx_ivfflat" ' ||
            'ON "doubts" USING ivfflat ("embedding" vector_cosine_ops)';
END
$$;


--> statement-breakpoint
-- Optional: btree indexes for filtering are already present (classroomId/type/createdAt).

