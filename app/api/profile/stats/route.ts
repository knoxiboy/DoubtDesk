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

        const rawJoinDate = stats.userCreatedAt || (clerkUser?.createdAt ? new Date(clerkUser.createdAt) : new Date());
        const memberSince = rawJoinDate instanceof Date ? rawJoinDate.toISOString() : new Date(rawJoinDate).toISOString();

        return NextResponse.json({
            success: true,
            stats: {
                totalDoubts: stats.totalDoubts,
                totalReplies: stats.totalReplies,
                totalLikesReceived: stats.totalLikesReceived,
                totalReplyUpvotes: stats.totalReplyUpvotes,
                doubtsSolved: stats.doubtsSolved,
                memberSince,
                mostActiveSubject: stats.mostActiveSubject,
            }
        });

    } catch (error: any) {
        console.error("Profile Stats API Error:", error);
        return NextResponse.json(
            { error: error?.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
