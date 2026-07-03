CREATE TABLE "doubt_upvotes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "doubt_upvotes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"doubtId" integer NOT NULL,
	"userEmail" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "doubt_upvotes_doubtId_idx" ON "doubt_upvotes" ("doubtId");
--> statement-breakpoint
CREATE INDEX "doubt_upvotes_userEmail_idx" ON "doubt_upvotes" ("userEmail");
--> statement-breakpoint
CREATE UNIQUE INDEX "doubt_upvote_unique_idx" ON "doubt_upvotes" ("doubtId","userEmail");
--> statement-breakpoint
ALTER TABLE "doubt_upvotes" ADD CONSTRAINT "doubt_upvotes_doubtId_doubts_id_fk" FOREIGN KEY ("doubtId") REFERENCES "doubts"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "doubt_upvotes" ADD CONSTRAINT "doubt_upvotes_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "users"("email") ON DELETE cascade;
