-- Composite indexes for the doubts feed (issue #319).
-- Support the common filter + recency-ordering access pattern:
--   WHERE classroomId = ? [AND type = ? | AND isSolved = ?] ORDER BY createdAt DESC
-- Idempotent so it is safe to re-run via the manual migrate runner.
CREATE INDEX IF NOT EXISTS "doubts_classroomId_createdAt_idx" ON "doubts" USING btree ("classroomId", "createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doubts_classroomId_type_idx" ON "doubts" USING btree ("classroomId", "type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doubts_classroomId_isSolved_idx" ON "doubts" USING btree ("classroomId", "isSolved");
