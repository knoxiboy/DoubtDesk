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
ALTER TABLE "classroom_invites" ADD CONSTRAINT "classroom_invites_classroom_id_classrooms_id_fk" FOREIGN KEY ("classroom_id") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "classroom_invites" ADD CONSTRAINT "classroom_invites_created_by_users_email_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "classroom_invites_token_hash_idx" ON "classroom_invites" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX "classroom_invites_classroom_id_idx" ON "classroom_invites" USING btree ("classroom_id");
--> statement-breakpoint
CREATE INDEX "classroom_invites_expires_at_idx" ON "classroom_invites" USING btree ("expires_at");
