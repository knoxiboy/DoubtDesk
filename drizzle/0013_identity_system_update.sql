ALTER TABLE "likes" RENAME COLUMN "userName" TO "userEmail";
--> statement-breakpoint
ALTER TABLE "reply_likes" RENAME COLUMN "userName" TO "userEmail";
--> statement-breakpoint
ALTER TABLE "likes" DROP CONSTRAINT IF EXISTS "likes_userName_doubtId_unique";
--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_userEmail_doubtId_unique" UNIQUE("userEmail","doubtId");
--> statement-breakpoint
ALTER TABLE "reply_likes" DROP CONSTRAINT IF EXISTS "reply_likes_userName_replyId_unique";
--> statement-breakpoint
ALTER TABLE "reply_likes" ADD CONSTRAINT "reply_likes_userEmail_replyId_unique" UNIQUE("userEmail","replyId");
--> statement-breakpoint
-- Fail fast when a legacy identity matches multiple users (nondeterministic UPDATE FROM).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM (
            SELECT lower(l."userEmail") AS ident
            FROM "likes" l
            JOIN "users" u
              ON lower(l."userEmail") = lower(u."name")
              OR lower(l."userEmail") = lower(u."email")
            GROUP BY lower(l."userEmail")
            HAVING count(DISTINCT u."email") > 1
        ) ambiguous
    ) THEN
        RAISE EXCEPTION 'Ambiguous likes identity mapping: resolve duplicate user names before migrating';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM (
            SELECT lower(rl."userEmail") AS ident
            FROM "reply_likes" rl
            JOIN "users" u
              ON lower(rl."userEmail") = lower(u."name")
              OR lower(rl."userEmail") = lower(u."email")
            GROUP BY lower(rl."userEmail")
            HAVING count(DISTINCT u."email") > 1
        ) ambiguous
    ) THEN
        RAISE EXCEPTION 'Ambiguous reply_likes identity mapping: resolve duplicate user names before migrating';
    END IF;
END $$;
--> statement-breakpoint
-- Backfill renamed userEmail values that still hold display names (one-to-one matches only)
UPDATE "likes" SET "userEmail" = u."email" FROM "users" u WHERE lower("likes"."userEmail") = lower(u."name") OR lower("likes"."userEmail") = lower(u."email");
--> statement-breakpoint
UPDATE "reply_likes" SET "userEmail" = u."email" FROM "users" u WHERE lower("reply_likes"."userEmail") = lower(u."name") OR lower("reply_likes"."userEmail") = lower(u."email");
--> statement-breakpoint
DELETE FROM "likes" WHERE "userEmail" NOT IN (SELECT "email" FROM "users");
--> statement-breakpoint
DELETE FROM "reply_likes" WHERE "userEmail" NOT IN (SELECT "email" FROM "users");
--> statement-breakpoint
ALTER TABLE "likes" DROP CONSTRAINT IF EXISTS "likes_userName_users_email_fk";
--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reply_likes" DROP CONSTRAINT IF EXISTS "reply_likes_userName_users_email_fk";
--> statement-breakpoint
ALTER TABLE "reply_likes" ADD CONSTRAINT "reply_likes_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;
