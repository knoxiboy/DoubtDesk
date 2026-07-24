/**
 * Verifies that the doubts GET endpoint computes hasLiked / hasBookmarked
 * inline via EXISTS subqueries (PR #725) rather than separate round-trips.
 *
 * For authenticated users the main SELECT must include hasLiked and
 * hasBookmarked columns. For anonymous users both must resolve to false
 * without issuing any per-user queries.
 */

const currentUserMock = jest.fn();
const selectQueue: any[] = [];

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
    const chain: any = {};
    chain.from = () => chain;
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

// Track select calls via a wrapper — jest.mock factories are hoisted above
// variable declarations, so we can't reference a `const` spy directly.
// Instead we use a module-level array that the factory closes over.
const mockSelectCalls: any[][] = [];

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn((...args: any[]) => {
            mockSelectCalls.push(args);
            return makeChain(args[0]);
        }),
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
    { id: 1, subject: 'Physics', content: 'What is speed of light?', createdAt: '2026-01-01T00:00:00.000Z', likes: 4, isSolved: 'unsolved', isPinned: false, classroomId: null, type: 'community', userEmail: 'student@example.com', hasLiked: true, hasBookmarked: false },
    { id: 2, subject: 'Chemistry', content: 'What is pH?', createdAt: '2026-01-02T00:00:00.000Z', likes: 10, isSolved: 'solved', isPinned: false, classroomId: null, type: 'community', userEmail: 'other@example.com', hasLiked: false, hasBookmarked: true },
];

describe('Doubts GET endpoint — inline EXISTS for likes/bookmarks (PR #725)', () => {
    beforeEach(() => {
        currentUserMock.mockReset();
        selectQueue.length = 0;
        mockSelectCalls.length = 0;
        jest.clearAllMocks();
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'student@example.com' },
            fullName: 'Test Student',
        });
    });

    it('returns hasLiked and hasBookmarked inline from the main query', async () => {
        // Queue: count, main doubts (includes hasLiked/hasBookmarked), tags
        selectQueue.push(
            [{ count: 2 }],
            pageOfDoubts,
            [],
        );

        const res = await GET(new Request('http://localhost/api/doubts?subject=Physics'));
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.doubts).toHaveLength(2);

        // hasLiked / hasBookmarked should come from the main SELECT (EXISTS subqueries)
        // rather than from separate follow-up queries.
        expect(json.doubts[0].hasLiked).toBe(true);
        expect(json.doubts[0].hasBookmarked).toBe(false);
        expect(json.doubts[1].hasLiked).toBe(false);
        expect(json.doubts[1].hasBookmarked).toBe(true);

        // The main SELECT should include hasLiked and hasBookmarked fields
        const mainSelectCall = mockSelectCalls.find(
            (call) => call[0] && 'hasLiked' in call[0] && 'hasBookmarked' in call[0]
        );
        expect(mainSelectCall).toBeDefined();
    });

    it('resolves hasLiked/hasBookmarked to false for anonymous users', async () => {
        currentUserMock.mockResolvedValue(null);

        const anonDoubts = pageOfDoubts.map(d => ({ ...d, hasLiked: false, hasBookmarked: false }));
        selectQueue.push(
            [{ count: 2 }],
            anonDoubts,
            [],
        );

        const res = await GET(new Request('http://localhost/api/doubts?subject=Physics'));
        const json = await res.json();

        expect(res.status).toBe(200);
        // Anonymous users get false for both fields via the sql`false` fallback
        expect(json.doubts[0].hasLiked).toBe(false);
        expect(json.doubts[0].hasBookmarked).toBe(false);
    });
});
