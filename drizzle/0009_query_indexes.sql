CREATE INDEX IF NOT EXISTS "classrooms_teacherEmail_idx" ON "classrooms" USING btree ("teacherEmail");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "doubts_userEmail_classroomId_idx" ON "doubts" USING btree ("userEmail", "classroomId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moderation_logs_userEmail_createdAt_idx" ON "moderation_logs" USING btree ("userEmail", "createdAt");
