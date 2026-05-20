CREATE TABLE "bookmarks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bookmarks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userEmail" varchar(255) NOT NULL,
	"doubtId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chat_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"chatId" varchar(255) NOT NULL,
	"chatTitle" varchar(255),
	"userEmail" varchar(255) NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classrooms" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "classrooms_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"university" varchar(255) NOT NULL,
	"year" varchar(50) NOT NULL,
	"teacherEmail" varchar(255) NOT NULL,
	"inviteCode" varchar(10) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "classrooms_inviteCode_unique" UNIQUE("inviteCode")
);
--> statement-breakpoint
CREATE TABLE "cover_letters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cover_letters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userEmail" varchar(255) NOT NULL,
	"jobDescription" text NOT NULL,
	"userDetails" text NOT NULL,
	"coverLetter" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doubt_tags" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "doubt_tags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"doubtId" integer NOT NULL,
	"tagId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "doubts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "doubts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userName" varchar(255) NOT NULL,
	"userEmail" varchar(255),
	"classroomId" integer,
	"subject" varchar(100) NOT NULL,
	"subTopic" varchar(255),
	"content" text,
	"imageUrl" text,
	"likes" integer DEFAULT 0,
	"isSolved" varchar(20) DEFAULT 'unsolved',
	"solvedReplyId" integer,
	"type" varchar(20) DEFAULT 'community',
	"isPinned" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "likes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userName" varchar(255) NOT NULL,
	"doubtId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "likes_userName_doubtId_unique" UNIQUE("userName","doubtId")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "memberships_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userEmail" varchar(255) NOT NULL,
	"classroomId" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_userEmail_classroomId_unique" UNIQUE("userEmail","classroomId")
);
--> statement-breakpoint
CREATE TABLE "moderation_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "moderation_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userEmail" varchar(255) NOT NULL,
	"reason" text NOT NULL,
	"violationType" varchar(50) NOT NULL,
	"contentSnippet" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replies" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "replies_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"doubtId" integer NOT NULL,
	"userName" varchar(255) NOT NULL,
	"userEmail" varchar(255),
	"type" varchar(20) NOT NULL,
	"content" text,
	"imageUrl" text,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reply_likes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reply_likes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userName" varchar(255) NOT NULL,
	"replyId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reply_likes_userName_replyId_unique" UNIQUE("userName","replyId")
);
--> statement-breakpoint
CREATE TABLE "resume_analysis" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "resume_analysis_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userEmail" varchar(255) NOT NULL,
	"resumeText" text NOT NULL,
	"jobDescription" text,
	"analysisData" text NOT NULL,
	"resumeName" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "resumes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userEmail" varchar(255) NOT NULL,
	"resumeName" varchar(255) NOT NULL,
	"resumeData" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resumes_userEmail_resumeName_unique" UNIQUE("userEmail","resumeName")
);
--> statement-breakpoint
CREATE TABLE "roadmaps" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "roadmaps_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userEmail" varchar(255) NOT NULL,
	"targetField" varchar(255) NOT NULL,
	"roadmapData" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_chats" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "shared_chats_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"chatId" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shared_chats_chatId_unique" UNIQUE("chatId")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tags_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(80) NOT NULL,
	"normalizedName" varchar(80) NOT NULL,
	"classroomId" integer,
	"createdByEmail" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"university" varchar(255),
	"year" varchar(50),
	"collegeEmail" varchar(255),
	"role" varchar(20),
	"onboarded" boolean DEFAULT false,
	"violationCount" integer DEFAULT 0 NOT NULL,
	"isBlocked" boolean DEFAULT false NOT NULL,
	"blockedUntil" timestamp,
	"blockCount" integer DEFAULT 0 NOT NULL,
	"emailNotificationsEnabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "chat_history" ADD CONSTRAINT "chat_history_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doubts" ADD CONSTRAINT "doubts_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doubts" ADD CONSTRAINT "doubts_classroomId_classrooms_id_fk" FOREIGN KEY ("classroomId") REFERENCES "public"."classrooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_doubtId_doubts_id_fk" FOREIGN KEY ("doubtId") REFERENCES "public"."doubts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_classroomId_classrooms_id_fk" FOREIGN KEY ("classroomId") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_doubtId_doubts_id_fk" FOREIGN KEY ("doubtId") REFERENCES "public"."doubts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reply_likes" ADD CONSTRAINT "reply_likes_replyId_replies_id_fk" FOREIGN KEY ("replyId") REFERENCES "public"."replies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resume_analysis" ADD CONSTRAINT "resume_analysis_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookmark_userEmail_idx" ON "bookmarks" USING btree ("userEmail");--> statement-breakpoint
CREATE INDEX "bookmark_doubtId_idx" ON "bookmarks" USING btree ("doubtId");--> statement-breakpoint
CREATE INDEX "chatHistory_chatId_idx" ON "chat_history" USING btree ("chatId");--> statement-breakpoint
CREATE INDEX "doubt_tag_doubtId_idx" ON "doubt_tags" USING btree ("doubtId");--> statement-breakpoint
CREATE INDEX "doubt_tag_tagId_idx" ON "doubt_tags" USING btree ("tagId");--> statement-breakpoint
CREATE UNIQUE INDEX "doubt_tag_unique_idx" ON "doubt_tags" USING btree ("doubtId","tagId");--> statement-breakpoint
CREATE INDEX "doubt_classroomId_idx" ON "doubts" USING btree ("classroomId");--> statement-breakpoint
CREATE INDEX "type_idx" ON "doubts" USING btree ("type");--> statement-breakpoint
CREATE INDEX "subject_idx" ON "doubts" USING btree ("subject");--> statement-breakpoint
CREATE INDEX "userEmail_idx" ON "memberships" USING btree ("userEmail");--> statement-breakpoint
CREATE INDEX "classroomId_idx" ON "memberships" USING btree ("classroomId");--> statement-breakpoint
CREATE INDEX "doubtId_idx" ON "replies" USING btree ("doubtId");--> statement-breakpoint
CREATE INDEX "tag_classroomId_idx" ON "tags" USING btree ("classroomId");--> statement-breakpoint
CREATE UNIQUE INDEX "tag_scope_name_idx" ON "tags" USING btree ("normalizedName","classroomId");