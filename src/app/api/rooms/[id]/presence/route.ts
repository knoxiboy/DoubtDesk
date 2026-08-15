import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/configs/db";
import { doubtsTable } from "@/configs/schema";
import { checkUserBlock } from "@/lib/auth/auth-utils";
import { ApiError, buildErrorResponse } from "@/lib/errors/error-handler";
import {
    requireAuth,
    requireMembership,
} from "@/lib/auth/membership-guard";

const globalAny = global as any;

if (!globalAny.sseClients) {
  globalAny.sseClients = new Map<string, Set<ReadableStreamDefaultController>>();
}
if (!globalAny.typingUsers) {
  globalAny.typingUsers = new Map<string, Map<string, { username: string; initial: string; timestamp: number }>>();
}

const getRoomClients = (roomId: string): Set<ReadableStreamDefaultController> => {
  if (!globalAny.sseClients.has(roomId)) {
    globalAny.sseClients.set(roomId, new Set());
  }
  return globalAny.sseClients.get(roomId);
};

const getRoomTyping = (roomId: string): Map<string, { username: string; initial: string; timestamp: number }> => {
  if (!globalAny.typingUsers.has(roomId)) {
    globalAny.typingUsers.set(roomId, new Map());
  }
  return globalAny.typingUsers.get(roomId);
};

const broadcastTyping = (roomId: string) => {
  const clients = getRoomClients(roomId);
  const typingMap = getRoomTyping(roomId);
  
  const now = Date.now();
  const activeTyping: { username: string; initial: string }[] = [];
  for (const [email, data] of typingMap.entries()) {
    if (now - data.timestamp > 10000) {
      typingMap.delete(email);
    } else {
      activeTyping.push({ username: data.username, initial: data.initial });
    }
  }

  const payload = `data: ${JSON.stringify({ typingUsers: activeTyping })}\n\n`;

  for (const client of clients) {
    try {
      client.enqueue(new TextEncoder().encode(payload));
    } catch (e) {
      clients.delete(client);
    }
  }
};

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { email } = await requireAuth();

    const { isBlocked, errorResponse } = await checkUserBlock(email);
    if (errorResponse) return errorResponse;
    if (isBlocked) return errorResponse;

    const { id } = await params;
    const doubtId = parseInt(id, 10);
    if (!Number.isSafeInteger(doubtId) || doubtId <= 0) {
      throw new ApiError(400, "Invalid doubt ID");
    }

    const [doubt] = await db
      .select({ classroomId: doubtsTable.classroomId })
      .from(doubtsTable)
      .where(eq(doubtsTable.id, doubtId));

    if (!doubt) {
      throw new ApiError(404, "Doubt not found");
    }

    if (doubt.classroomId) {
      await requireMembership(email, doubt.classroomId);
    }

    const roomId = id;

    let streamController: ReadableStreamDefaultController;

    const stream = new ReadableStream({
      start(controller) {
        streamController = controller;
        const clients = getRoomClients(roomId);
        clients.add(controller);

        broadcastTyping(roomId);

        req.signal.addEventListener("abort", () => {
          clients.delete(controller);
        });
      },
      cancel() {
        if (streamController!) {
          const clients = getRoomClients(roomId);
          clients.delete(streamController);
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, email } = await requireAuth();

    const { isBlocked, errorResponse } = await checkUserBlock(email);
    if (errorResponse) return errorResponse;
    if (isBlocked) return errorResponse;

    const { id } = await params;
    const doubtId = parseInt(id, 10);
    if (!Number.isSafeInteger(doubtId) || doubtId <= 0) {
      throw new ApiError(400, "Invalid doubt ID");
    }

    const [doubt] = await db
      .select({ classroomId: doubtsTable.classroomId })
      .from(doubtsTable)
      .where(eq(doubtsTable.id, doubtId));

    if (!doubt) {
      throw new ApiError(404, "Doubt not found");
    }

    if (doubt.classroomId) {
      await requireMembership(email, doubt.classroomId);
    }

    const roomId = id;

    const { initial, isTyping } = await req.json();

    const displayUsername = user.firstName || user.username || "Anonymous";

    const typingMap = getRoomTyping(roomId);

    if (isTyping) {
      typingMap.set(email, { username: displayUsername, initial: initial || "?", timestamp: Date.now() });
    } else {
      typingMap.delete(email);
    }

    broadcastTyping(roomId);

    return NextResponse.json({ success: true });
  } catch (error) {
    const { status, body } = buildErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
