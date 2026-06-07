import { DELETE, PATCH } from '@/app/api/replies/action/[id]/route';

const currentUserMock = jest.fn();
const selectResultQueue: any[] = [];
const updateResultQueue: any[] = [];

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: () => currentUserMock(),
}));

const createQueryMock = (data: any) => ({
    from: () => createQueryMock(data),
    where: () => createQueryMock(data),
    limit: () => createQueryMock(data),
    then: (resolve: any) => Promise.resolve(resolve(data)),
});

jest.mock('@/configs/db', () => ({
    db: (() => {
        const db = {
            select: jest.fn().mockImplementation(() => createQueryMock(selectResultQueue.shift() ?? [])),
            delete: jest.fn().mockImplementation(() => ({
                where: jest.fn().mockResolvedValue({}),
            })),
            update: jest.fn().mockImplementation(() => ({
                set: jest.fn().mockImplementation(() => ({
                    where: jest.fn().mockImplementation(() => ({
                        returning: jest.fn().mockResolvedValue(updateResultQueue.shift() ?? []),
                    })),
                })),
            })),
        };

        (globalThis as any).__repliesActionDbMock = db;
        return db;
    })(),
}));

describe('Replies Action API Endpoint', () => {
    beforeEach(() => {
        currentUserMock.mockReset();
        selectResultQueue.length = 0;
        updateResultQueue.length = 0;
        jest.clearAllMocks();
    });

    it('returns 401 for unauthenticated DELETE', async () => {
        currentUserMock.mockResolvedValue(null);

        const req = new Request('http://localhost/api/replies/action/2', {
            method: 'DELETE',
        });

        const res = (await DELETE(req as any, { params: Promise.resolve({ id: '2' }) }))!;
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json.error).toBe('Unauthorized');
    });

    it('returns 400 when authenticated user has no email', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: null,
        });

        const req = new Request('http://localhost/api/replies/action/2', {
            method: 'DELETE',
        });

        const res = (await DELETE(req as any, { params: Promise.resolve({ id: '2' }) }))!;
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe('Email required');
    });

    it('returns 403 for authenticated non-owner PATCH', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });

        selectResultQueue.push(
            [], // user block check select
            [{ id: 2, doubtId: 2, userEmail: 'owner@example.com' }],
            [{ id: 2, classroomId: null }]
        );

        const req = new Request('http://localhost/api/replies/action/2', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: 'updated content' }),
        });

        const res = (await PATCH(req as any, { params: Promise.resolve({ id: '2' }) }))!;
        const json = await res.json();

        expect(res.status).toBe(403);
        expect(json.error).toContain('Forbidden');
    });

    it('allows owner DELETE', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'owner@example.com' },
        });

        selectResultQueue.push(
            [], // user block check select
            [{ id: 2, doubtId: 2, userEmail: 'owner@example.com' }],
            [{ id: 2, classroomId: null }]
        );

        const req = new Request('http://localhost/api/replies/action/2', {
            method: 'DELETE',
        });

        const res = (await DELETE(req as any, { params: Promise.resolve({ id: '2' }) }))!;
        const json = await res.json();
        const dbMock = (globalThis as any).__repliesActionDbMock;

        expect(res.status).toBe(200);
        expect(json.message).toBe('Reply deleted successfully');
        expect(dbMock.delete).toHaveBeenCalled();
    });
});