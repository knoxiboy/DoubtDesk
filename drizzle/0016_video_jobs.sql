-- Async video generation jobs (issue #321).
-- Tracks the OCR -> AI script -> TTS -> Remotion render pipeline run as a
-- background Inngest job, so /api/video/generate can return a jobId immediately
-- and clients can stream progress from /api/video/status.
-- Idempotent so it is safe to re-run via the manual migrate runner.
CREATE TABLE IF NOT EXISTS "video_jobs" (
    "id" varchar(64) PRIMARY KEY NOT NULL,
    "user_email" varchar(255) NOT NULL,
    "status" varchar(20) DEFAULT 'queued' NOT NULL,
    "progress" integer DEFAULT 0 NOT NULL,
    "step" varchar(255),
    "video_type" varchar(20),
    "video_url" text,
    "error" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
    ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "users"("email") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_jobs_user_email_idx" ON "video_jobs" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "video_jobs_status_created_at_idx" ON "video_jobs" USING btree ("status", "created_at");