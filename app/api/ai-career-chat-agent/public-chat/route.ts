export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/configs/db";
import { chatHistoryTable, sharedChatsTable } from "@/configs/schema";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const chatId = searchParams.get("chatId");

        if (!chatId) {
            return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
        }

        // Check if chat is shared
        const isShared = await db
            .select()
            .from(sharedChatsTable)
            .where(eq(sharedChatsTable.chatId, chatId))
            .execute();

        if (isShared.length === 0) {
            return NextResponse.json({ error: "This chat is not shared or does not exist" }, { status: 403 });
        }

        // Fetch messages
        const messages = await db
            .select()
            .from(chatHistoryTable)
            .where(eq(chatHistoryTable.chatId, chatId))
            .orderBy(chatHistoryTable.createdAt);

        return NextResponse.json(messages);
    } catch (error: any) {
        console.error("Fetch Public Chat Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
