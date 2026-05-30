DELETE FROM "doubt_tags" WHERE "doubtId" NOT IN (SELECT id FROM "doubts");--> statement-breakpoint
DELETE FROM "doubt_tags" WHERE "tagId" NOT IN (SELECT id FROM "tags");--> statement-breakpoint
ALTER TABLE "doubt_tags" ADD CONSTRAINT "doubt_tags_doubtId_doubts_id_fk" FOREIGN KEY ("doubtId") REFERENCES "public"."doubts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doubt_tags" ADD CONSTRAINT "doubt_tags_tagId_tags_id_fk" FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;