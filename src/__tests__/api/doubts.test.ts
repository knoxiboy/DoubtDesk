import { GET, POST } from '@/app/api/doubts/route';
import { db } from '@/configs/db';
import { currentUser } from '@clerk/nextjs/server';

jest.mock('@/lib/search', () => ({
    buildSearchCondition: jest.fn().mockReturnValue(null),
    buildRankOrder: jest.fn().mockReturnValue(null),
}));
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

const extractSqlInfo = (val: any): string[] => {
    const info: string[] = [];
    const seen = new WeakSet();

    const walk = (x: any) => {
        if (!x || typeof x !== 'object') {
            if (typeof x === 'string' || typeof x === 'number') {
                info.push(String(x));
            }
            return;
        }
        if (seen.has(x)) return;
        seen.add(x);

        // If it looks like a Drizzle Column, extract its name and do NOT traverse its properties
        if (x.name && typeof x.name === 'string' && x.table && typeof x.table === 'object') {
            info.push(x.name);
            return;
        }

        // Recursively walk arrays and non-table objects
        if (Array.isArray(x)) {
            x.forEach(walk);
        } else {
            for (const key of Object.keys(x)) {
                // Do not traverse into the table property of any object (to avoid sibling columns)
                if (key === 'table') continue;
                walk(x[key]);
            }
        }
    };

    walk(val);
    return info;
};

const matchesPattern = (val: any, pattern: string): boolean => {
    const info = extractSqlInfo(val);
    return info.some(s => s.toLowerCase().includes(pattern.toLowerCase()));
};

const createChainWithData = (data: any[]) => {
    let result = [...data];
    const chain: any = {
        from: () => chain,
        where: (condition: any) => {
            if (matchesPattern(condition, 'unsolved')) {
                result = result.filter(d => d.isSolved === 'unsolved');
            }
            return chain;
        },
        orderBy: (...orderFields: any[]) => {
            const hasLikes = orderFields.some(f => matchesPattern(f, 'likes'));
            const hasCount = orderFields.some(f => matchesPattern(f, 'count'));
            if (hasLikes) {
                result.sort((a, b) => b.likes - a.likes);
            } else if (hasCount) {
                result.sort((a, b) => b.count - a.count);
            }
            return chain;
        },
        limit: () => chain,
        offset: () => chain,
        groupBy: () => chain,
        innerJoin: () => chain,
        leftJoin: () => chain,
        then: (resolve: any) => Promise.resolve(resolve(result)),
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
        expect(json.doubts[0].subject).toBe('Physics');
    });

    it('GET should return list of doubts with pagination', async () => {
        (db.select as jest.Mock).mockImplementationOnce(() => createChainWithData([{ count: 2 }]))
                                .mockImplementationOnce(() => createChainWithData(mockDoubts));

        const req = new Request('http://localhost/api/doubts?subject=Physics');
        const res = await GET(req) as Response;
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(Array.isArray(json.doubts)).toBe(true);
        expect(json.doubts.length).toBeGreaterThan(0);
        expect(json.doubts[0].subject).toBe('Physics');
        expect(json.hasMore).toBe(false);
        expect(json.totalCount).toBe(2);
        expect(json.page).toBe(1);
        expect(json.limit).toBe(20);
    });

    it('GET should support popular sorting', async () => {
    mockQueryDoubts = [...mockDoubts].sort((a, b) => b.likes - a.likes);
    const req = new Request('http://localhost/api/doubts?subject=Physics&sort=popular');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(json.doubts)).toBe(true);
    expect(json.doubts.length).toBeGreaterThan(0);
    expect(json.doubts[0].id).toBe(2);
});

    it('GET should support most-replied sorting', async () => {
        const req = new Request('http://localhost/api/doubts?subject=Physics&sort=most-replied');
        const res = await GET(req) as Response;
        const json = await res.json();

        expect(res.status).toBe(200);
        // Doubt with most replies (id=1, count=2) should come first
        expect(json.doubts[0].id).toBe(1);
    });

    it('GET should support unsolved filtering', async () => {
        (db.select as jest.Mock).mockImplementationOnce(() => createChainWithData([{ count: 1 }]))
                                .mockImplementationOnce(() => createChainWithData([mockDoubts[0]]));
        const req = new Request('http://localhost/api/doubts?subject=Physics&sort=unsolved');
        const res = await GET(req) as Response;
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.doubts.length).toBeGreaterThan(0);
        json.doubts.forEach((d: any) => expect(d.isSolved).toBe('unsolved'));
    });

    it('GET should handle hasMore=true when totalCount > limit', async () => {
        (db.select as jest.Mock)
            .mockImplementationOnce(() => createChainWithData([{ count: 3 }]))
            .mockImplementationOnce(() => createChainWithData(mockDoubts));

        const req = new Request('http://localhost/api/doubts?subject=Physics&limit=2');
        const res = await GET(req) as Response;
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.hasMore).toBe(true);
        expect(json.totalCount).toBe(3);
        expect(json.limit).toBe(2);
    });

    it('GET should handle exact page boundary when totalCount === limit', async () => {
        (db.select as jest.Mock)
            .mockImplementationOnce(() => createChainWithData([{ count: 2 }]))
            .mockImplementationOnce(() => createChainWithData(mockDoubts));

        const req = new Request('http://localhost/api/doubts?subject=Physics&limit=2');
        const res = await GET(req) as Response;
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.hasMore).toBe(false);
        expect(json.totalCount).toBe(2);
        expect(json.limit).toBe(2);
    });

    it('GET should handle empty results when totalCount === 0', async () => {
        (db.select as jest.Mock)
            .mockImplementationOnce(() => createChainWithData([{ count: 0 }]))
            .mockImplementationOnce(() => createChainWithData([]));

        const req = new Request('http://localhost/api/doubts?subject=Physics');
        const res = await GET(req) as Response;
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.doubts.length).toBe(0);
        expect(json.hasMore).toBe(false);
        expect(json.totalCount).toBe(0);
    });

    it('GET should sanitize invalid pagination inputs (page=abc, limit=0, offset=-10)', async () => {
        (db.select as jest.Mock)
            .mockImplementationOnce(() => createChainWithData([{ count: 2 }]))
            .mockImplementationOnce(() => createChainWithData(mockDoubts));

        const req = new Request('http://localhost/api/doubts?page=abc&limit=0&offset=-10');
        const res = await GET(req) as Response;
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.page).toBe(1);
        expect(json.limit).toBe(20);
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

