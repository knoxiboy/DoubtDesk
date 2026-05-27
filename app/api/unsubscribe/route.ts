import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { usersTable } from "@/configs/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const email = searchParams.get("email");

        if (!email) {
            return NextResponse.redirect(new URL("/profile?error=Email%20required", req.url));
        }

        // Update user preference in DB to 'none' and disable email notifications
        await db.update(usersTable)
            .set({ 
                emailNotificationsEnabled: false, 
                notificationPreference: "none" 
            })
            .where(eq(usersTable.email, email));

        return NextResponse.redirect(new URL("/profile?unsubscribed=true", req.url));
    } catch (error: any) {
        console.error("Unsubscribe API Error:", error);
        return NextResponse.redirect(new URL("/profile?error=Internal%20Server%20Error", req.url));
    }
}
