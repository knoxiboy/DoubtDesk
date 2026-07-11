import { NextRequest } from 'next/server';
import { generateUnsubscribeToken } from '@/lib/email/email';

const currentUserMock = jest.fn();
jest.mock('@clerk/nextjs/server', () => ({
    currentUser: () => currentUserMock(),
}));

import { GET, POST } from '@/app/api/unsubscribe/route';

jest.mock('@/configs/db', () => {
    const mockWhere = jest.fn();
    const mockSet = jest.fn(() => ({ where: mockWhere }));
    const mockUpdate = jest.fn(() => ({ set: mockSet }));
    return {
        db: {
            update: mockUpdate,
        },
        _mocks: {
            mockUpdate,
            mockSet,
            mockWhere,
        }
    };
});

const { mockUpdate, mockSet, mockWhere } = require('@/configs/db')._mocks;

jest.mock('@/configs/schema', () => ({
    usersTable: {
        email: 'email',
    },
}));

jest.mock('drizzle-orm', () => ({
    eq: jest.fn((field, value) => ({ field, value })),
}));

function makeSignedRequest(method: string, email = 'Student@College.edu') {
    const expires = Date.now() + 60_000;
    const token = generateUnsubscribeToken(email, expires);
    const url = `http://localhost/api/unsubscribe?email=${encodeURIComponent(email)}&expires=${expires}&token=${token}`;

    return new NextRequest(url, {
        method,
        headers: { 'x-forwarded-for': '127.0.0.1' },
    });
}

function makeUnsignedRequest(method: string, ip: string) {
    return new NextRequest('http://localhost/api/unsubscribe?email=student%40college.edu&token=bad', {
        method,
        headers: { 'x-forwarded-for': ip },
    });
}

/** In the test (non-production) env the CSRF cookie drops the `__Host-` prefix. */
const CSRF_COOKIE = 'csrf_unsub';

/**
 * Perform the GET that renders the unsubscribe form, then return the nonce the
 * server set (via the Set-Cookie on the GET response) so a follow-up POST can
 * replay a legitimate, same-origin submission.
 */
async function fetchCsrfNonce(email = 'Student@College.edu'): Promise<string> {
    const res = await GET(makeSignedRequest('GET', email));
    const nonce = res.cookies.get(CSRF_COOKIE)?.value;
    if (!nonce) throw new Error('GET did not set a CSRF nonce cookie');
    return nonce;
}

/**
 * Build a POST that mimics the legitimate browser flow: the nonce hidden in the
 * form body matches the nonce stored in the HttpOnly cookie. Without both
 * values present and equal, the route refuses the submission.
 */
async function makeSignedPostRequest(email = 'Student@College.edu') {
    const nonce = await fetchCsrfNonce(email);
    const expires = Date.now() + 60_000;
    const token = generateUnsubscribeToken(email, expires);
    const url = `http://localhost/api/unsubscribe?email=${encodeURIComponent(email)}&expires=${expires}&token=${token}`;

    return new NextRequest(url, {
        method: 'POST',
        headers: {
            'x-forwarded-for': '127.0.0.1',
            'content-type': 'application/x-www-form-urlencoded',
            cookie: `${CSRF_COOKIE}=${nonce}`,
        },
        body: `csrf_nonce=${nonce}`,
    });
}

describe('Unsubscribe API Endpoint', () => {
    beforeEach(() => {
        process.env.UNSUBSCRIBE_SECRET = 'test-unsubscribe-secret';
        jest.clearAllMocks();
        currentUserMock.mockResolvedValue(null);
    });

    it('emits a CSRF nonce cookie and embeds the same nonce in the form', async () => {
        const res = await GET(makeSignedRequest('GET'));

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
        expect(res.headers.get('cache-control')).toBe('no-store');

        const nonce = res.cookies.get(CSRF_COOKIE)?.value;
        expect(nonce).toBeTruthy();
        expect(res.cookies.get(CSRF_COOKIE)?.httpOnly).toBe(true);
        expect(res.cookies.get(CSRF_COOKIE)?.sameSite).toBe('strict');
        // The form body must contain the same nonce so the POST can verify it.
        expect(await res.text()).toContain(`name="csrf_nonce" value="${nonce}"`);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('does not change notification preferences on GET', async () => {
        const res = await GET(makeSignedRequest('GET'));

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
        expect(res.headers.get('cache-control')).toBe('no-store');
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('blocks a POST that is missing the CSRF nonce (cross-site style)', async () => {
        const res = await POST(makeSignedRequest('POST'));

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('Invalid%20form%20submission');
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('blocks a POST whose form nonce does not match the cookie nonce', async () => {
        const nonce = await fetchCsrfNonce();
        const expires = Date.now() + 60_000;
        const token = generateUnsubscribeToken('Student@College.edu', expires);
        const url = `http://localhost/api/unsubscribe?email=${encodeURIComponent('Student@College.edu')}&expires=${expires}&token=${token}`;

        const res = await POST(new NextRequest(url, {
            method: 'POST',
            headers: {
                'x-forwarded-for': '127.0.0.1',
                'content-type': 'application/x-www-form-urlencoded',
                cookie: `${CSRF_COOKIE}=${nonce}`,
            },
            body: 'csrf_nonce=deadbeefdeadbeefdeadbeefdeadbeef',
        }));

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('Invalid%20form%20submission');
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('rejects invalid GET requests without updating the user', async () => {
        const req = new NextRequest('http://localhost/api/unsubscribe?email=student%40college.edu', {
            method: 'GET',
        });

        const res = await GET(req);

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('Invalid%20or%20expired%20unsubscribe%20link');
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('rejects missing or tampered tokens without updating the user', async () => {
        const req = makeUnsignedRequest('POST', '127.0.0.2');

        const res = await POST(req);

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('Invalid%20or%20expired%20unsubscribe%20link');
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('rate limits repeated unsubscribe attempts from the same IP', async () => {
        let res: Response | undefined;

        for (let i = 0; i < 11; i += 1) {
            res = await POST(makeUnsignedRequest('POST', '127.0.0.3'));
        }

        expect(res?.status).toBe(307);
        expect(res?.headers.get('location')).toContain('Too%20many%20unsubscribe%20attempts');
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('updates notification preferences only for a valid signed POST with matching CSRF nonce', async () => {
        const res = await POST(await makeSignedPostRequest());

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost/profile?unsubscribed=true');
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockSet).toHaveBeenCalledWith({
            emailNotificationsEnabled: false,
            notificationPreference: 'none',
        });
        expect(mockWhere).toHaveBeenCalledWith({ field: 'email', value: 'student@college.edu' });
        // Cookie is cleared after a successful, one-time use.
        expect(res.cookies.get(CSRF_COOKIE)?.maxAge).toBe(0);
    });

    it('refuses to unsubscribe when the signed-in user does not match the token email', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'attacker@example.com' },
        });

        const res = await POST(await makeSignedPostRequest());

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('Signed-in%20user%20does%20not%20match');
        expect(mockUpdate).not.toHaveBeenCalled();
    });
});
