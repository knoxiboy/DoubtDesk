CREATE TABLE "notifications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userEmail" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"type" varchar(50) NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "replies" DROP CONSTRAINT "replies_doubtId_doubts_id_fk";
--> statement-breakpoint
DROP INDEX "doubtId_idx";--> statement-breakpoint
ALTER TABLE "moderation_logs" ADD COLUMN "status" varchar(20) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "replies" ADD COLUMN "doubt_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "replies" ADD COLUMN "user_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "replies" ADD COLUMN "user_email" varchar(255);--> statement-breakpoint
ALTER TABLE "replies" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "replies" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "themePreference" varchar(10) DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_userEmail_idx" ON "notifications" USING btree ("userEmail");--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_doubtId_doubts_id_fk" FOREIGN KEY ("doubtId") REFERENCES "public"."doubts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_doubt_id_doubts_id_fk" FOREIGN KEY ("doubt_id") REFERENCES "public"."doubts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doubtId_idx" ON "replies" USING btree ("doubt_id");--> statement-breakpoint
ALTER TABLE "replies" DROP COLUMN "doubtId";--> statement-breakpoint
ALTER TABLE "replies" DROP COLUMN "userName";--> statement-breakpoint
ALTER TABLE "replies" DROP COLUMN "userEmail";--> statement-breakpoint
ALTER TABLE "replies" DROP COLUMN "imageUrl";--> statement-breakpoint
ALTER TABLE "replies" DROP COLUMN "createdAt";--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_userEmail_doubtId_unique" UNIQUE("userEmail","doubtId");