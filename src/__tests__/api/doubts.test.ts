import { GET, POST } from '@/app/api/doubts/route';
import { currentUser } from '@clerk/nextjs/server';

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: jest.fn()
}));

jest.mock('@/lib/moderation', () => ({
    moderateContent: jest.fn().mockResolvedValue({ isAllowed: true, reason: 'Allowed' }),
    handleModerationViolation: jest.fn().mockResolvedValue(null)
}));

jest.mock('@/lib/ai/categorizer', () => ({
    categorizeDoubt: jest.fn().mockResolvedValue('General')
}));

jest.mock('@/lib/error-handler', () => ({
    buildErrorResponse: jest.fn().mockReturnValue({ status: 500, body: { error: 'Internal Server Error' } }),
    ApiError: class ApiError extends Error {
        constructor(public statusCode: number, message: string) {
            super(message);
        }
    }
}));

jest.mock('@/lib/validations/validate', () => ({
    parseAndValidateRequest: jest.fn().mockImplementation(async (req: Request) => {
        const data = await req.json();
        return { errorResponse: null, data };
    })
}));

jest.mock('@/lib/validations/doubt', () => ({
    createDoubtSchema: {}
}));

const mockDoubts = [
    {
        id: 1,
        doubtId: 1,
        count: 2,
        userName: 'Student_1',
        subject: 'Physics',
        content: 'What is speed of light?',
        createdAt: '2026-01-01T00:00:00.000Z',
        likes: 4,
        isSolved: 'unsolved',
        isPinned: false,
        name: 'Physics',
        normalizedName: 'physics',
        classroomId: null,
        type: 'community',
        userEmail: 'student@example.com'
    },
    {
        id: 2,
        doubtId: 2,
        count: 1,
        userName: 'Student_2',
        subject: 'Physics',
        content: 'How does a lens work?',
        createdAt: '2026-01-02T00:00:00.000Z',
        likes: 10,
        isSolved: 'solved',
        isPinned: false,
        name: 'Physics',
        normalizedName: 'physics',
        classroomId: null,
        type: 'community',
        userEmail: 'other@example.com'
    }
];
let mockQueryDoubts = mockDoubts;

const createEmptyChain = () => {
    const chain: any = {
        from: () => chain,
        where: () => chain,
        orderBy: () => chain,
        limit: () => chain,
        offset: () => chain,
        groupBy: () => chain,
        innerJoin: () => chain,
        leftJoin: () => chain,
        then: (resolve: any) => Promise.resolve(resolve([])),
    };
    return chain;
};

const createChainWithData = (data: any[]) => {
    const chain: any = {
        from: () => chain,
        where: () => chain,
        orderBy: () => chain,
        limit: () => chain,
        offset: () => chain,
        groupBy: () => chain,
        innerJoin: () => chain,
        leftJoin: () => chain,
        then: (resolve: any) => Promise.resolve(resolve(data)),
    };
    return chain;
};

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn().mockImplementation((fields: any) => {
            // Reply counts query (has count field)
            if (fields && fields.count) {
                return createChainWithData([
                    { doubtId: 1, count: 2 },
                    { doubtId: 2, count: 1 }
                ]);
            }
            // doubtId field (tags or likes query)
            if (fields && fields.doubtId !== undefined && !fields.id) {
                return createEmptyChain();
            }
            // Default: return doubts
            return createChainWithData(mockQueryDoubts);
        }),

        insert: jest.fn().mockImplementation(() => ({
            values: jest.fn().mockImplementation(() => ({
                returning: jest.fn().mockResolvedValue([{
                    id: 2,
                    userName: 'Student_1',
                    subject: 'Physics',
                    content: 'New doubt',
                    name: 'Physics',
                    normalizedName: 'physics',
                    classroomId: null,
                    type: 'community'
                }]),
                onConflictDoNothing: jest.fn().mockResolvedValue({})
            }))
        }))
    }
}));

describe('Doubts API Endpoints', () => {
    beforeEach(() => {
        mockQueryDoubts = mockDoubts;
        (currentUser as jest.Mock).mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'student@example.com' },
            fullName: 'Test Student'
        });
    });

    it('GET allows anonymous community doubt reads', async () => {
        (currentUser as jest.Mock).mockResolvedValue(null);

        const req = new Request('http://localhost/api/doubts?subject=Physics');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json[0].subject).toBe('Physics');
    });

    it('GET should return list of doubts with pagination', async () => {
        const req = new Request('http://localhost/api/doubts?subject=Physics');
        const res = await GET(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(Array.isArray(json)).toBe(true);
        expect(json.length).toBeGreaterThan(0);
        expect(json[0].subject).toBe('Physics');
    });

    it('GET should support popular sorting', async () => {
        mockQueryDoubts = [...mockDoubts].sort((a, b) => b.likes - a.likes);
        const req = new Request('http://localhost/api/doubts?subject=Physics&sort=popular');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        // Most liked doubt (id=2, likes=10) should come first
        expect(json[0].id).toBe(2);
    });

    it('GET should support most-replied sorting', async () => {
        const req = new Request('http://localhost/api/doubts?subject=Physics&sort=most-replied');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        // Doubt with most replies (id=1, count=2) should come first
        expect(json[0].id).toBe(1);
    });

    it('GET should support unsolved filtering', async () => {
        mockQueryDoubts = mockDoubts.filter((doubt) => doubt.isSolved === 'unsolved');
        const req = new Request('http://localhost/api/doubts?subject=Physics&sort=unsolved');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.length).toBeGreaterThan(0);
        json.forEach((d: any) => expect(d.isSolved).toBe('unsolved'));
    });

    it('POST should create a new doubt', async () => {
        const req = new Request('http://localhost/api/doubts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userName: 'Student_1',
                subject: 'Physics',
                content: 'New doubt'
            })
        });
        const res = (await POST(req))!;
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.id).toBe(2);
        expect(json.subject).toBe('Physics');
    });
});
