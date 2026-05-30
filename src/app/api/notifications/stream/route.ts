import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { subscribeToNotifications } from "@/lib/notifications/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const user = await currentUser();
    if (!user || !user.primaryEmailAddress?.emailAddress) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = user.primaryEmailAddress.emailAddress;
    const encoder = new TextEncoder();
    let cleanup = () => {};
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            cleanup = subscribeToNotifications(userEmail, controller);
            controller.enqueue(encoder.encode(`: connected\n\n`));
            heartbeat = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(`: ping\n\n`));
                } catch {
                    cleanup();
                    if (heartbeat) {
                        clearInterval(heartbeat);
                    }
                }
            }, 25000);

            req.signal.addEventListener("abort", () => {
                cleanup();
                if (heartbeat) {
                    clearInterval(heartbeat);
                }
            });
        },
        cancel() {
            cleanup();
            if (heartbeat) {
                clearInterval(heartbeat);
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
