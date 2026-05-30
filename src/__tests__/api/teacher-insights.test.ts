import { NextRequest } from 'next/server';
import { GET } from '@/app/api/teacher/insights/route';

const currentUserMock = jest.fn();

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: () => currentUserMock(),
}));

const selectResultsQueue: any[] = [];

const createQueryMock = (data: any) => ({
    from: () => createQueryMock(data),
    where: () => createQueryMock(data),
    groupBy: () => createQueryMock(data),
    orderBy: () => createQueryMock(data),
    limit: () => createQueryMock(data),
    then: (resolve: any) => Promise.resolve(resolve(data)),
});

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn().mockImplementation(() => createQueryMock(selectResultsQueue.shift() ?? [])),
    },
}));

describe('Teacher Insights API Endpoint', () => {
    beforeEach(() => {
        currentUserMock.mockReset();
        selectResultsQueue.length = 0;
    });

    it('returns 401 when the request is unauthenticated', async () => {
        currentUserMock.mockResolvedValue(null);

        const req = new NextRequest('http://localhost/api/teacher/insights?classroomId=7');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(401);
        expect(json.error).toBe('Unauthorized');
    });

    it('returns 400 when classroomId is missing', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });

        const req = new NextRequest('http://localhost/api/teacher/insights');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe('classroomId is required');
    });

    it('returns 400 when classroomId is invalid', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });

        const req = new NextRequest('http://localhost/api/teacher/insights?classroomId=7abc');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(400);
        expect(json.error).toBe('classroomId is required');
    });

    it('returns 403 when the user is not the teacher of the classroom', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });

        selectResultsQueue.push([]);

        const req = new NextRequest('http://localhost/api/teacher/insights?classroomId=7');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(403);
        expect(json.error).toBe('Forbidden: not the teacher of this classroom');
    });

    it('returns classroom-scoped insights for the teacher', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });

        selectResultsQueue.push(
            [{ id: 7 }],
            [
                { topic: 'Loops', subject: 'Programming', count: 4 },
                { topic: 'Fractions', subject: 'Math', count: 2 },
            ],
            [
                { status: 'solved', count: 3 },
                { status: 'unsolved', count: 3 },
            ],
            [
                { subject: 'Programming', count: 4 },
                { subject: 'Math', count: 2 },
            ]
        );

        const req = new NextRequest('http://localhost/api/teacher/insights?classroomId=7');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.topTopics).toHaveLength(2);
        expect(json.statusDistribution).toHaveLength(2);
        expect(json.subjectVolume).toHaveLength(2);
    });
});