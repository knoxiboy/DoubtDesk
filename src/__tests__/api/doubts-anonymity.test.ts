/**
 * Integration test for issue #657: anonymous doubt author identity must never be
 * exposed to other users through the API.
 *
 * Scenario mirrors the issue: User A authors an anonymous community doubt, and
 * User B (a different user) fetches it. The response must contain only the
 * anonymized handle plus `isOwnPost: false` — never User A's email/userId.
 */
import { GET } from '@/app/api/doubts/[id]/route';
import { currentUser } from '@clerk/nextjs/server';
import { getAnonymousHandle } from '@/lib/anonymity/anonymity';

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: jest.fn(),
}));

jest.mock('@/lib/errors/error-handler', () => ({
    buildErrorResponse: jest.fn().mockReturnValue({ status: 500, body: { error: 'Internal Server Error' } }),
    ApiError: class ApiError extends Error {
        constructor(public statusCode: number, message: string) {
            super(message);
        }
    },
}));

const selectResultQueue: any[] = [];

const createQueryMock = (data: any) => {
    const chain: any = {
        from: () => chain,
        where: () => chain,
        limit: () => chain,
        innerJoin: () => chain,
        then: (resolve: any) => Promise.resolve(resolve(data)),
    };
    return chain;
};

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn().mockImplementation(() => createQueryMock(selectResultQueue.shift() ?? [])),
    },
}));

const AUTHOR_EMAIL = 'alice.author@example.com';

// A community (non-classroom) doubt authored by Alice. Includes the internal
// fields that getTableColumns would surface (userEmail + embedding vector).
const authoredDoubt = {
    id: 42,
    userEmail: AUTHOR_EMAIL,
    classroomId: null,
    subject: 'Thermodynamics',
    content: 'Why is entropy always increasing?',
    likes: 2,
    isSolved: 'unsolved',
    type: 'community',
    isPinned: false,
    embedding: [0.11, 0.22, 0.33],
    deletedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    replyCount: 0,
};

const makeRequest = () =>
    GET(new Request('http://localhost/api/doubts/42'), { params: Promise.resolve({ id: '42' }) }) as Promise<Response>;

const assertNoIdentityLeak = (json: any) => {
    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain(AUTHOR_EMAIL);
    expect(serialized).not.toContain('alice.author');
    expect(serialized).not.toContain('@example.com');
    expect(json).not.toHaveProperty('userEmail');
    expect(json).not.toHaveProperty('embedding');
    expect(json).not.toHaveProperty('deletedAt');
};

describe('Doubt detail anonymity (issue #657)', () => {
    beforeEach(() => {
        (currentUser as jest.Mock).mockReset();
        selectResultQueue.length = 0;
        jest.clearAllMocks();
    });

    it('does not expose the author identity to a different signed-in user', async () => {
        // User B is viewing.
        (currentUser as jest.Mock).mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'bob.viewer@example.com' },
        });
        // select order: doubt, tags, like-check, bookmark-check
        selectResultQueue.push([authoredDoubt], [], [], []);

        const res = await makeRequest();
        const json = await res.json();

        expect(res.status).toBe(200);
        assertNoIdentityLeak(json);
        expect(json.author).toBe(getAnonymousHandle(AUTHOR_EMAIL));
        expect(json.isOwnPost).toBe(false);
        // Non-identifying content is still returned.
        expect(json.subject).toBe('Thermodynamics');
        expect(json.id).toBe(42);
    });

    it('does not expose author identity to anonymous (unauthenticated) viewers', async () => {
        (currentUser as jest.Mock).mockResolvedValue(null);
        // No auth => like/bookmark checks are skipped: only doubt + tags selects run.
        selectResultQueue.push([authoredDoubt], []);

        const res = await makeRequest();
        const json = await res.json();

        expect(res.status).toBe(200);
        assertNoIdentityLeak(json);
        expect(json.author).toBe(getAnonymousHandle(AUTHOR_EMAIL));
        expect(json.isOwnPost).toBe(false);
    });

    it('marks the post as own for the author but still omits the raw email', async () => {
        (currentUser as jest.Mock).mockResolvedValue({
            primaryEmailAddress: { emailAddress: AUTHOR_EMAIL },
        });
        selectResultQueue.push([authoredDoubt], [], [], []);

        const res = await makeRequest();
        const json = await res.json();

        expect(res.status).toBe(200);
        assertNoIdentityLeak(json);
        expect(json.isOwnPost).toBe(true);
        expect(json.author).toBe(getAnonymousHandle(AUTHOR_EMAIL));
    });
});
