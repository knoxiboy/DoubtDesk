import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/configs/db";
import { usersTable } from "@/configs/schema";
import { auth, currentUser } from "@clerk/nextjs/server";

const VALID_THEMES = ["light", "dark", "system"] as const;
type Theme = (typeof VALID_THEMES)[number];

export async function GET() {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let email = (sessionClaims as any)?.email;
        if (!email) {
            const clerkUser = await currentUser();
            email = clerkUser?.primaryEmailAddress?.emailAddress;
        }
        if (!email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [user] = await db
            .select({ themePreference: usersTable.themePreference })
            .from(usersTable)
            .where(eq(usersTable.email, email));

        return NextResponse.json({
            themePreference: user?.themePreference ?? "system",
        });
    } catch (error: any) {
        console.error("GET /api/user/preferences error:", error);
        return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let email = (sessionClaims as any)?.email;
        if (!email) {
            const clerkUser = await currentUser();
            email = clerkUser?.primaryEmailAddress?.emailAddress;
        }
        if (!email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { themePreference } = body;

        if (!VALID_THEMES.includes(themePreference)) {
            return NextResponse.json(
                { error: "Invalid theme. Must be 'light', 'dark', or 'system'" },
                { status: 400 }
            );
        }

        await db
            .update(usersTable)
            .set({ themePreference })
            .where(eq(usersTable.email, email));

        return NextResponse.json({ themePreference }, { status: 200 });
    } catch (error: any) {
        console.error("PATCH /api/user/preferences error:", error);
        return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 });
    }
}