import "dotenv/config";
import { db } from "../configs/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Applying notifications schema...");
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "notifications" (
                "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
                "userEmail" varchar(255) NOT NULL,
                "title" varchar(255) NOT NULL,
                "message" text NOT NULL,
                "link" text,
                "type" varchar(50) NOT NULL,
                "isRead" boolean DEFAULT false NOT NULL,
                "createdAt" timestamp DEFAULT now() NOT NULL
            );
        `);
        console.log("Notifications table created.");

        await db.execute(sql`
            DO $$ BEGIN
             ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userEmail_users_email_fk" FOREIGN KEY ("userEmail") REFERENCES "public"."users"("email") ON DELETE cascade ON UPDATE no action;
            EXCEPTION
             WHEN duplicate_object THEN null;
            END $$;
        `);
        console.log("Foreign key added.");

        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS "notification_userEmail_idx" ON "notifications" USING btree ("userEmail");
        `);
        console.log("Index added.");

        console.log("Migration successful.");
    } catch (error) {
        console.error("Migration failed:", error);
    }
}

main().catch(console.error).then(() => process.exit(0));
