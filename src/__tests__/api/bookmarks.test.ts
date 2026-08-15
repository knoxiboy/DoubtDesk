/**
 * Unit test for GET /api/bookmarks: verifying that bookmarked doubts pass
 * through toPublicDoubt so author emails and internal fields are never leaked.
 * Addresses issue #1101 — privacy leak in bookmarks endpoint.
 */
import { GET } from '@/app/api/bookmarks/route';
import { currentUser } from '@clerk/nextjs/server';
import { getAnonymousHandle } from '@/lib/anonymity/anonymity';

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: jest.fn(),
}));

jest.mock('next/server', () => ({
    NextResponse: {
        json: jest.fn((body: any, init?: { status?: number }) => ({
            status: init?.status ?? 200,
            json: async () => body,
        })),
    },
}));

jest.mock('@/lib/errors/error-handler', () => ({
    buildErrorResponse: jest.fn().mockReturnValue({ status: 500, body: { error: 'Internal Server Error' } }),
    errorResponse: jest.fn((message: string, status = 500) => ({
        status,
        json: async () => ({ error: message }),
    })),
    ApiError: class ApiError extends Error {
        constructor(public statusCode: number, message: string) {
            super(message);
        }
    },
}));

jest.mock('@/lib/utils/utils', () => ({
    parsePositiveInt: jest.fn((val: string, fallback: number) => {
        const n = parseInt(val, 10);
        return isNaN(n) ? fallback : n;
    }),
}));

// Queue of results returned by successive db.select().from().where().* chains.
const selectResultQueue: any[] = [];

const createQueryMock = (data: any) => {
    const chain: any = {
        from: () => chain,
        where: () => chain,
        limit: () => chain,
        offset: () => chain,
        orderBy: () => chain,
        groupBy: () => chain,
        select: jest.fn().mockImplementation(() => createQueryMock(selectResultQueue.shift() ?? data)),
        then: (resolve: any) => Promise.resolve(resolve(data)),
    };
    return chain;
};

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn().mockImplementation(() => createQueryMock(selectResultQueue.shift() ?? [])),
    },
}));

const AUTHOR_EMAIL = 'author@example.com';

const rawBookmarkedDoubt = {
    id: 42,
    userEmail: AUTHOR_EMAIL,
    classroomId: 10,
    subject: 'Linear Algebra',
    content: 'What are eigenvalues?',
    likes: 5,
    isSolved: 'unsolved',
    type: 'community',
    isPinned: false,
    embedding: [0.1, 0.2, 0.3],
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
};

const makeRequest = (page = '1', limit = '20') =>
    GET(new Request(`http://localhost/api/bookmarks?page=${page}&limit=${limit}`)) as Promise<Response>;

const assertNoIdentityLeak = (json: any) => {
    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain(AUTHOR_EMAIL);
    expect(serialized).not.toContain('author@');
    expect(json).not.toHaveProperty('userEmail');
    expect(json).not.toHaveProperty('embedding');
    expect(json).not.toHaveProperty('deletedAt');
};

describe('GET /api/bookmarks — anonymity (issue #1101)', () => {
    beforeEach(() => {
        (currentUser as jest.Mock).mockReset();
        selectResultQueue.length = 0;
        jest.clearAllMocks();
    });

    it('returns 401 when the user is not authenticated', async () => {
        (currentUser as jest.Mock).mockResolvedValue(null);
        const res = await makeRequest();
        expect(res.status).toBe(401);
    });

    it('returns empty data when the user has no bookmarks', async () => {
        (currentUser as jest.Mock).mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'bob@example.com' },
        });
        // select 1: total count => 0
        selectResultQueue.push([{ total: 0 }]);

        const res = await makeRequest();
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.data).toEqual([]);
        expect(json.pagination.total).toBe(0);
    });

    it('strips userEmail and internal fields from bookmarked doubts', async () => {
        (currentUser as jest.Mock).mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'bob@example.com' },
        });

        // select chain 1: total count => 1
        selectResultQueue.push([{ total: 1 }]);
        // select chain 2: bookmarks => [{ doubtId: 42 }]
        selectResultQueue.push([{ doubtId: 42 }]);
        // select chain 3: doubts => [rawBookmarkedDoubt]
        selectResultQueue.push([rawBookmarkedDoubt]);
        // select chain 4: user likes => []
        selectResultQueue.push([]);
        // select chain 5: reply counts => []
        selectResultQueue.push([]);

        const res = await makeRequest();
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.data).toHaveLength(1);

        const doubt = json.data[0];
        assertNoIdentityLeak(doubt);
    });

    it('adds anonymized author handle, authorInitial, and isOwnPost', async () => {
        (currentUser as jest.Mock).mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'bob@example.com' },
        });

        selectResultQueue.push([{ total: 1 }]);
        selectResultQueue.push([{ doubtId: 42 }]);
        selectResultQueue.push([rawBookmarkedDoubt]);
        selectResultQueue.push([]);
        selectResultQueue.push([]);

        const res = await makeRequest();
        const json = await res.json();
        const doubt = json.data[0];

        expect(doubt.author).toBe(getAnonymousHandle(AUTHOR_EMAIL));
        expect(doubt.authorInitial).toHaveLength(1);
        expect(typeof doubt.isOwnPost).toBe('boolean');
        expect(doubt.isOwnPost).toBe(false);
    });

    it('sets isOwnPost true when the viewer is the author', async () => {
        (currentUser as jest.Mock).mockResolvedValue({
            primaryEmailAddress: { emailAddress: AUTHOR_EMAIL },
        });

        selectResultQueue.push([{ total: 1 }]);
        selectResultQueue.push([{ doubtId: 42 }]);
        selectResultQueue.push([rawBookmarkedDoubt]);
        selectResultQueue.push([]);
        selectResultQueue.push([]);

        const res = await makeRequest();
        const json = await res.json();
        const doubt = json.data[0];

        expect(doubt.isOwnPost).toBe(true);
        expect(doubt.author).toBe(getAnonymousHandle(AUTHOR_EMAIL));
    });

    it('preserves hasLiked, hasBookmarked, and replyCount', async () => {
        (currentUser as jest.Mock).mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'bob@example.com' },
        });

        selectResultQueue.push([{ total: 1 }]);
        selectResultQueue.push([{ doubtId: 42 }]);
        selectResultQueue.push([rawBookmarkedDoubt]);
        // user likes: doubt 42 is liked
        selectResultQueue.push([{ doubtId: 42 }]);
        // reply counts: 3 replies
        selectResultQueue.push([{ doubtId: 42, count: 3 }]);

        const res = await makeRequest();
        const json = await res.json();
        const doubt = json.data[0];

        expect(doubt.hasLiked).toBe(true);
        expect(doubt.hasBookmarked).toBe(true);
        expect(doubt.replyCount).toBe(3);
        // Non-identifying content is still present
        expect(doubt.subject).toBe('Linear Algebra');
        expect(doubt.content).toBe('What are eigenvalues?');
        expect(doubt.id).toBe(42);
    });

    it('never serializes the author email anywhere in the JSON response', async () => {
        (currentUser as jest.Mock).mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'bob@example.com' },
        });

        selectResultQueue.push([{ total: 1 }]);
        selectResultQueue.push([{ doubtId: 42 }]);
        selectResultQueue.push([rawBookmarkedDoubt]);
        selectResultQueue.push([]);
        selectResultQueue.push([]);

        const res = await makeRequest();
        const json = await res.json();
        const serialized = JSON.stringify(json);

        expect(serialized).not.toContain(AUTHOR_EMAIL);
        expect(serialized).not.toContain('author@');
        expect(serialized).not.toContain('embedding');
        expect(serialized).not.toContain('deletedAt');
    });
});
