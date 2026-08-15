import { POST } from '@/app/api/replies/vote/route';

const currentUserMock = jest.fn();
const selectResultQueue: any[] = [];
const updateResultQueue: any[] = [];
let transactionLockRows: any[] = [{ id: 11 }];

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: () => currentUserMock(),
}));

jest.mock('@/lib/ratelimit/api-rate-limit', () => ({
    enforceApiRateLimit: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/lib/ratelimit/ratelimit', () => ({
    generalLimiter: {},
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
            insert: jest.fn().mockImplementation(() => ({
                values: jest.fn().mockResolvedValue({}),
            })),
            update: jest.fn().mockImplementation(() => ({
                set: jest.fn().mockImplementation(() => ({
                    where: jest.fn().mockImplementation(() => ({
                        returning: jest.fn().mockResolvedValue(updateResultQueue.shift() ?? []),
                    })),
                })),
            })),
        } as any;

        // Add transaction that runs callback with a tx proxy sharing the same mocks
        db.transaction = jest.fn().mockImplementation((callback: (tx: any) => Promise<any>) => {
            const tx = {
                execute: jest.fn().mockImplementation(async () => ({ rows: transactionLockRows })),
                select: () => createQueryMock(selectResultQueue.shift() ?? []),
                delete: () => ({ where: jest.fn().mockResolvedValue({}) }),
                insert: db.insert,
                update: db.update,
            };
            return callback(tx);
        });

        (globalThis as any).__voteDbMock = db;
        return db;
    })(),
}));

describe('Reply Vote API Endpoint', () => {
    beforeEach(() => {
        currentUserMock.mockReset();
        selectResultQueue.length = 0;
        updateResultQueue.length = 0;
        transactionLockRows = [{ id: 11 }];
        jest.clearAllMocks();
    });

    it('uses the authenticated Clerk identity instead of the client userName', async () => {
        currentUserMock.mockResolvedValue({
            id: 'clerk_user_id',
            username: null,
            fullName: 'Clerk Teacher',
            firstName: 'Clerk',
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });

        selectResultQueue.push(
            [], // user block check select
            [{ id: 1, replyId: 1, doubtId: 11, userEmail: 'other@example.com' }],
            [{ classroomId: null }],
            []
        );
        updateResultQueue.push([{ id: 1, upvotes: 1 }]);

        const req = new Request('http://localhost/api/replies/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replyId: 1 }),
        });

        const res = await POST(req);
        const json = await res?.json();
        const dbMock = (globalThis as any).__voteDbMock;

        expect(res?.status).toBe(200);
        expect(json.hasUpvoted).toBe(true);
        expect(dbMock.insert).toHaveBeenCalled();
        expect(dbMock.insert.mock.results[0].value.values).toHaveBeenCalledWith({
            userEmail: 'teacher@example.com',
            replyId: 1,
        });
    });

    it('does not mutate when the parent is deleted before the transaction lock', async () => {
        currentUserMock.mockResolvedValue({
            id: 'clerk_user_id',
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });
        selectResultQueue.push(
            [],
            [{ id: 1, replyId: 1, doubtId: 11, userEmail: 'other@example.com' }],
            [{ classroomId: null }],
        );
        transactionLockRows = [];

        const res = await POST(new Request('http://localhost/api/replies/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replyId: 1 }),
        }));

        expect(res.status).toBe(404);
        expect((globalThis as any).__voteDbMock.insert).not.toHaveBeenCalled();
    });

    it('returns 404 before the self-upvote guard for a deleted parent', async () => {
        currentUserMock.mockResolvedValue({
            id: 'clerk_user_id',
            primaryEmailAddress: { emailAddress: 'author@example.com' },
        });
        selectResultQueue.push(
            [],
            [{ id: 1, replyId: 1, doubtId: 11, userEmail: 'author@example.com' }],
            [],
        );

        const res = await POST(new Request('http://localhost/api/replies/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replyId: 1 }),
        }));

        expect(res.status).toBe(404);
        expect((globalThis as any).__voteDbMock.transaction).not.toHaveBeenCalled();
    });
});
