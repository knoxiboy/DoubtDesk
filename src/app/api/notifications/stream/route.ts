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
    let cleanup = () => { };

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            cleanup = subscribeToNotifications(userEmail, controller);
            controller.enqueue(encoder.encode(`: connected\n\n`));

            req.signal.addEventListener("abort", () => {
                cleanup();
            });
        },
        cancel() {
            cleanup();
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
