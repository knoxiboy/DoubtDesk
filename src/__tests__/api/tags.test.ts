import { GET, POST } from '@/app/api/tags/route';

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: jest.fn().mockImplementation(async () => ({
        primaryEmailAddress: { emailAddress: 'student@example.com' },
        fullName: 'Test Student'
    }))
}));

const mockTags = [
    { id: 1, name: 'Calculus', normalizedName: 'calculus', classroomId: null },
    { id: 2, name: 'Kinematics', normalizedName: 'kinematics', classroomId: null },
    { id: 3, name: 'Optics', normalizedName: 'optics', classroomId: null }
];

const createEmptyChain = () => {
    const chain: any = {
        from: () => chain,
        where: () => chain,
        orderBy: () => chain,
        limit: () => chain,
        groupBy: () => chain,
        innerJoin: () => chain,
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
        groupBy: () => chain,
        innerJoin: () => chain,
        then: (resolve: any) => Promise.resolve(resolve(data)),
    };
    return chain;
};

// Track DB calls to test subject filtering
let selectSubjectParam: any = null;
let isPostActive = false;

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn().mockImplementation((fields: any) => {
            // Check if it is the membership verification query
            if (fields && fields.role) {
                return createEmptyChain();
            }
            if (isPostActive) {
                return createEmptyChain();
            }
            return createChainWithData(mockTags);
        }),
        insert: jest.fn().mockImplementation(() => ({
            values: jest.fn().mockImplementation(() => ({
                returning: jest.fn().mockResolvedValue([{
                    id: 4,
                    name: 'Electromagnetism',
                    normalizedName: 'electromagnetism',
                    classroomId: null
                }])
            }))
        }))
    }
}));

describe('Tags API Endpoints', () => {
    it('GET should return list of tags', async () => {
        const req = new Request('http://localhost/api/tags');
        const res = await GET(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(Array.isArray(json)).toBe(true);
        expect(json.length).toBe(3);
    });

    it('GET with subject should query subject popular tags', async () => {
        const req = new Request('http://localhost/api/tags?subject=Physics');
        const res = await GET(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(Array.isArray(json)).toBe(true);
    });

    it('POST should create a new tag', async () => {
        isPostActive = true;
        const req = new Request('http://localhost/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'electromagnetism'
            })
        });
        const res = await POST(req);
        const json = await res.json();
        expect(res.status).toBe(201);
        expect(json.id).toBe(4);
        expect(json.name).toBe('Electromagnetism');
    });
});
