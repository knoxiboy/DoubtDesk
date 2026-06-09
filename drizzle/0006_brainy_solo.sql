CREATE TABLE "badge_definitions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "badge_definitions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" varchar(80) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text NOT NULL,
	"icon" varchar(10) NOT NULL,
	"condition" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "badge_definitions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "classroom_invites" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "classroom_invites_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"token_hash" varchar(128) NOT NULL,
	"classroom_id" integer NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"max_uses" integer,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "confusion_alerts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "confusion_alerts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"classroomId" integer NOT NULL,
	"topic" varchar(255) NOT NULL,
	"summary" text NOT NULL,
	"suggestedAction" text NOT NULL,
	"confidence" integer NOT NULL,
	"doubtCount" integer NOT NULL,
	"sampleDoubtIds" text NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"acknowledgedAt" timestamp,
	"acknowledgedBy" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "karma_transactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "karma_transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userEmail" varchar(255) NOT NULL,
	"points" integer NOT NULL,
	"eventType" varchar(50) NOT NULL,
	"replyId" integer,
	"doubtId" integer,
	"note" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_badges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userEmail" varchar(255) NOT NULL,
	"badgeId" integer NOT NULL,
	"awardedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_userEmail_badgeId_unique" UNIQUE("userEmail","badgeId")
);
--> statement-breakpoint
ALTER TABLE "classrooms" ADD COLUMN "pedagogyLevel" varchar(50) DEFAULT 'Undergraduate (Freshman)' NOT NULL;--> statement-breakpoint
ALTER TABLE "classrooms" ADD COLUMN "targetGradeLevel" integer DEFAULT 13 NOT NULL;--> statement-breakpoint
ALTER TABLE "replies" ADD COLUMN "grade_level" integer;--> statement-breakpoint
ALTER TABLE "replies" ADD COLUMN "complexity_score" integer;--> statement-breakpoint
ALTER TABLE "replies" ADD COLUMN "readability_score" integer;--> statement-breakpoint
ALTER TABLE "replies" ADD COLUMN "pedagogy_drifted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "replies" ADD COLUMN "drift_explanation" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "karmaScore" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "karmaLevel" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lastActiveDate" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lastContributionAt" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "currentStreak" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "classroom_invites" ADD CONSTRAINT "classroom_invites_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classroom_invites" ADD CONSTRAINT "classroom_invites_created_by_users_email_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confusion_alerts" ADD CONSTRAINT "confusion_alerts_classroomId_classrooms_id_fk" FOREIGN KEY ("classroomId") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "confusion_alerts" ADD CONSTRAINT "confusion_alerts_acknowledgedBy_users_email_fk" FOREIGN KEY ("acknowledgedBy") REFERENCES "public"."users"("email") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "karma_transactions" ADD CONSTRAINT "karma_transactions_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "karma_transactions" ADD CONSTRAINT "karma_transactions_replyId_replies_id_fk" FOREIGN KEY ("replyId") REFERENCES "public"."replies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "karma_transactions" ADD CONSTRAINT "karma_transactions_doubtId_doubts_id_fk" FOREIGN KEY ("doubtId") REFERENCES "public"."doubts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_badge_definitions_id_fk" FOREIGN KEY ("badgeId") REFERENCES "public"."badge_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "classroom_invites_token_hash_idx" ON "classroom_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "classroom_invites_classroom_id_idx" ON "classroom_invites" USING btree ("classroom_id");--> statement-breakpoint
CREATE INDEX "classroom_invites_expires_at_idx" ON "classroom_invites" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "confusion_alerts_classroomId_idx" ON "confusion_alerts" USING btree ("classroomId");--> statement-breakpoint
CREATE INDEX "confusion_alerts_status_idx" ON "confusion_alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "confusion_alerts_classroom_created_idx" ON "confusion_alerts" USING btree ("classroomId","createdAt");--> statement-breakpoint
CREATE INDEX "karma_tx_userEmail_idx" ON "karma_transactions" USING btree ("userEmail");--> statement-breakpoint
CREATE INDEX "karma_tx_eventType_idx" ON "karma_transactions" USING btree ("eventType");--> statement-breakpoint
CREATE INDEX "user_badge_userEmail_idx" ON "user_badges" USING btree ("userEmail");--> statement-breakpoint
CREATE INDEX "user_badge_badgeId_idx" ON "user_badges" USING btree ("badgeId");--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_user_email_users_email_fk" FOREIGN KEY ("user_email") REFERENCES "public"."users"("email") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_classroomId_classrooms_id_fk" FOREIGN KEY ("classroomId") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "classrooms_teacherEmail_idx" ON "classrooms" USING btree ("teacherEmail");--> statement-breakpoint
CREATE INDEX "idx_doubts_created" ON "doubts" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_doubts_solved" ON "doubts" USING btree ("isSolved");--> statement-breakpoint
CREATE INDEX "doubts_userEmail_classroomId_idx" ON "doubts" USING btree ("userEmail","classroomId");--> statement-breakpoint
CREATE INDEX "moderation_logs_userEmail_createdAt_idx" ON "moderation_logs" USING btree ("userEmail","createdAt");