import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";
import { usersTable } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";

/**
 * Ensures the current user is an authenticated admin.
 * If not authenticated, redirects to /sign-in.
 * If not an admin, throws notFound() which results in a 404 response.
 * This is safe for both Server Components and API Routes.
 */
export async function requireAdmin() {
    const user = await currentUser();

    if (!user) {
        redirect("/sign-in");
    }

    const email = user.emailAddresses[0]?.emailAddress;
    if (!email) {
        redirect("/sign-in");
    }

    const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));

    if (!dbUser || dbUser.role !== "admin") {
        redirect("/403");
    }

    return dbUser;
}
