CREATE TABLE "doubt_me_toos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "doubt_me_toos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"doubtId" integer NOT NULL,
	"userEmail" varchar(255) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "doubt_me_toos_user_doubt_unique" UNIQUE("doubtId","userEmail")
);
--> statement-breakpoint
ALTER TABLE "doubts" ADD COLUMN "meTooCount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "doubt_me_toos" ADD CONSTRAINT "doubt_me_toos_doubtId_doubts_id_fk" FOREIGN KEY ("doubtId") REFERENCES "public"."doubts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doubt_me_toos" ADD CONSTRAINT "doubt_me_toos_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;