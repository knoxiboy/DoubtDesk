CREATE TABLE "aiSessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "aiSessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userName" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"reply" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"actorEmail" varchar(255) NOT NULL,
	"targetEmail" varchar(255),
	"action" varchar(100) NOT NULL,
	"resourceType" varchar(50) NOT NULL,
	"resourceId" varchar(255),
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_flags" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "content_flags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"doubt_id" integer NOT NULL,
	"reporter_email" varchar(255) NOT NULL,
	"reason" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_flags_doubtId_reporterEmail_unique" UNIQUE("doubt_id","reporter_email")
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_jobs" (
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
);
--> statement-breakpoint
ALTER TABLE "chat_history" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "resumes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "roadmaps" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shared_chats" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "chat_history" CASCADE;--> statement-breakpoint
DROP TABLE "resumes" CASCADE;--> statement-breakpoint
DROP TABLE "roadmaps" CASCADE;--> statement-breakpoint
DROP TABLE "shared_chats" CASCADE;--> statement-breakpoint
ALTER TABLE "organization_memberships" DROP CONSTRAINT "org_memberships_userEmail_orgId_unique";--> statement-breakpoint
ALTER TABLE "classrooms" DROP CONSTRAINT "classrooms_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "organization_memberships" DROP CONSTRAINT "organization_memberships_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "organization_memberships" DROP CONSTRAINT "organization_memberships_user_email_users_email_fk";
--> statement-breakpoint
DROP INDEX "classrooms_orgId_idx";--> statement-breakpoint
ALTER TABLE "organization_memberships" ALTER COLUMN "role" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "organization_memberships" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "classrooms" ADD COLUMN "organizationId" integer;--> statement-breakpoint
ALTER TABLE "doubts" ADD COLUMN "difficulty" varchar(20) DEFAULT 'intermediate';--> statement-breakpoint
ALTER TABLE "doubts" ADD COLUMN "isHidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD COLUMN "organizationId" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD COLUMN "userEmail" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "ownerEmail" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "createdAt" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "content_flags" ADD CONSTRAINT "content_flags_doubt_id_doubts_id_fk" FOREIGN KEY ("doubt_id") REFERENCES "public"."doubts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_flags" ADD CONSTRAINT "content_flags_reporter_email_users_email_fk" FOREIGN KEY ("reporter_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_jobs" ADD CONSTRAINT "video_jobs_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_logs" USING btree ("actorEmail");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "content_flags_doubtId_idx" ON "content_flags" USING btree ("doubt_id");--> statement-breakpoint
CREATE INDEX "content_flags_createdAt_idx" ON "content_flags" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "video_jobs_user_email_idx" ON "video_jobs" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "video_jobs_status_created_at_idx" ON "video_jobs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_doubts_classroom_created" ON "doubts" USING btree ("classroomId","createdAt");--> statement-breakpoint
CREATE INDEX "idx_doubts_classroom_type" ON "doubts" USING btree ("classroomId","type");--> statement-breakpoint
CREATE INDEX "idx_doubts_classroom_solved" ON "doubts" USING btree ("classroomId","isSolved");--> statement-breakpoint
CREATE INDEX "doubts_embedding_idx" ON "doubts" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "classrooms" DROP COLUMN "organization_id";--> statement-breakpoint
ALTER TABLE "organization_memberships" DROP COLUMN "organization_id";--> statement-breakpoint
ALTER TABLE "organization_memberships" DROP COLUMN "user_email";--> statement-breakpoint
ALTER TABLE "organization_memberships" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "owner_email";--> statement-breakpoint
ALTER TABLE "organizations" DROP COLUMN "created_at";--> statement-breakpoint
DROP TYPE "public"."org_role";