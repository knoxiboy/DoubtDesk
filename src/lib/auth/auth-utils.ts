import { db } from "@/configs/db";
import { usersTable } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { buildErrorResponse } from "@/lib/errors/error-handler";

/**
 * Checks if a user is currently blocked based on their email.
 * Returns an object containing the block status, an error response if blocked, and the database user object.
 *
 * In production, error responses are sanitised so that no internal details are leaked to the client.
 *
 * Block expiry handling:
 * When a user's block period has elapsed (blockedUntil is in the past), their strike record is
 * atomically cleared (violationCount → 0, isBlocked → false, blockedUntil → null) so that they
 * start fresh. Without this reset the old violationCount persists indefinitely, causing the next
 * moderation flag to immediately re-trigger a block — a permanent punishment loop.
 */
export async function checkUserBlock(email: string) {
    try {
        let attempts = 0;
        while (attempts < 3) {
            attempts++;
            const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

            if (!user) {
                return {
                    isBlocked: false,
                    errorResponse: undefined,
                    dbUser: undefined,
                };
            }

            // User is actively within a block window → deny access.
            if (user.blockedUntil && new Date(user.blockedUntil) > new Date()) {
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

            // Block has expired: atomically clear the strike record so the user starts fresh.
            // Without this reset, the stale violationCount means the very next flag re-triggers
            // a block instantly, creating a permanent punishment loop (issue #344).
            //
            // Fix (race condition):
            // We verify that isBlocked is still true and blockedUntil matches the value we read.
            // If another concurrent request re-blocked the user in the meantime, the update will
            // not match any rows (clearedUser is undefined). We then retry the read to get the latest state.
            if (user.isBlocked && user.blockedUntil && new Date(user.blockedUntil) <= new Date()) {
                const [clearedUser] = await db
                    .update(usersTable)
                    .set({
                        isBlocked: false,
                        blockedUntil: null,
                        violationCount: 0,
                    })
                    .where(
                        and(
                            eq(usersTable.email, email),
                            eq(usersTable.isBlocked, true),
                            eq(usersTable.blockedUntil, user.blockedUntil)
                        )
                    )
                    .returning();

                if (clearedUser) {
                    return {
                        isBlocked: false,
                        errorResponse: undefined,
                        dbUser: clearedUser,
                    };
                }

                // Stale read detected -> retry
                continue;
            }

            // User is not blocked or block is already cleared
            return {
                isBlocked: false,
                errorResponse: undefined,
                dbUser: user,
            };
        }

        // Fallback for extreme database contention.
        // Re-run the same active-block check so callers always receive a consistent
        // errorResponse whenever the user is still within a block window.
        const [finalUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (finalUser?.isBlocked && finalUser.blockedUntil && new Date(finalUser.blockedUntil) > new Date()) {
            const unlockDate = new Date(finalUser.blockedUntil).toDateString();
            const { status, body } = buildErrorResponse(
                new Error(`Your account is temporarily blocked due to safety violations. Access will be restored on ${unlockDate}.`)
            );
            return {
                isBlocked: true,
                errorResponse: NextResponse.json(body, { status }),
                dbUser: finalUser,
            };
        }
        return {
            isBlocked: finalUser?.isBlocked ?? false,
            errorResponse: undefined,
            dbUser: finalUser,
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
