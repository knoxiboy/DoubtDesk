import { POST } from './route';

const mockCurrentUser = jest.fn();
const mockSelectResultQueue: any[] = [];
const mockUpdateResultQueue: any[] = [];

jest.mock('@/inngest/client', () => ({
    inngest: { send: jest.fn().mockResolvedValue({}) },
}));

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: () => mockCurrentUser(),
}));

const mockCreateQuery = (data: any) => ({
    from: () => mockCreateQuery(data),
    where: () => mockCreateQuery(data),
    limit: () => mockCreateQuery(data),
    then: (resolve: any) => Promise.resolve(resolve(data)),
});

jest.mock('@/configs/db', () => ({
    db: (() => {
        const db = {
            select: jest.fn().mockImplementation(() => mockCreateQuery(mockSelectResultQueue.shift() ?? [])),
            delete: jest.fn().mockImplementation(() => ({
                where: jest.fn().mockResolvedValue({}),
            })),
            insert: jest.fn().mockImplementation(() => ({
                values: jest.fn().mockResolvedValue({}),
            })),
            update: jest.fn().mockImplementation(() => ({
                set: jest.fn().mockImplementation(() => ({
                    where: jest.fn().mockImplementation(() => ({
                        returning: jest.fn().mockResolvedValue(mockUpdateResultQueue.shift() ?? []),
                    })),
                })),
            })),
        } as any;

        // Add transaction that runs callback with a tx proxy sharing the same mocks
        db.transaction = jest.fn().mockImplementation((callback: (tx: any) => Promise<any>) => {
            const tx = {
                select: jest.fn().mockImplementation(() => mockCreateQuery(mockSelectResultQueue.shift() ?? [])),
                delete: jest.fn().mockImplementation(() => ({
                    where: jest.fn().mockResolvedValue({}),
                })),
                insert: db.insert,
                update: db.update,
            };
            return callback(tx);
        });

        return db;
    })(),
}));

describe('Reply Vote API Endpoint', () => {
    beforeEach(() => {
        mockCurrentUser.mockReset();
        mockSelectResultQueue.length = 0;
        mockUpdateResultQueue.length = 0;
        jest.clearAllMocks();
    });

    it('uses the authenticated Clerk identity instead of the client userName', async () => {
        mockCurrentUser.mockResolvedValue({
            id: 'clerk_user_id',
            username: null,
            fullName: 'Clerk Teacher',
            firstName: 'Clerk',
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });

        mockSelectResultQueue.push(
            [], // user block check select
            [{ id: 1, replyId: 1, userEmail: 'other@example.com' }],
            []
        );
        mockUpdateResultQueue.push([{ id: 1, upvotes: 1 }]);

        const req = new Request('http://localhost/api/replies/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replyId: 1 }),
        });

        const res = await POST(req);
        const json = await res?.json();
        const { db } = jest.requireMock('@/configs/db');

        expect(res?.status).toBe(200);
        expect(json.hasUpvoted).toBe(true);
        expect(db.insert).toHaveBeenCalled();
        expect(db.insert.mock.results[0].value.values).toHaveBeenCalledWith({
            userEmail: 'teacher@example.com',
            replyId: 1,
        });
    });

    it('successfully upvotes a reply, returning 200 status and the incremented upvote counter', async () => {
        mockCurrentUser.mockResolvedValue({
            id: 'voter_clerk_id',
            username: 'voter',
            fullName: 'Voter User',
            primaryEmailAddress: { emailAddress: 'voter@example.com' },
        });

        mockSelectResultQueue.push(
            [], // 1. checkUserBlock userBlocksTable query (not blocked)
            [{ id: 1, userEmail: 'author@example.com', upvotes: 5 }], // 2. repliesTable query
            []  // 3. replyLikesTable query inside transaction
        );

        mockUpdateResultQueue.push([{ id: 1, upvotes: 6, userEmail: 'author@example.com' }]);

        const req = new Request('http://localhost/api/replies/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replyId: 1 }),
        });

        const res = await POST(req);
        const json = await res?.json();

        expect(res?.status).toBe(200);
        expect(json.hasUpvoted).toBe(true);
        expect(json.upvotes).toBe(6);

        const { inngest } = jest.requireMock('@/inngest/client');
        expect(inngest.send).toHaveBeenCalledWith({
            name: 'karma/answer.upvoted',
            data: {
                replyAuthorEmail: 'author@example.com',
                replyId: 1,
                doubtId: undefined,
            },
        });
    });

    it('prevents a user from upvoting their own reply', async () => {
        mockCurrentUser.mockResolvedValue({
            id: 'author_clerk_id',
            username: 'author',
            fullName: 'Author User',
            primaryEmailAddress: { emailAddress: 'author@example.com' },
        });

        mockSelectResultQueue.push(
            [], // checkUserBlock (not blocked)
            [{ id: 1, userEmail: 'author@example.com', upvotes: 5 }] // repliesTable select
        );

        const req = new Request('http://localhost/api/replies/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replyId: 1 }),
        });

        const res = await POST(req);
        expect(res?.status).toBe(403);
        const json = await res?.json();
        expect(json.error).toContain('cannot upvote your own reply');

        const { inngest } = jest.requireMock('@/inngest/client');
        expect(inngest.send).not.toHaveBeenCalled();
    });

    it('successfully removes an existing upvote, returning 200 status and the decremented upvote counter', async () => {
        mockCurrentUser.mockResolvedValue({
            id: 'voter_clerk_id',
            username: 'voter',
            fullName: 'Voter User',
            primaryEmailAddress: { emailAddress: 'voter@example.com' },
        });

        mockSelectResultQueue.push(
            [], // 1. checkUserBlock userBlocksTable query (not blocked)
            [{ id: 1, userEmail: 'author@example.com', upvotes: 5 }], // 2. repliesTable query
            [{ id: 10, userEmail: 'voter@example.com', replyId: 1 }]  // 3. replyLikesTable query inside transaction (existing like)
        );

        mockUpdateResultQueue.push([{ id: 1, upvotes: 4, userEmail: 'author@example.com' }]);

        const req = new Request('http://localhost/api/replies/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replyId: 1 }),
        });

        const res = await POST(req);
        const json = await res?.json();
        const { db } = jest.requireMock('@/configs/db');

        expect(res?.status).toBe(200);
        expect(json.hasUpvoted).toBe(false);
        expect(json.upvotes).toBe(4);
    });
});
