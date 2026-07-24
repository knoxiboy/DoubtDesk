import { GET, POST } from '@/app/api/tags/route';

const mockSelectResults: Array<Array<Record<string, unknown>>> = [];
let mockInsertedTag: Record<string, unknown>;

const internalTags = [
    {
        id: 1,
        name: 'Calculus',
        normalizedName: 'calculus',
        classroomId: null,
        createdByEmail: 'creator@example.com',
        createdAt: '2026-07-16T00:00:00.000Z',
    },
    {
        id: 2,
        name: 'Kinematics',
        normalizedName: 'kinematics',
        classroomId: null,
        createdByEmail: 'teacher@example.com',
        createdAt: '2026-07-15T00:00:00.000Z',
    },
];

const mockProjectRows = (
    rows: Array<Record<string, unknown>>,
    fields?: Record<string, unknown>,
) => {
    if (!fields) return rows;

    return rows.map((row) => Object.fromEntries(
        Object.keys(fields).map((key) => [key, row[key]]),
    ));
};

const mockCreateSelectChain = (
    rows: Array<Record<string, unknown>>,
    fields?: Record<string, unknown>,
) => {
    const projectedRows = mockProjectRows(rows, fields);
    const chain: Record<string, unknown> = {};

    for (const method of ['from', 'where', 'orderBy', 'limit', 'groupBy', 'innerJoin']) {
        chain[method] = jest.fn(() => chain);
    }
    chain.then = (resolve: (value: Array<Record<string, unknown>>) => unknown) =>
        Promise.resolve(resolve(projectedRows));

    return chain;
};

const mockValues = jest.fn(() => ({
    returning: jest.fn((fields?: Record<string, unknown>) =>
        Promise.resolve(mockProjectRows([mockInsertedTag], fields))),
}));

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn((fields?: Record<string, unknown>) =>
            mockCreateSelectChain(mockSelectResults.shift() ?? [], fields)),
        insert: jest.fn(() => ({
            values: mockValues,
        })),
    },
}));

jest.mock('@/lib/auth/membership-guard', () => ({
    requireAuth: jest.fn().mockResolvedValue({ email: 'student@example.com' }),
    requireMembership: jest.fn().mockResolvedValue({ role: 'student' }),
    parseOptionalClassroomId: jest.fn((value?: string | number | null) => {
        if (value === undefined || value === null || value === '') return null;
        return Number(value);
    }),
}));

jest.mock('@/lib/ratelimit/api-rate-limit', () => ({
    enforceApiRateLimit: jest.fn().mockResolvedValue(null),
}));

const expectPublicTag = (tag: Record<string, unknown>) => {
    expect(tag).toEqual(expect.objectContaining({
        id: expect.any(Number),
        name: expect.any(String),
        normalizedName: expect.any(String),
    }));
    expect(tag).toHaveProperty('classroomId');
    expect(tag).toHaveProperty('createdAt');
    expect(tag).not.toHaveProperty('createdByEmail');
};

describe('Tags API privacy', () => {
    beforeEach(() => {
        mockSelectResults.length = 0;
        mockInsertedTag = {
            id: 3,
            name: 'Electromagnetism',
            normalizedName: 'electromagnetism',
            classroomId: null,
            createdByEmail: 'student@example.com',
            createdAt: '2026-07-16T00:00:00.000Z',
        };
        jest.clearAllMocks();
    });

    it.each([
        ['general list', 'http://localhost/api/tags'],
        ['search results', 'http://localhost/api/tags?q=math'],
        ['classroom-filtered results', 'http://localhost/api/tags?classroomId=12'],
    ])('omits creator emails from %s', async (_scenario, url) => {
        mockSelectResults.push(internalTags);

        const res = await GET(new Request(url));
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json).toHaveLength(2);
        json.forEach(expectPublicTag);
    });

    it('omits creator emails from subject-specific popular tags', async () => {
        mockSelectResults.push(internalTags);

        const res = await GET(new Request('http://localhost/api/tags?subject=Physics'));
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json).toHaveLength(2);
        json.forEach(expectPublicTag);
    });

    it('omits creator emails from the subject popularity fallback', async () => {
        mockSelectResults.push([], internalTags);

        const res = await GET(new Request('http://localhost/api/tags?subject=Physics'));
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json).toHaveLength(2);
        json.forEach(expectPublicTag);
    });

    it('omits creator emails from the recent-tags fallback', async () => {
        mockSelectResults.push([], [], internalTags);

        const res = await GET(new Request('http://localhost/api/tags?subject=Physics'));
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json).toHaveLength(2);
        json.forEach(expectPublicTag);
    });

    it('omits the creator email when returning an existing tag', async () => {
        mockSelectResults.push([internalTags[0]]);

        const res = await POST(new Request('http://localhost/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'calculus' }),
        }));
        const json = await res.json();

        expect(res.status).toBe(200);
        expectPublicTag(json);
    });

    it('omits the creator email when returning a newly created tag', async () => {
        mockSelectResults.push([]);

        const res = await POST(new Request('http://localhost/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'electromagnetism' }),
        }));
        const json = await res.json();

        expect(res.status).toBe(201);
        expect(mockValues).toHaveBeenCalledWith(expect.objectContaining({
            createdByEmail: 'student@example.com',
        }));
        expectPublicTag(json);
    });
});
