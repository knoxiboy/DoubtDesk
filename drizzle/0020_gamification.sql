ALTER TABLE "users" ADD COLUMN "helpful_votes" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN "unlocked_badges" jsonb DEFAULT '[]'::jsonb NOT NULL;
