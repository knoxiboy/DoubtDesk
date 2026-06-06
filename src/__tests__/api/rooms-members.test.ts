import { GET } from '@/app/api/rooms/members/route';

const currentUserMock = jest.fn();
const checkUserBlockMock = jest.fn();
const selectResultQueue: any[] = [];

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: () => currentUserMock(),
}));

jest.mock('@/lib/auth-utils', () => ({
    checkUserBlock: (...args: any[]) => checkUserBlockMock(...args),
}));

const createQueryMock = (data: any) => {
    const chain: any = {
        from: () => chain,
        where: () => chain,
        limit: () => chain,
        offset: () => chain,
        then: (resolve: any) => Promise.resolve(resolve(data)),
    };

    return chain;
};

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn().mockImplementation(() => createQueryMock(selectResultQueue.shift() ?? [])),
    },
}));

describe('Room Members API Endpoint', () => {
    beforeEach(() => {
        currentUserMock.mockReset();
        checkUserBlockMock.mockReset();
        selectResultQueue.length = 0;
        jest.clearAllMocks();
    });

    it('returns 401 for unauthenticated requests', async () => {
        currentUserMock.mockResolvedValue(null);

        const res = (await GET(new Request('http://localhost/api/rooms/members?classroomId=1')))!;
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json.error).toBe('Unauthorized');
    });

    it('returns 403 when the requester is not a classroom member', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'outsider@example.com' },
        });
        checkUserBlockMock.mockResolvedValue({ isBlocked: false });
        selectResultQueue.push([], []);

        const res = (await GET(new Request('http://localhost/api/rooms/members?classroomId=1')))!;
        const json = await res.json();

        expect(res.status).toBe(403);
        expect(json.error).toBe('Access denied to this classroom');
    });

    it('does not expose member emails to student requesters', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'student@example.com' },
        });
        checkUserBlockMock.mockResolvedValue({ isBlocked: false });
        selectResultQueue.push(
            [{ id: 1, userEmail: 'student@example.com', role: 'student', classroomId: 1 }],
            [{ count: 2 }],
            [
                {
                    id: 1,
                    userEmail: 'student@example.com',
                    role: 'student',
                    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
                },
                {
                    id: 2,
                    userEmail: 'classmate@example.com',
                    role: 'student',
                    joinedAt: new Date('2026-01-02T00:00:00.000Z'),
                },
            ],
        );

        const res = (await GET(new Request('http://localhost/api/rooms/members?classroomId=1')))!;
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json).toEqual({
            members: [
                {
                    displayName: 'Student_1',
                    role: 'student',
                    joinedAt: '2026-01-01T00:00:00.000Z',
                },
                {
                    displayName: 'Student_2',
                    role: 'student',
                    joinedAt: '2026-01-02T00:00:00.000Z',
                },
            ],
            pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
        });
        expect(JSON.stringify(json)).not.toContain('userEmail');
        expect(JSON.stringify(json)).not.toContain('classmate@example.com');
    });

    it('includes member emails for teacher requesters', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });
        checkUserBlockMock.mockResolvedValue({ isBlocked: false });
        selectResultQueue.push(
            [{ id: 1, userEmail: 'teacher@example.com', role: 'teacher', classroomId: 1 }],
            [{ count: 2 }],
            [
                {
                    id: 1,
                    userEmail: 'teacher@example.com',
                    role: 'teacher',
                    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
                },
                {
                    id: 2,
                    userEmail: 'student@example.com',
                    role: 'student',
                    joinedAt: new Date('2026-01-02T00:00:00.000Z'),
                },
            ],
        );

        const res = (await GET(new Request('http://localhost/api/rooms/members?classroomId=1')))!;
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json).toEqual({
            members: [
                {
                    userEmail: 'teacher@example.com',
                    role: 'teacher',
                    joinedAt: '2026-01-01T00:00:00.000Z',
                },
                {
                    userEmail: 'student@example.com',
                    role: 'student',
                    joinedAt: '2026-01-02T00:00:00.000Z',
                },
            ],
            pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
        });
    });
});
