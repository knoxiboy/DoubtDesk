-- Composite indexes for the doubts feed (issue #319).
-- Support the common filter + recency-ordering access pattern:
--   WHERE classroomId = ? [AND type = ? | AND isSolved = ?] ORDER BY createdAt DESC
-- createdAt is the trailing column so the index covers both the filter and the
-- ORDER BY (no separate sort step). Idempotent so it is safe to re-run via the
-- manual migrate runner.
CREATE INDEX IF NOT EXISTS "doubts_classroomId_createdAt_idx" ON "doubts" USING btree ("classroomId", "createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doubts_classroomId_type_createdAt_idx" ON "doubts" USING btree ("classroomId", "type", "createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doubts_classroomId_isSolved_createdAt_idx" ON "doubts" USING btree ("classroomId", "isSolved", "createdAt");
