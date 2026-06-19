ALTER TABLE "classrooms" ADD COLUMN "invite_code_expires_at" timestamptz;--> statement-breakpoint
ALTER TABLE "classrooms" ADD COLUMN "allowed_email_domains" text[];
