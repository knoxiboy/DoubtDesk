CREATE TABLE IF NOT EXISTS "practice_attempts" (
    "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    "user_email" varchar(255) NOT NULL,
    "original_doubt_id" integer NOT NULL,
    "generated_question" text NOT NULL,
    "user_answer" text,
    "is_correct" boolean,
    "ai_feedback" text,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "practice_attempts_userEmail_idx" ON "practice_attempts" ("user_email");
CREATE INDEX IF NOT EXISTS "practice_attempts_doubtId_idx" ON "practice_attempts" ("original_doubt_id");

DO $$ BEGIN
    ALTER TABLE "practice_attempts"
        ADD CONSTRAINT "practice_attempts_user_email_users_email_fk"
        FOREIGN KEY ("user_email") REFERENCES "users"("email")
        ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "practice_attempts"
        ADD CONSTRAINT "practice_attempts_original_doubt_id_doubts_id_fk"
        FOREIGN KEY ("original_doubt_id") REFERENCES "doubts"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
