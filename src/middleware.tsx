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
