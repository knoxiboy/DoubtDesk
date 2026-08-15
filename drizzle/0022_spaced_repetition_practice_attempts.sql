ALTER TABLE "practice_attempts" ADD COLUMN "next_review_at" timestamp;
--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD COLUMN "interval_days" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD COLUMN "ease_factor" real DEFAULT 2.5 NOT NULL;
--> statement-breakpoint
CREATE INDEX "practice_attempts_userEmail_nextReviewAt_idx" ON "practice_attempts" USING btree ("user_email","next_review_at");