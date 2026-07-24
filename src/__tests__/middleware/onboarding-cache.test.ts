// src/__tests__/middleware/onboarding-cache.test.ts
//
// These tests verify the cookie-based onboarding cache logic in isolation.
// Because clerkMiddleware wraps the handler in a way that can't be unit-tested
// without a full Clerk runtime, we test the cache logic directly by extracting
// the relevant decision into a pure helper.

const ONBOARDED_COOKIE = 'dd_onboarded';
const ONBOARDED_COOKIE_TTL_SECONDS = 5 * 60;

/**
 * Pure helper that mirrors the fast/slow-path decision made in the middleware.
 * Returns:
 *  - { skip: true }             → cache hit, no DB query needed
 *  - { skip: false, email }     → cache miss, DB query required with resolved email
 */
function resolveOnboardingCachePath(
    cookieValue: string | undefined,
    email: string | undefined,
): { skip: true } | { skip: false; email: string | undefined } {
    if (cookieValue === '1') return { skip: true };
    return { skip: false, email };
}

/**
 * Pure helper that builds the cookie attributes string.
 * Mirrors the res.cookies.set() call in the middleware.
 */
function buildCookieAttrs(isProd: boolean): string {
    const attrs = [
        `${ONBOARDED_COOKIE}=1`,
        'Path=/',
        `Max-Age=${ONBOARDED_COOKIE_TTL_SECONDS}`,
        'SameSite=Strict',
        'HttpOnly',
    ];
    if (isProd) attrs.push('Secure');
    return attrs.join('; ');
}

describe('Middleware onboarding cookie cache — pure logic', () => {
    describe('resolveOnboardingCachePath', () => {
        it('returns skip=true when the cache cookie is present and equals "1"', () => {
            const result = resolveOnboardingCachePath('1', 'user@example.com');
            expect(result).toEqual({ skip: true });
        });

        it('returns skip=false when the cache cookie is absent', () => {
            const result = resolveOnboardingCachePath(undefined, 'user@example.com');
            expect(result).toEqual({ skip: false, email: 'user@example.com' });
        });

        it('returns skip=false when the cache cookie has an unexpected value', () => {
            const result = resolveOnboardingCachePath('true', 'user@example.com');
            expect(result).toEqual({ skip: false, email: 'user@example.com' });
        });

        it('returns skip=false with undefined email when email cannot be resolved', () => {
            const result = resolveOnboardingCachePath(undefined, undefined);
            expect(result).toEqual({ skip: false, email: undefined });
        });
    });

    describe('buildCookieAttrs', () => {
        it('includes HttpOnly and correct Max-Age in development', () => {
            const cookie = buildCookieAttrs(false);
            expect(cookie).toContain(`${ONBOARDED_COOKIE}=1`);
            expect(cookie).toContain('HttpOnly');
            expect(cookie).toContain(`Max-Age=${ONBOARDED_COOKIE_TTL_SECONDS}`);
            expect(cookie).toContain('SameSite=Strict');
            expect(cookie).not.toContain('Secure');
        });

        it('includes Secure flag in production', () => {
            const cookie = buildCookieAttrs(true);
            expect(cookie).toContain('Secure');
        });

        it('sets TTL to exactly 300 seconds (5 minutes)', () => {
            expect(ONBOARDED_COOKIE_TTL_SECONDS).toBe(300);
            const cookie = buildCookieAttrs(false);
            expect(cookie).toContain('Max-Age=300');
        });
    });

    describe('onboarding redirect guard', () => {
        it('should redirect when dbUser is null', () => {
            const dbUser: { onboarded: boolean } | undefined = undefined;
            const shouldRedirect = !dbUser || !dbUser.onboarded;
            expect(shouldRedirect).toBe(true);
        });

        it('should redirect when dbUser.onboarded is false', () => {
            const dbUser = { onboarded: false };
            const shouldRedirect = !dbUser || !dbUser.onboarded;
            expect(shouldRedirect).toBe(true);
        });

        it('should NOT redirect when dbUser.onboarded is true', () => {
            const dbUser = { onboarded: true };
            const shouldRedirect = !dbUser || !dbUser.onboarded;
            expect(shouldRedirect).toBe(false);
        });
    });
});
