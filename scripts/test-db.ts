import { drizzle } from "drizzle-orm/neon-http";
import { chatHistoryTable } from "../src/configs/schema";
import { eq, desc, sql } from "drizzle-orm";
import * as dotenv from "dotenv";
import { getDatabaseUrl } from "../src/configs/database-url";
dotenv.config();

const db = drizzle(getDatabaseUrl());

// reusable function
export async function getChatSessionsByEmail(
  email: string,
  limit = 20,
  offset = 0
) {
  return await db
    .select({
      chatId: chatHistoryTable.chatId,
      chatTitle: sql<string>`MIN(${chatHistoryTable.chatTitle})`,
      createdAt: sql<string>`MAX(${chatHistoryTable.createdAt})`,
    })
    .from(chatHistoryTable)
    .where(eq(chatHistoryTable.userEmail, email))
    .groupBy(chatHistoryTable.chatId)
    .orderBy(desc(sql`MAX(${chatHistoryTable.createdAt})`))
    .limit(limit)
    .offset(offset);
}
async function testQuery() {
  try {
    console.log("Testing Chat History Query...");

    const allRecords = await db.select().from(chatHistoryTable).limit(5);
    console.log("Sample records:", allRecords);

    if (!allRecords[0]?.userEmail) {
      console.warn("No records found in DB. Exiting.");
      return;
    }
    const email = allRecords[0].userEmail;
    console.log("Testing with email:", email);

    // now using reusable function
    const sessions = await getChatSessionsByEmail(email);

    console.log("Query Successful!");
    console.log("Results count:", sessions.length);
  } catch (error) {
    console.error("Query Failed!");
    console.error(error);
  }
}

testQuery();
