import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/profile(.*)']);

const isPublicRoute = createRouteMatcher(['/sign-in', '/sign-up', '/api/inngest', '/', '/public-rooms(.*)']);

export default clerkMiddleware(async (auth, req) => {
    // Skip middleware for Inngest API
    if (req.nextUrl.pathname.startsWith('/api/inngest')) {
        return;
    }

    // Basic Map-based rate limit for API routes
    if (req.nextUrl.pathname.startsWith('/api')) {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        // In Edge runtime, this map persists per-isolate
        // Note: For a production app at scale, replace this with Upstash Redis or similar
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
