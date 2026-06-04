-- Clean up orphaned tags
DELETE FROM "tags" WHERE "classroomId" IS NOT NULL AND "classroomId" NOT IN (SELECT id FROM "classrooms");--> statement-breakpoint

-- Clean up orphaned shared_chats
DELETE FROM "shared_chats" WHERE "chatId" NOT IN (SELECT "chatId" FROM "chat_history");--> statement-breakpoint

-- Add foreign key to tags.classroomId with cascade
DO $$ BEGIN
 ALTER TABLE "tags" ADD CONSTRAINT "tags_classroomId_classrooms_id_fk" FOREIGN KEY ("classroomId") REFERENCES "public"."classrooms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_delete_shared_chat ON "chat_history";--> statement-breakpoint

-- Create function to handle shared chat cleanup on chat_history delete
CREATE OR REPLACE FUNCTION delete_shared_chat_on_history_delete()
RETURNS TRIGGER AS $func$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "chat_history" WHERE "chatId" = OLD."chatId") THEN
        DELETE FROM "shared_chats" WHERE "chatId" = OLD."chatId";
    END IF;
    RETURN OLD;
END;
$func$ LANGUAGE plpgsql;--> statement-breakpoint

-- Attach trigger
CREATE TRIGGER trigger_delete_shared_chat
AFTER DELETE ON "chat_history"
FOR EACH ROW
EXECUTE FUNCTION delete_shared_chat_on_history_delete();
