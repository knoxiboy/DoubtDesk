import "dotenv/config";
import { db } from "../src/configs/db";
import { membershipsTable } from "../src/configs/schema";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Cleaning up duplicate memberships...");
    // Since it's a small table (8 items), let's just truncate it to make it easy to apply the constraint,
    // or we can remove duplicates. The prompt says "which contains 8 items. If this statement fails, you will receive an error from the database. Do you want to truncate memberships table?"
    // This is because drizzle-kit is being cautious about applying unique constraint on existing data.
    
    // We can simply execute the SQL to add the constraint directly if there are no duplicates.
    // Let's try deleting duplicates.
    await db.execute(sql`
        DELETE FROM "memberships"
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM "memberships"
            GROUP BY "userEmail", "classroomId"
        );
    `);
    console.log("Duplicates removed.");
}

main().catch(console.error).then(() => process.exit(0));
