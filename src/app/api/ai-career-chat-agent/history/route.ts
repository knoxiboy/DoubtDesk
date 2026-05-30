import { NextRequest, NextResponse } from "next/server";
import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "@/configs/db";
import { chatHistoryTable } from "@/configs/schema";
import { currentUser } from "@clerk/nextjs/server";
import { checkUserBlock } from "@/lib/auth-utils";

export async function GET(req: NextRequest) {
    try {
        const clerkUser = await currentUser();
        if (!clerkUser || !clerkUser.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const email = clerkUser.primaryEmailAddress.emailAddress;

        // 0. Check if user is blocked
        const { isBlocked, errorResponse } = await checkUserBlock(email);
        if (isBlocked) return errorResponse;

        // Check for specific chatId in query params
        const url = new URL(req.url);
        const chatId = url.searchParams.get("chatId");

        if (chatId) {
            // Return all messages for a specific session
            const messages = await db
                .select()
                .from(chatHistoryTable)
                .where(eq(chatHistoryTable.chatId, chatId))
                .orderBy(chatHistoryTable.createdAt);

            return NextResponse.json(messages);
        }

        // Return unique session "blocks" (distinct chatId)
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

        return NextResponse.json(sessions);
    } catch (error: any) {
        console.error("Chat History Fetch Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const clerkUser = await currentUser();
        if (!clerkUser || !clerkUser.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const email = clerkUser.primaryEmailAddress.emailAddress;

        // 0. Check if user is blocked
        const { isBlocked, errorResponse } = await checkUserBlock(email);
        if (isBlocked) return errorResponse;

        const body = await req.json();
        const { role, content, chatId, chatTitle } = body;

        if (!role || !content || !chatId) {
            return NextResponse.json({ error: "Role, content, and chatId are required" }, { status: 400 });
        }

        const [savedMessage] = await db
            .insert(chatHistoryTable)
            .values({
                chatId,
                chatTitle: chatTitle || "New Conversation",
                userEmail: email,
                role,
                content,
            })
            .returning();

        return NextResponse.json(savedMessage);
    } catch (error: any) {
        console.error("Chat History Save Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const clerkUser = await currentUser();
        if (!clerkUser || !clerkUser.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const email = clerkUser.primaryEmailAddress.emailAddress;

        // 0. Check if user is blocked
        const { isBlocked, errorResponse } = await checkUserBlock(email);
        if (isBlocked) return errorResponse;

        const url = new URL(req.url);
        const chatId = url.searchParams.get("chatId");

        if (!chatId) {
            return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
        }

        // Delete all messages for this chatId and user
        await db.delete(chatHistoryTable)
            .where(
                and(
                    eq(chatHistoryTable.chatId, chatId),
                    eq(chatHistoryTable.userEmail, email)
                )
            )
            .returning();

        return NextResponse.json({ message: "Chat session deleted successfully" });
    } catch (error: any) {
        console.error("Chat History Delete Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
