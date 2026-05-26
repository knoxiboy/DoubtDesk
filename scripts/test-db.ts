import { drizzle } from "drizzle-orm/neon-http";
import { chatHistoryTable } from "../configs/schema";
import { eq, desc, sql } from "drizzle-orm";
import * as dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.NEXT_PUBLIC_NEON_DB_CONNECTION_STRING!);

async function testQuery() {
  try {
    console.log("Testing Chat History Query...");

    // First, check if there are ANY records
    const allRecords = await db.select().from(chatHistoryTable).limit(5);
    console.log("Sample records:", allRecords);

    if (!allRecords[0]?.userEmail) {
      console.warn("No records found in DB. Exiting.");
      return;
    }
    const email = allRecords[0].userEmail;
    console.log("Testing with email:", email);

        const sessions = await db
            .select({
                chatId: chatHistoryTable.chatId,
                chatTitle: sql<string>`MAX(${chatHistoryTable.chatTitle})`,
                createdAt: sql<string>`MAX(${chatHistoryTable.createdAt})`,
            })
            .from(chatHistoryTable)
            .where(eq(chatHistoryTable.userEmail, email))
            .groupBy(chatHistoryTable.chatId)
            .orderBy(desc(sql`MAX(${chatHistoryTable.createdAt})`));

    console.log("Query Successful!");
    console.log("Results count:", sessions.length);
  } catch (error) {
    console.error("Query Failed!");
    console.error(error);
  }
}

testQuery();
