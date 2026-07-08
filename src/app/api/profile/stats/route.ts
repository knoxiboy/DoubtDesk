import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getProfileStats } from "@/lib/profile/getProfileStats";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const clerkUser = await currentUser();
        const email = clerkUser?.primaryEmailAddress?.emailAddress;
        const name = clerkUser?.fullName || clerkUser?.firstName || "Unknown";

        if (!email) {
            return NextResponse.json({ error: "No email found" }, { status: 400 });
        }

        const stats = await getProfileStats(email, name);

        const rawJoinDate = stats?.userCreatedAt || (clerkUser?.createdAt ? new Date(clerkUser.createdAt) : new Date());
        const memberSince = rawJoinDate instanceof Date ? rawJoinDate.toISOString() : new Date(rawJoinDate).toISOString();

        return NextResponse.json({
            success: true,
            stats: {
                totalDoubts: stats?.totalDoubts || 0,
                totalReplies: stats?.totalReplies || 0,
                totalLikesReceived: stats?.totalLikesReceived || 0,
                totalReplyUpvotes: stats?.totalReplyUpvotes || 0,
                doubtsSolved: stats?.doubtsSolved || 0,
                memberSince,
                mostActiveSubject: stats?.mostActiveSubject || "No activity",
            }
        });

    } catch (error: unknown) {
        console.error("Profile Stats API Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal Server Error" },
            { status: 500 }
        );
    }
}
