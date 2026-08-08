ALTER TABLE "likes" RENAME COLUMN "userName" TO "userEmail";
ALTER TABLE "reply_likes" RENAME COLUMN "userName" TO "userEmail";

ALTER TABLE "likes" DROP CONSTRAINT IF EXISTS "likes_userName_doubtId_unique";
ALTER TABLE "likes" ADD CONSTRAINT "likes_userEmail_doubtId_unique" UNIQUE("userEmail","doubtId");

ALTER TABLE "reply_likes" DROP CONSTRAINT IF EXISTS "reply_likes_userName_replyId_unique";
ALTER TABLE "reply_likes" ADD CONSTRAINT "reply_likes_userEmail_replyId_unique" UNIQUE("userEmail","replyId");

-- Backfill renamed userEmail values that still hold display names, then clean orphans
UPDATE "likes" SET "userEmail" = u."email" FROM "users" u WHERE lower("likes"."userEmail") = lower(u."name") OR lower("likes"."userEmail") = lower(u."email");
UPDATE "reply_likes" SET "userEmail" = u."email" FROM "users" u WHERE lower("reply_likes"."userEmail") = lower(u."name") OR lower("reply_likes"."userEmail") = lower(u."email");

DELETE FROM "likes" WHERE "userEmail" NOT IN (SELECT "email" FROM "users");
DELETE FROM "reply_likes" WHERE "userEmail" NOT IN (SELECT "email" FROM "users");

ALTER TABLE "likes" DROP CONSTRAINT IF EXISTS "likes_userName_users_email_fk";
ALTER TABLE "likes" ADD CONSTRAINT "likes_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "reply_likes" DROP CONSTRAINT IF EXISTS "reply_likes_userName_users_email_fk";
ALTER TABLE "reply_likes" ADD CONSTRAINT "reply_likes_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;
