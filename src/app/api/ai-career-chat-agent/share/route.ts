export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/configs/db";
import { sharedChatsTable, chatHistoryTable } from "@/configs/schema";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const chatId = searchParams.get("chatId");

        if (!chatId) {
            return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
        }

        const sharedChat = await db
            .select()
            .from(sharedChatsTable)
            .where(eq(sharedChatsTable.chatId, chatId))
            .execute();

        return NextResponse.json({ shared: sharedChat.length > 0 });
    } catch (error: unknown) {
        console.error("Fetch Share Status Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const clerkUser = await currentUser();
        if (!clerkUser || !clerkUser.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userEmail = clerkUser.primaryEmailAddress.emailAddress;
        const body = await req.json();
        const { chatId, shared } = body;

        if (!chatId) {
            return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
        }

        // Verify ownership (optional but recommended)
        const chatExists = await db
            .select()
            .from(chatHistoryTable)
            .where(and(eq(chatHistoryTable.chatId, chatId), eq(chatHistoryTable.userEmail, userEmail)))
            .limit(1);

        if (chatExists.length === 0) {
            return NextResponse.json({ error: "Chat not found or unauthorized" }, { status: 404 });
        }

        if (shared) {
            // Enable sharing
            await db
                .insert(sharedChatsTable)
                .values({ chatId })
                .onConflictDoNothing()
                .execute();
        } else {
            // Disable sharing
            await db
                .delete(sharedChatsTable)
                .where(eq(sharedChatsTable.chatId, chatId))
                .execute();
        }

        return NextResponse.json({ success: true, shared });
    } catch (error: unknown) {
        console.error("Toggle Share Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
