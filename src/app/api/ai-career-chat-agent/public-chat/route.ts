export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/configs/db";
import { chatHistoryTable, sharedChatsTable } from "@/configs/schema";
import { generalLimiter } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
    try {
        // Rate-limit by IP to prevent automated enumeration of chatId values.
        // Shared chats may contain sensitive academic or personal content, so
        // unrestricted enumeration is a meaningful privacy risk even though the
        // endpoint is intentionally public.
        const forwardedFor = req.headers.get("x-forwarded-for");
        const ip = req.headers.get("x-real-ip")
            ?? forwardedFor?.split(",")[0]?.trim()
            ?? "127.0.0.1";

        try {
            const { success } = await generalLimiter.limit(ip);
            if (!success) {
                return NextResponse.json(
                    { error: "Too many requests. Please try again later." },
                    { status: 429 }
                );
            }
        } catch {
            // Rate limiter failure: fail closed to prevent enumeration when
            // the limiter service is unavailable.
            return NextResponse.json(
                { error: "Service temporarily unavailable. Please try again in a moment." },
                { status: 503 }
            );
        }

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
    } catch (error: unknown) {
        console.error("Fetch Public Chat Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
