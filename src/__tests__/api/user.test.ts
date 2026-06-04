import { POST } from '@/app/api/user/route';
import { NextRequest } from 'next/server';

jest.mock('@clerk/nextjs/server', () => ({
    auth: jest.fn().mockImplementation(async () => ({
        userId: 'user_123',
        sessionClaims: { email: 'sync@example.com', name: 'Sync User' }
    })),
    currentUser: jest.fn().mockImplementation(async () => ({
        primaryEmailAddress: { emailAddress: 'sync@example.com' },
        fullName: 'Sync User'
    }))
}));

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn().mockImplementation(() => ({
            from: jest.fn().mockImplementation(() => ({
                where: jest.fn().mockImplementation(async () => ([{
                    id: 1,
                    email: 'sync@example.com',
                    name: 'Sync User',
                    violationCount: 0
                }]))
            }))
        }))
    }
}));

describe('User Sync API Endpoint', () => {
    it('POST should sync and return user profile', async () => {
        const req = new NextRequest('http://localhost/api/user', { method: 'POST' });
        const res = await POST(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.email).toBe('sync@example.com');
    });
});
