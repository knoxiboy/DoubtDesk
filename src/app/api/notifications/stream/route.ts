import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { subscribeToNotifications } from "@/lib/notifications/realtime";

const MAX_DURATION_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 30_000;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const user = await currentUser();
    if (!user || !user.primaryEmailAddress?.emailAddress) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = user.primaryEmailAddress.emailAddress;
    const encoder = new TextEncoder();
    let cleanup = () => { };

    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            cleanup = subscribeToNotifications(userEmail, controller);

            heartbeat = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(`: heartbeat\n\n`));
                } catch {
                    clearTimers();
                    cleanup();
                }
            }, HEARTBEAT_INTERVAL_MS);

            timeout = setTimeout(() => {
                clearTimers();
                cleanup();
                controller.close();
            }, MAX_DURATION_MS);

            req.signal.addEventListener("abort", () => {
                clearTimers();
                cleanup();
            }, { once: true });

            controller.enqueue(encoder.encode(`: connected\n\n`));
        },
        cancel() {
            clearTimers();
            cleanup();
        },
    });

    function clearTimers() {
        if (heartbeat !== undefined) {
            clearInterval(heartbeat);
            heartbeat = undefined;
        }
        if (timeout !== undefined) {
            clearTimeout(timeout);
            timeout = undefined;
        }
    }

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
