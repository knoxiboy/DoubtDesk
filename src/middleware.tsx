import { clerkMiddleware, createRouteMatcher, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { aiLimiter, generalLimiter, videoLimiter } from '@/lib/ratelimit/ratelimit';
import { db } from '@/configs/db';
import { usersTable } from '@/configs/schema';
import { eq } from 'drizzle-orm';

const isProtectedRoute = createRouteMatcher([
    '/dashboard(.*)',
    '/profile(.*)',
    '/admin(.*)',
    '/rooms(.*)',
    '/ask-ai(.*)'
]);

const isPublicRoute = createRouteMatcher(['/sign-in', '/sign-up', '/api/inngest', '/', '/public-rooms(.*)', '/onboarding']);

const ROUTE_LEVEL_LIMITED_POSTS = new Set([
    '/api/ai-career-chat-agent',
    '/api/ask-ai',
    '/api/doubts',
    '/api/doubts/check-similarity',
    '/api/replies',
    '/api/rooms',
    '/api/tags',
]);

function usesRouteLevelLimit(path: string, method: string) {
    if (
        method === 'POST' &&
        (path.startsWith('/api/video/') || ROUTE_LEVEL_LIMITED_POSTS.has(path))
    ) {
        return true;
    }

    return (
        (method === 'POST' || method === 'DELETE') &&
        /^\/api\/doubts\/[^/]+\/bookmark$/.test(path)
    );
}

/**
 * Name of the short-lived HttpOnly cookie used to cache the onboarding status.
 *
 * After the first successful database check confirming the user is onboarded,
 * the cookie is set so subsequent page navigations skip the DB query entirely
 * for the duration of the TTL. The cookie is HttpOnly, Secure (in production),
 * and SameSite=Strict to prevent client-side tampering or CSRF abuse.
 *
 * Worst-case staleness: if a user's `onboarded` flag is flipped to false in
 * the database, they will continue to access protected pages until the cookie
 * expires (at most 5 minutes). This trade-off is acceptable because the
 * onboarding flag is only ever set to true (never reverted after completion).
 */
const ONBOARDED_COOKIE = 'dd_onboarded';

/** How long (seconds) the onboarding cache cookie is valid before re-checking. */
const ONBOARDED_COOKIE_TTL_SECONDS = 5 * 60; // 5 minutes

export default clerkMiddleware(async (auth, req) => {
    const path = req.nextUrl.pathname;

    if (path.startsWith('/api/inngest')) {
        return;
    }

    const hasRouteLevelLimit = usesRouteLevelLimit(path, req.method);

    if (path.startsWith('/api') && !hasRouteLevelLimit) {
        const { userId } = await auth();
        const forwardedFor = req.headers.get("x-forwarded-for");
        const ip = req.headers.get("x-real-ip") ?? forwardedFor?.split(",")[0]?.trim() ?? "127.0.0.1";
        const rateLimitKey = userId || ip;

        const isAiRoute =
            path.startsWith('/api/solve') ||
            path.startsWith('/api/ask-ai') ||
            path.startsWith('/api/cover-letter') ||
            path.startsWith('/api/resume-analyzer') ||
            path.startsWith('/api/ai-career-chat-agent') ||
            path.startsWith('/api/doubts/check-similarity') ||
            path.startsWith('/api/roadmap') ||
            (path.startsWith('/api/doubts') && (req.method === 'POST' || path.includes('/practice')));
        const isVideoRoute = path.startsWith('/api/video/generate');
        const limiter = isVideoRoute ? videoLimiter : (isAiRoute ? aiLimiter : generalLimiter);

        try {
            const { success, limit, remaining, reset } = await limiter.limit(rateLimitKey);

            if (!success) {
                return new NextResponse(
                    JSON.stringify({
                        error: "Too many requests. Please try again later.",
                        message: isVideoRoute
                            ? "Video generation limit reached (max 3 per hour)."
                            : (isAiRoute
                                ? "AI Solver is currently rate limited to protect resources."
                                : "You've reached the rate limit for this action.")
                    }),
                    {
                        status: 429,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-RateLimit-Limit': limit.toString(),
                            'X-RateLimit-Remaining': remaining.toString(),
                            'X-RateLimit-Reset': reset.toString(),
                            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
                        }
                    }
                );
            }
        } catch (error) {
            console.error("Rate limiting error:", error);
            if (isAiRoute || isVideoRoute) {
                return new NextResponse(
                    JSON.stringify({
                        error: "Rate limiting service is temporarily unavailable. Please try again in a moment.",
                    }),
                    {
                        status: 503,
                        headers: { 'Content-Type': 'application/json' },
                    }
                );
            }
        }
    }

    const { userId, sessionClaims, redirectToSignIn } = await auth();
    const isPublic = isPublicRoute(req);
    const isApi = req.nextUrl.pathname.startsWith('/api');

    if (isProtectedRoute(req)) {
        if (!userId) return redirectToSignIn();
    }

    if (userId && !isApi && !isPublic) {
        // ── Fast path ────────────────────────────────────────────────────────────
        // If the onboarding cache cookie is present the user was confirmed as
        // onboarded within the last TTL window — skip the database query entirely.
        const cachedOnboarded = req.cookies.get(ONBOARDED_COOKIE)?.value === '1';
        if (cachedOnboarded) {
            return;
        }

        // ── Slow path ─────────────────────────────────────────────────────────────
        // Resolve the user's email (from session claims first, Clerk API as fallback)
        // then hit the database once to check onboarding status.
        let email = sessionClaims?.email as string | undefined;
        if (!email) {
            try {
                const client = await clerkClient();
                const user = await client.users.getUser(userId);
                email = user.emailAddresses.find(
                    (e) => e.id === user.primaryEmailAddressId
                )?.emailAddress;
            } catch (err) {
                console.error("Middleware fallback getUser error:", err);
            }
        }

        if (email) {
            try {
                const [dbUser] = await db
                    .select({ onboarded: usersTable.onboarded })
                    .from(usersTable)
                    .where(eq(usersTable.email, email))
                    .limit(1);

                if (!dbUser || !dbUser.onboarded) {
                    const onboardingUrl = new URL('/onboarding', req.url);
                    return NextResponse.redirect(onboardingUrl);
                }

                // User is confirmed onboarded — cache the result in a short-lived
                // HttpOnly cookie so the next TTL window of page navigations all
                // hit this fast path instead.
                const res = NextResponse.next();
                res.cookies.set(ONBOARDED_COOKIE, '1', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: ONBOARDED_COOKIE_TTL_SECONDS,
                    path: '/',
                });
                return res;
            } catch (err) {
                console.error("Middleware onboarding check error:", err);
            }
        } else {
            const signInUrl = new URL('/sign-in', req.url);
            return NextResponse.redirect(signInUrl);
        }
    }
});

export const config = {
    matcher: [
        '/((?!_next|api/inngest|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api(?!/inngest)|trpc)(.*)',
    ],
};
