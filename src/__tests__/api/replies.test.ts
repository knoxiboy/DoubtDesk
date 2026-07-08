import { inArray } from 'drizzle-orm';

const currentUserMock = jest.fn();
const selectQueue: any[] = [];

// Spy on inArray so we can assert the reply-likes query is scoped to the
// doubt's reply IDs and not over-fetched across the whole app.
jest.mock('drizzle-orm', () => {
    const actual = jest.requireActual('drizzle-orm');
    return {
        ...actual,
        inArray: jest.fn(actual.inArray),
    };
});

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: () => currentUserMock(),
}));

jest.mock('@/configs/schema', () => ({
    repliesTable: { doubtId: 'replies.doubtId', id: 'replies.id', userEmail: 'replies.userEmail' },
    doubtsTable: { id: 'doubts.id', deletedAt: 'doubts.deletedAt' },
    replyLikesTable: { userEmail: 'replyLikes.userEmail', replyId: 'replyLikes.replyId' },
    usersTable: { email: 'users.email', blockedUntil: 'users.blockedUntil' },
    membershipsTable: { userEmail: 'memberships.userEmail', classroomId: 'memberships.classroomId', role: 'memberships.role' },
}));

const buildQuery = (data: any) => {
    const q: any = {};
    q.from = () => q;
    q.where = () => q;
    q.orderBy = () => q;
    q.limit = () => q;
    q.then = (resolve: any) => Promise.resolve(resolve(data));
    return q;
};

jest.mock('@/configs/db', () => {
    const returning = jest.fn(() => Promise.resolve([]));
    const insertValues = jest.fn(() => ({ returning }));
    const updateSet = jest.fn(() => ({ where: jest.fn(() => ({ returning })) }));
    const delWhere = jest.fn(() => Promise.resolve({}));
    return {
        db: {
            select: jest.fn(() => buildQuery(selectQueue.shift() ?? [])),
            insert: jest.fn(() => ({ values: insertValues })),
            update: jest.fn(() => ({ set: updateSet })),
            delete: jest.fn(() => ({ where: delWhere })),
        },
    };
});

import { GET } from '@/app/api/replies/route';

describe('Replies GET endpoint', () => {
    beforeEach(() => {
        currentUserMock.mockReset();
        selectQueue.length = 0;
        (inArray as jest.Mock).mockClear();
        jest.clearAllMocks();
    });

    it('scopes the user upvotes query to this doubt\'s reply IDs', async () => {
        currentUserMock.mockResolvedValue({
            id: 'clerk_1',
            primaryEmailAddress: { emailAddress: 'student@example.com' },
        });

        const replies = [
            { id: 7, doubtId: 1, userEmail: 'owner@example.com' },
            { id: 8, doubtId: 1, userEmail: 'other@example.com' },
        ];

        // Queue order matches GET execution:
        // 1) user block check, 2) doubt lookup, 3) replies, 4) reply likes.
        selectQueue.push(
            [], // no block
            [{ id: 1, classroomId: null, type: 'community', userEmail: 'owner@example.com' }],
            replies,
            [{ replyId: 7, userEmail: 'student@example.com' }],
        );

        const res = await GET(new Request('http://localhost/api/replies?doubtId=1'));
        const json = await res.json();

        // The GET must scope the like lookup with inArray(replyLikesTable.replyId, [...]).
        const scopedCall = (inArray as jest.Mock).mock.calls.find(
            (call) => call[0] === 'replyLikes.replyId',
        );
        expect(scopedCall).toBeDefined();
        expect(scopedCall![1]).toEqual(expect.arrayContaining([7, 8]));
        expect(scopedCall![1]).toHaveLength(2);

        // hasUpvoted reflects only this doubt's replies.
        const byId = Object.fromEntries(json.map((r: any) => [r.id, r.hasUpvoted]));
        expect(byId[7]).toBe(true);
        expect(byId[8]).toBe(false);
    });

    it('does not query reply likes when the user is anonymous', async () => {
        currentUserMock.mockResolvedValue(null);

        // Anonymous users skip the user-block select (it only runs when email
        // is present), so the queue starts directly with the doubt lookup.
        selectQueue.push(
            [{ id: 1, classroomId: null, type: 'community', userEmail: 'owner@example.com' }],
            [{ id: 9, doubtId: 1, userEmail: 'owner@example.com' }],
        );

        const res = await GET(new Request('http://localhost/api/replies?doubtId=1'));
        const json = await res.json();

        expect(res.status).toBe(200);
        expect((inArray as jest.Mock).mock.calls.length).toBe(0);
        expect(json[0].hasUpvoted).toBeFalsy();
    });
});
