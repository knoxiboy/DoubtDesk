import "dotenv/config";
import { db } from "../configs/db";
import { notificationsTable } from "../configs/schema";

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
    } catch (error: any) {
        console.error("Error inserting:");
        console.dir(error, { depth: null });
        if (error.code) console.error("Code:", error.code);
        if (error.detail) console.error("Detail:", error.detail);
    }
}

main().catch(console.error).then(() => process.exit(0));
