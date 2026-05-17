import { GET, POST } from '@/app/api/doubts/route';

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: jest.fn().mockImplementation(async () => ({
        primaryEmailAddress: { emailAddress: 'student@example.com' },
        fullName: 'Test Student'
    }))
}));

const createQueryMock = (data: any) => {
    const chain: any = {
        from: () => chain,
        where: () => chain,
        orderBy: () => chain,
        limit: () => chain,
        offset: () => chain,
        groupBy: () => chain,
        innerJoin: () => chain,
        leftJoin: () => chain,
        then: (resolve: any) => resolve(data),
    };
    return chain;
};

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn().mockImplementation((fields: any) => {
            if (fields && fields.count) {
                return createQueryMock([{ count: 2 }]);
            }
            return createQueryMock([{
                id: 1,
                doubtId: 1,
                count: 2,
                userName: 'Student_1',
                subject: 'Physics',
                content: 'What is speed of light?',
                createdAt: new Date().toISOString(),
                name: 'Physics',
                normalizedName: 'physics'
            }]);
        }),
        insert: jest.fn().mockImplementation(() => ({
            values: jest.fn().mockImplementation(() => ({
                returning: jest.fn().mockResolvedValue([{
                    id: 2,
                    userName: 'Student_1',
                    subject: 'Physics',
                    content: 'New doubt',
                    name: 'Physics',
                    normalizedName: 'physics'
                }]),
                onConflictDoNothing: jest.fn().mockResolvedValue({})
            }))
        }))
    }
}));

describe('Doubts API Endpoints', () => {
    it('GET should return list of doubts with pagination', async () => {
        const req = new Request('http://localhost/api/doubts?subject=Physics');
        const res = await GET(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.doubts).toHaveLength(1);
        expect(json.doubts[0].subject).toBe('Physics');
        expect(json.pagination.total).toBe(2);
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
        const res = await POST(req);
        const json = await res.json();
        expect(res.status).toBe(200);
        expect(json.id).toBe(2);
        expect(json.subject).toBe('Physics');
    });
});
