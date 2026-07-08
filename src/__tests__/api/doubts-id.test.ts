import { GET } from '@/app/api/doubts/[id]/route';
import { currentUser } from '@clerk/nextjs/server';

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: jest.fn()
}));

jest.mock('@/lib/errors/error-handler', () => ({
    buildErrorResponse: jest.fn().mockReturnValue({ status: 500, body: { error: 'Internal Server Error' } }),
    ApiError: class ApiError extends Error {
        constructor(public statusCode: number, message: string) {
            super(message);
        }
    }
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

describe('Doubt Permalink API Endpoint', () => {
    const mockCurrentUser = currentUser as jest.Mock;

    beforeEach(() => {
        mockCurrentUser.mockReset();
        selectResultQueue.length = 0;
        jest.clearAllMocks();
    });

    it('returns 404 if doubt does not exist', async () => {
        mockCurrentUser.mockResolvedValue(null);
        selectResultQueue.push([]); // for doubtsTable query returning empty array

        const res = (await GET(new Request('http://localhost/api/doubts/42'), { params: Promise.resolve({ id: '42' }) }))!;
        const json = await res.json();

        expect(res.status).toBe(404);
        expect(json.error).toBe('Doubt not found');
    });

    it('returns 200 with doubt details for public doubts', async () => {
        mockCurrentUser.mockResolvedValue(null);
        const mockDoubt = {
            id: 42,
            subject: 'Math',
            content: 'Calculus question',
            classroomId: null,
            type: 'community',
            userEmail: 'author@example.com'
        };
        // Mock responses for:
        // 1. doubtsTable select -> [mockDoubt]
        // 2. tagsTable select -> []
        selectResultQueue.push([mockDoubt], []);

        const res = (await GET(new Request('http://localhost/api/doubts/42'), { params: Promise.resolve({ id: '42' }) }))!;
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.subject).toBe('Math');
        expect(json.hasLiked).toBe(false);
        expect(json.hasBookmarked).toBe(false);
    });
});
