CREATE TYPE "public"."org_role" AS ENUM('owner', 'admin', 'teacher', 'member');--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organization_memberships_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"organization_id" integer NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"role" "org_role" DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_memberships_userEmail_orgId_unique" UNIQUE("user_email","organization_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "organizations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"owner_email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "practice_attempts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "practice_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_email" varchar(255) NOT NULL,
	"original_doubt_id" integer NOT NULL,
	"generated_question" text NOT NULL,
	"user_answer" text,
	"is_correct" boolean,
	"ai_feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "likes" DROP CONSTRAINT "likes_userName_doubtId_unique";--> statement-breakpoint
ALTER TABLE "reply_likes" DROP CONSTRAINT "reply_likes_userName_replyId_unique";--> statement-breakpoint
ALTER TABLE "doubts" ALTER COLUMN "userEmail" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "replies" ALTER COLUMN "user_email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "classrooms" ADD COLUMN "organization_id" integer;--> statement-breakpoint
ALTER TABLE "likes" ADD COLUMN "userEmail" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "reply_likes" ADD COLUMN "userEmail" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "interests" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "learningGoals" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subjects" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "instituteInfo" text;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_attempts" ADD CONSTRAINT "practice_attempts_original_doubt_id_doubts_id_fk" FOREIGN KEY ("original_doubt_id") REFERENCES "public"."doubts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "practice_attempts_userEmail_idx" ON "practice_attempts" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "practice_attempts_doubtId_idx" ON "practice_attempts" USING btree ("original_doubt_id");--> statement-breakpoint
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_likes" ADD CONSTRAINT "reply_likes_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "classrooms_orgId_idx" ON "classrooms" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "doubts" DROP COLUMN "userName";--> statement-breakpoint
ALTER TABLE "likes" DROP COLUMN "userName";--> statement-breakpoint
ALTER TABLE "replies" DROP COLUMN "user_name";--> statement-breakpoint
ALTER TABLE "reply_likes" DROP COLUMN "userName";--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_userEmail_doubtId_unique" UNIQUE("userEmail","doubtId");--> statement-breakpoint
ALTER TABLE "reply_likes" ADD CONSTRAINT "reply_likes_userEmail_replyId_unique" UNIQUE("userEmail","replyId");