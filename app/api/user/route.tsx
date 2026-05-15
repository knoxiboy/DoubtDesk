import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/configs/db";
import { usersTable } from "@/configs/schema";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
    try {
        const { userId, sessionClaims } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Try to get email from session claims first
        let email = (sessionClaims as any)?.email;
        let name = (sessionClaims as any)?.full_name || (sessionClaims as any)?.name || "";

        // Fallback to currentUser if email not in claims
        if (!email) {
            const clerkUser = await currentUser();
            if (!clerkUser || !clerkUser.primaryEmailAddress?.emailAddress) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
            email = clerkUser.primaryEmailAddress.emailAddress;
            name = name || clerkUser.fullName || "";
        }

        // =========================================================
        // ✅ DRIZZLE (NEON) — PRIMARY SOURCE OF TRUTH
        // =========================================================
        let dbUser: any = null;
        let dbStatus: 200 | 201 = 200;

        const [user] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, email));

        if (user) {
            dbUser = user;
            dbStatus = 200;
        } else {
            const [createdUser] = await db
                .insert(usersTable)
                .values({ email, name })
                .onConflictDoNothing()
                .returning();

            if (!createdUser) {
                return NextResponse.json(
                    { error: "Failed to create user in Drizzle" },
                    { status: 500 }
                );
            }

            dbUser = createdUser;
            dbStatus = 201;
        }

        return NextResponse.json(dbUser, { status: dbStatus });
    } catch (error: any) {
        console.error("User Sync Error:", error);
        return NextResponse.json(
            { error: error?.message || "Server error" },
            { status: 500 }
        );
    }
}
