import { inArray } from 'drizzle-orm';

const currentUserMock = jest.fn();
const selectQueue: any[] = [];

// Spy on inArray so we can assert the likes/bookmarks queries are scoped to
// this page's doubt IDs instead of over-fetching globally.
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
    doubtsTable: { id: 'doubts.id', deletedAt: 'doubts.deletedAt', classroomId: 'doubts.classroomId', type: 'doubts.type', subject: 'doubts.subject', content: 'doubts.content', userEmail: 'doubts.userEmail', isSolved: 'doubts.isSolved', isPinned: 'doubts.isPinned', likes: 'doubts.likes', createdAt: 'doubts.createdAt' },
    repliesTable: { doubtId: 'replies.doubtId' },
    likesTable: { doubtId: 'likes.doubtId', userEmail: 'likes.userEmail' },
    bookmarksTable: { doubtId: 'bookmarks.doubtId', userEmail: 'bookmarks.userEmail' },
    doubtTagsTable: { doubtId: 'doubtTags.doubtId', tagId: 'doubtTags.tagId' },
    tagsTable: { id: 'tags.id', normalizedName: 'tags.normalizedName' },
    membershipsTable: { userEmail: 'memberships.userEmail', classroomId: 'memberships.classroomId', role: 'memberships.role' },
}));

const makeChain = (fields: any) => {
    let table: any;
    const chain: any = {};
    chain.from = (t: any) => { table = t; return chain; };
    chain.where = () => chain;
    chain.orderBy = () => chain;
    chain.limit = () => chain;
    chain.offset = () => chain;
    chain.groupBy = () => chain;
    chain.innerJoin = () => chain;
    chain.leftJoin = () => chain;
    chain.then = (resolve: any) => Promise.resolve(resolve(selectQueue.shift() ?? []));
    return chain;
};

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn((fields: any) => makeChain(fields)),
        insert: jest.fn(() => ({ values: jest.fn(() => ({ returning: jest.fn(() => Promise.resolve([])), onConflictDoNothing: jest.fn(() => Promise.resolve({})) })) })),
        update: jest.fn(() => ({ set: jest.fn(() => ({ where: jest.fn(() => Promise.resolve([])) })) })),
        delete: jest.fn(() => ({ where: jest.fn(() => Promise.resolve({})) })),
    },
}));

jest.mock('@/lib/search/search', () => ({ buildRankOrder: jest.fn(() => null), buildSearchCondition: jest.fn(() => null) }));
jest.mock('@/lib/moderation/moderation', () => ({ moderateContent: jest.fn().mockResolvedValue({ isAllowed: true }), handleModerationViolation: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/ai/categorizer', () => ({ categorizeDoubt: jest.fn().mockResolvedValue('General') }));
jest.mock('@/lib/ai/embeddings', () => ({ safeGenerateEmbedding: jest.fn().mockResolvedValue([]) }));
jest.mock('@/lib/errors/error-handler', () => ({ buildErrorResponse: jest.fn().mockReturnValue({ status: 500, body: { error: 'Internal Server Error' } }), errorResponse: jest.fn(), ApiError: class extends Error {} }));
jest.mock('@/lib/validations/validate', () => ({ parseAndValidateRequest: jest.fn().mockImplementation(async (req: Request) => ({ errorResponse: null, data: await req.json().catch(() => ({})) })) }));
jest.mock('@/lib/validations/doubt', () => ({ createDoubtSchema: {} }));
jest.mock('@/lib/notifications/service', () => ({ createClassroomDoubtNotifications: jest.fn() }));
jest.mock('@/inngest/client', () => ({ inngest: { send: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('@/lib/ratelimit/api-rate-limit', () => ({ enforceApiRateLimit: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/ratelimit/ratelimit', () => ({ generalLimiter: {} }));
jest.mock('@/lib/auth/auth-utils', () => ({ checkUserBlock: jest.fn().mockResolvedValue({ isBlocked: false, errorResponse: null }) }));
jest.mock('@/lib/auth/membership-guard', () => ({ canTeach: jest.fn(() => false) }));
jest.mock('@/lib/anonymity/anonymity', () => ({ toPublicDoubt: (d: any) => ({ ...d, author: 'Student_X', isOwnPost: false }) }));

import { GET } from '@/app/api/doubts/route';

const pageOfDoubts = [
    { id: 1, subject: 'Physics', content: 'What is speed of light?', createdAt: '2026-01-01T00:00:00.000Z', likes: 4, isSolved: 'unsolved', isPinned: false, classroomId: null, type: 'community', userEmail: 'student@example.com' },
    { id: 2, subject: 'Chemistry', content: 'What is pH?', createdAt: '2026-01-02T00:00:00.000Z', likes: 10, isSolved: 'solved', isPinned: false, classroomId: null, type: 'community', userEmail: 'other@example.com' },
];

describe('Doubts GET endpoint — scoped likes/bookmarks', () => {
    beforeEach(() => {
        currentUserMock.mockReset();
        selectQueue.length = 0;
        (inArray as jest.Mock).mockClear();
        jest.clearAllMocks();
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'student@example.com' },
            fullName: 'Test Student',
        });
    });

    it('scopes the user likes and bookmarks queries to this page\'s doubt IDs', async () => {
        // Queue order for an authenticated GET: count, doubts, reply counts,
        // likes, bookmarks, tags.
        selectQueue.push(
            [{ count: 2 }],
            pageOfDoubts,
            [{ doubtId: 1, count: 2 }, { doubtId: 2, count: 1 }],
            [{ doubtId: 1 }],          // user liked doubt 1 only
            [{ doubtId: 2 }],          // user bookmarked doubt 2 only
            [],
        );

        const res = await GET(new Request('http://localhost/api/doubts?subject=Physics'));
        const json = await res.json();

        // Both like and bookmark lookups must be scoped with inArray(..., [1, 2]).
        const likeCall = (inArray as jest.Mock).mock.calls.find((c) => c[0] === 'likes.doubtId');
        const bookmarkCall = (inArray as jest.Mock).mock.calls.find((c) => c[0] === 'bookmarks.doubtId');

        expect(res.status).toBe(200);
        expect(likeCall).toBeDefined();
        expect(likeCall![1]).toEqual([1, 2]);
        expect(bookmarkCall).toBeDefined();
        expect(bookmarkCall![1]).toEqual([1, 2]);

        // hasLiked / hasBookmarked reflect only this page's doubts.
        const byId = Object.fromEntries(json.doubts.map((d: any) => [d.id, d]));
        expect(byId[1].hasLiked).toBe(true);
        expect(byId[1].hasBookmarked).toBe(false);
        expect(byId[2].hasLiked).toBe(false);
        expect(byId[2].hasBookmarked).toBe(true);
    });

    it('does not query likes/bookmarks for anonymous users', async () => {
        currentUserMock.mockResolvedValue(null);

        selectQueue.push(
            [{ count: 2 }],
            pageOfDoubts,
            [{ doubtId: 1, count: 2 }, { doubtId: 2, count: 1 }],
            [],
        );

        const res = await GET(new Request('http://localhost/api/doubts?subject=Physics'));
        const json = await res.json();

        expect(res.status).toBe(200);
        // No like/bookmark scoping queries should be issued for anonymous users.
        expect((inArray as jest.Mock).mock.calls.some((c) => c[0] === 'likes.doubtId')).toBe(false);
        expect((inArray as jest.Mock).mock.calls.some((c) => c[0] === 'bookmarks.doubtId')).toBe(false);
        expect(json.doubts[0].hasLiked).toBeFalsy();
        expect(json.doubts[0].hasBookmarked).toBeFalsy();
    });
});
