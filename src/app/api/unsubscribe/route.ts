import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";
import { usersTable } from "@/configs/schema";
import { verifyUnsubscribeToken } from "@/lib/email/email";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const unsubscribeAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest) {
    return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
        || req.headers.get("x-real-ip")
        || "unknown";
}

function isRateLimited(ip: string) {
    const now = Date.now();
    const current = unsubscribeAttempts.get(ip);

    if (!current || current.resetAt <= now) {
        unsubscribeAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }

    current.count += 1;
    return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function getParams(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    return {
        email: searchParams.get("email"),
        expires: searchParams.get("expires"),
        token: searchParams.get("token"),
    };
}

function isValidRequest(email: string | null, expires: string | null, token: string | null) {
    return Boolean(email && verifyUnsubscribeToken(email, expires, token));
}

function redirectWithError(req: NextRequest, message: string) {
    return NextResponse.redirect(new URL(`/profile?error=${encodeURIComponent(message)}`, req.url));
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export async function GET(req: NextRequest) {
    const { email, expires, token } = getParams(req);

    if (!isValidRequest(email, expires, token)) {
        return redirectWithError(req, "Invalid or expired unsubscribe link");
    }

    const unsubscribeAction = `/api/unsubscribe?email=${encodeURIComponent(email!)}&expires=${encodeURIComponent(expires!)}&token=${encodeURIComponent(token!)}`;

    return new NextResponse(
        `<!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Unsubscribe from DoubtDesk</title>
            </head>
            <body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0f172a;color:#e2e8f0;font-family:Arial,sans-serif;">
                <main style="max-width:420px;padding:32px;text-align:center;">
                    <h1 style="font-size:24px;margin:0 0 12px;">Unsubscribe from email notifications?</h1>
                    <p style="line-height:1.5;color:#cbd5e1;">This will turn off DoubtDesk email notifications for ${escapeHtml(email!)}.</p>
                    <form method="POST" action="${unsubscribeAction}">
                        <button type="submit" style="border:0;border-radius:8px;background:#4f46e5;color:white;font-weight:700;padding:12px 18px;cursor:pointer;" >Unsubscribe</button>
                    </form>
                </main>
            </body>
        </html>`,
        {
            status: 200,
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "no-store",
            },
        }
    );
}

export async function POST(req: NextRequest) {
    try {
        const ip = getClientIp(req);
        if (isRateLimited(ip)) {
            return redirectWithError(req, "Too many unsubscribe attempts. Please try again later.");
        }

        const { email, expires, token } = getParams(req);
        if (!email || !isValidRequest(email, expires, token)) {
            return redirectWithError(req, "Invalid or expired unsubscribe link");
        }

        const normalizedEmail = email.trim().toLowerCase();

        // If a Clerk session is attached, require it to match the email in the
        // unsubscribe token. The signed token alone is enough to authenticate
        // an email-link click (users may not be logged in when clicking from
        // their inbox), but if they ARE logged in, a mismatch means the link
        // was forwarded, leaked, or submitted via a cross-site form and we
        // refuse to act on someone else's behalf.
        //
        // currentUser() failures are intentionally NOT swallowed here: a Clerk
        // backend error for an authenticated request would otherwise silently
        // downgrade to the token-only flow and bypass the session/email
        // binding. The outer try/catch turns the exception into an error
        // redirect so the unsubscribe never proceeds without the check.
        const sessionUser = await currentUser();
        const sessionEmail = sessionUser?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
        if (sessionEmail && sessionEmail !== normalizedEmail) {
            console.warn("[unsubscribe] session/token email mismatch", {
                sessionEmail,
                tokenEmail: normalizedEmail,
                ip,
            });
            return redirectWithError(req, "Signed-in user does not match this unsubscribe link");
        }

        await db.update(usersTable)
            .set({
                emailNotificationsEnabled: false,
                notificationPreference: "none",
            })
            .where(eq(usersTable.email, normalizedEmail));

        console.log(JSON.stringify({
            event: "unsubscribe",
            email: normalizedEmail,
            method: req.method,
            ip,
            authenticated: Boolean(sessionEmail),
            timestamp: new Date().toISOString(),
        }));

        return NextResponse.redirect(new URL("/profile?unsubscribed=true", req.url));
    } catch (error: unknown) {
        console.error("Unsubscribe API Error:", error);
        return redirectWithError(req, "Internal Server Error");
    }
}
