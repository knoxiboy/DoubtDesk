import "dotenv/config";
import { db } from "../src/configs/db";
import { notificationsTable } from "../src/configs/schema";

async function main() {
    console.log("Testing insert...");
    try {
        const dummyNotifications = [
            {
                userEmail: "krishmakadiya2005@gmail.com",
                title: "Test",
                message: "Test message",
                link: "/dashboard/doubts",
                type: "reply",
                isRead: false,
            }
        ];
        await db.insert(notificationsTable).values(dummyNotifications);
        console.log("Success!");
    } catch (error: unknown) {
        const err = error as { code?: string; detail?: string; message?: string };
        console.error("Error inserting:");
        console.dir(error, { depth: null });
        if (err.code) console.error("Code:", err.code);
        if (err.detail) console.error("Detail:", err.detail);
    }
}

main().catch(console.error).then(() => process.exit(0));
