import { NextRequest } from 'next/server';
import { generateUnsubscribeToken } from '@/lib/email';

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

describe('Unsubscribe API Endpoint', () => {
    beforeEach(() => {
        process.env.UNSUBSCRIBE_SECRET = 'test-unsubscribe-secret';
        jest.clearAllMocks();
        currentUserMock.mockResolvedValue(null);
    });

    it('does not change notification preferences on GET', async () => {
        const res = await GET(makeSignedRequest('GET'));

        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
        expect(res.headers.get('cache-control')).toBe('no-store');
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

    it('updates notification preferences only for a valid signed POST', async () => {
        const res = await POST(makeSignedRequest('POST'));

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toBe('http://localhost/profile?unsubscribed=true');
        expect(mockUpdate).toHaveBeenCalledTimes(1);
        expect(mockSet).toHaveBeenCalledWith({
            emailNotificationsEnabled: false,
            notificationPreference: 'none',
        });
        expect(mockWhere).toHaveBeenCalledWith({ field: 'email', value: 'student@college.edu' });
    });

    it('refuses to unsubscribe when the signed-in user does not match the token email', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'attacker@example.com' },
        });

        const res = await POST(makeSignedRequest('POST'));

        expect(res.status).toBe(307);
        expect(res.headers.get('location')).toContain('Signed-in%20user%20does%20not%20match');
        expect(mockUpdate).not.toHaveBeenCalled();
    });
});
