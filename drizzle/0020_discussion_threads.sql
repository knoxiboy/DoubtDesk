CREATE TABLE IF NOT EXISTS "discussion_threads" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "discussion_threads_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" varchar(100) DEFAULT 'General' NOT NULL,
	"authorEmail" varchar(255) NOT NULL,
	"authorName" varchar(255) NOT NULL,
	"isAnonymous" boolean DEFAULT false NOT NULL,
	"replyCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
	ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_authorEmail_users_email_fk" FOREIGN KEY ("authorEmail") REFERENCES "users"("email") ON DELETE cascade ON UPDATE no action;
EXCEPTION
	WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "discussion_threads_created_at_idx" ON "discussion_threads" USING btree ("createdAt");
