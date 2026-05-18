import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { aiLimiter, generalLimiter } from '@/lib/ratelimit';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/profile(.*)']);

const isPublicRoute = createRouteMatcher(['/sign-in', '/sign-up', '/api/inngest', '/', '/public-rooms(.*)']);

export default clerkMiddleware(async (auth, req) => {
    // Skip middleware for Inngest API
    if (req.nextUrl.pathname.startsWith('/api/inngest')) {
        return;
    }

    // Rate limiting for public-facing API routes
    if (req.nextUrl.pathname.startsWith('/api') && !req.nextUrl.pathname.startsWith('/api/inngest')) {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        
        // Choose limiter based on path
        const isAiRoute = req.nextUrl.pathname.includes('/solve') || req.nextUrl.pathname.includes('/ask-ai');
        const limiter = isAiRoute ? aiLimiter : generalLimiter;

        try {
            const { success, limit, remaining, reset } = await limiter.limit(ip);

            if (!success) {
                return new NextResponse(
                    JSON.stringify({
                        error: "Too many requests. Please try again later.",
                        message: isAiRoute 
                            ? "AI Solver is currently rate limited to protect resources." 
                            : "You've reached the rate limit for this action."
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
            // Fallback: allow request if rate limiter fails
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
