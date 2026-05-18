import { db } from "@/configs/db";
import { usersTable } from "@/configs/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { buildErrorResponse } from "@/lib/error-handler";

/**
 * Checks if a user is currently blocked based on their email.
 * Returns an object containing the block status, an error response if blocked, and the database user object.
 *
 * In production, error responses are sanitised so that no internal details are leaked to the client.
 */
export async function checkUserBlock(email: string) {
    try {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

        if (user?.blockedUntil && new Date(user.blockedUntil) > new Date()) {
            const unlockDate = new Date(user.blockedUntil).toDateString();
            const { status, body } = buildErrorResponse(
                new Error(`Your account is temporarily blocked due to safety violations. Access will be restored on ${unlockDate}.`)
            );
            return {
                isBlocked: true,
                errorResponse: NextResponse.json(body, { status }),
                dbUser: user,
            };
        }

        return {
            isBlocked: false,
            errorResponse: undefined,
            dbUser: user,
        };
    } catch (err) {
        const { status, body } = buildErrorResponse(err);
        return {
            isBlocked: false,
            errorResponse: NextResponse.json(body, { status }),
            dbUser: undefined,
        };
    }
}
