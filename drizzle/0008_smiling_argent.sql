ALTER TABLE "classrooms" ADD COLUMN "invite_code_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "classrooms" ADD COLUMN "allowed_email_domains" text[];