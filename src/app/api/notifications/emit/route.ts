import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user?.primaryEmailAddress?.emailAddress) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { sessionId, doubtId, question, answeredBy } = body;

        if (!sessionId || !doubtId || !question) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // TODO: Integrate Socket.IO server to emit notification to sessionId
        // io.to(`session:${sessionId}`).emit('doubt:answered', {
        //   doubtId, question, answeredAt: new Date().toISOString()
        // });

        return NextResponse.json({
            success: true,
            message: "Notification queued",
            notificationData: {
                type: "doubt:answered",
                doubtId,
                question: question.slice(0, 60) + "...",
                answeredAt: new Date().toISOString(),
                answeredBy,
            },
        });
    } catch (error) {
        console.error("Notification emit error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
