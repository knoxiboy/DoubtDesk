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
ALTER TABLE "doubts" ADD COLUMN "isHidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "content_flags" ADD CONSTRAINT "content_flags_doubt_id_doubts_id_fk" FOREIGN KEY ("doubt_id") REFERENCES "public"."doubts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_flags" ADD CONSTRAINT "content_flags_reporter_email_users_email_fk" FOREIGN KEY ("reporter_email") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_flags_doubtId_idx" ON "content_flags" USING btree ("doubt_id");--> statement-breakpoint
CREATE INDEX "content_flags_createdAt_idx" ON "content_flags" USING btree ("created_at");
