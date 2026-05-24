import { POST } from '@/app/api/replies/vote/route';

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
        };

        (globalThis as any).__voteDbMock = db;
        return db;
    })(),
}));

describe('Reply Vote API Endpoint', () => {
    beforeEach(() => {
        currentUserMock.mockReset();
        selectResultQueue.length = 0;
        updateResultQueue.length = 0;
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
            [{ id: 1, replyId: 1, userName: 'Clerk Teacher' }],
            []
        );
        updateResultQueue.push([{ id: 1, upvotes: 1 }]);

        const req = new Request('http://localhost/api/replies/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replyId: 1, userName: 'Impersonated User' }),
        });

        const res = await POST(req);
        const json = await res.json();
        const dbMock = (globalThis as any).__voteDbMock;

        expect(res.status).toBe(200);
        expect(json.hasUpvoted).toBe(true);
        expect(dbMock.insert).toHaveBeenCalled();
        expect(dbMock.insert.mock.results[0].value.values).toHaveBeenCalledWith({
            userName: 'clerk_user_id',
            replyId: 1,
        });
    });
});