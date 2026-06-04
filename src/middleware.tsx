import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { aiLimiter, generalLimiter, videoLimiter } from '@/lib/ratelimit';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/profile(.*)', '/admin(.*)']);

const isPublicRoute = createRouteMatcher(['/sign-in', '/sign-up', '/api/inngest', '/', '/public-rooms(.*)']);

export default clerkMiddleware(async (auth, req) => {
    // Skip middleware for Inngest API
    if (req.nextUrl.pathname.startsWith('/api/inngest')) {
        return;
    }

    // Rate limiting for public-facing API routes
    if (req.nextUrl.pathname.startsWith('/api') && !req.nextUrl.pathname.startsWith('/api/inngest')) {
        const { userId } = await auth();
        const forwardedFor = req.headers.get("x-forwarded-for");
        const ip = req.headers.get("x-real-ip") ?? forwardedFor?.split(",")[0]?.trim() ?? "127.0.0.1";
        const rateLimitKey = userId || ip;
        
        // Choose limiter based on path
        const path = req.nextUrl.pathname;
        const isAiRoute =
            path.startsWith('/api/solve') ||
            path.startsWith('/api/ask-ai') ||
            path.startsWith('/api/cover-letter') ||
            path.startsWith('/api/resume-analyzer') ||
            path.startsWith('/api/ai-career-chat-agent') ||
            path.startsWith('/api/roadmap');
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
            // Rate limiter failure: fail closed for AI and video routes (high
            // abuse risk) and fail open for general routes. Silently allowing
            // all requests when the limiter is down eliminates the primary
            // abuse-prevention control on the most expensive endpoints.
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
            // For general routes a transient limiter failure is lower risk;
            // allow the request through rather than blocking non-AI traffic.
        }
    }

    if (isProtectedRoute(req)) {
        const { userId, redirectToSignIn } = await auth();
        if (!userId) return redirectToSignIn();
    }
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|api/inngest|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes, except Inngest
        '/(api(?!/inngest)|trpc)(.*)',
    ],
};
