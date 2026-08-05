import { NextRequest, NextResponse } from "next/server";
import { checkUserBlock } from "@/lib/auth/auth-utils";
import { buildErrorResponse } from "@/lib/errors/error-handler";
import {
    parseClassroomId,
    requireAuth,
    requireMembership,
} from "@/lib/auth/membership-guard";

const globalAny = global as any;

if (!globalAny.sseClients) {
  globalAny.sseClients = new Map<string, Set<ReadableStreamDefaultController>>();
}
if (!globalAny.typingUsers) {
  globalAny.typingUsers = new Map<string, Map<string, { initial: string; timestamp: number }>>();
}

const getRoomClients = (roomId: string): Set<ReadableStreamDefaultController> => {
  if (!globalAny.sseClients.has(roomId)) {
    globalAny.sseClients.set(roomId, new Set());
  }
  return globalAny.sseClients.get(roomId);
};

const getRoomTyping = (roomId: string): Map<string, { initial: string; timestamp: number }> => {
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
  for (const [username, data] of typingMap.entries()) {
    if (now - data.timestamp > 10000) {
      typingMap.delete(username);
    } else {
      activeTyping.push({ username, initial: data.initial });
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
    if (isBlocked) return errorResponse;

    const { id } = await params;
    const classroomId = parseClassroomId(id);
    await requireMembership(email, classroomId);
    const roomId = classroomId.toString();

    const stream = new ReadableStream({
      start(controller) {
        const clients = getRoomClients(roomId);
        clients.add(controller);

        broadcastTyping(roomId);

        req.signal.addEventListener("abort", () => {
          clients.delete(controller);
        });
      },
      cancel(controller) {
        const clients = getRoomClients(roomId);
        clients.delete(controller);
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
    const { email } = await requireAuth();

    const { isBlocked, errorResponse } = await checkUserBlock(email);
    if (isBlocked) return errorResponse;

    const { id } = await params;
    const classroomId = parseClassroomId(id);
    await requireMembership(email, classroomId);
    const roomId = classroomId.toString();

    const { initial, isTyping } = await req.json();

    const typingMap = getRoomTyping(roomId);

    if (isTyping) {
      typingMap.set(email, { initial: initial || "?", timestamp: Date.now() });
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
