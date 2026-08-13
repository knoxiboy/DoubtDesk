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

const generateRecommendationsMock = jest.fn();
jest.mock('@/lib/ai/recommendations', () => ({
    generateRecommendations: (weakTopics: any) => generateRecommendationsMock(weakTopics),
}));

describe('Teacher Insights API Endpoint', () => {
    beforeEach(() => {
        currentUserMock.mockReset();
        selectResultsQueue.length = 0;
        generateRecommendationsMock.mockReset();
        generateRecommendationsMock.mockResolvedValue([]);
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
        expect(json.error).toBe('Invalid classroom ID');
    });

    it('returns 403 when the user is not the teacher of the classroom', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });

        selectResultsQueue.push([], []);

        const req = new NextRequest('http://localhost/api/teacher/insights?classroomId=7');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(403);
        expect(json.error).toBe('Access denied to this classroom');
    });

    it('returns classroom-scoped insights for the teacher', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });

        selectResultsQueue.push(
            [{ role: 'teacher' }],
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
            ],
            [],
            []
        );

        const req = new NextRequest('http://localhost/api/teacher/insights?classroomId=7');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.topTopics).toHaveLength(2);
        expect(json.statusDistribution).toHaveLength(2);
        expect(json.subjectVolume).toHaveLength(2);
        expect(json.recommendations).toEqual([]);
        expect(generateRecommendationsMock).toHaveBeenCalledWith([]);
    });

    it('builds weakTopics from unresolved/total counts and passes sample doubt IDs to recommendations', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });

        selectResultsQueue.push(
            [{ role: 'teacher' }],
            [{ topic: 'Loops', subject: 'Programming', count: 4 }],
            [{ status: 'unsolved', count: 4 }],
            [{ subject: 'Programming', count: 4 }],
            [{ topic: 'Loops', subject: 'Programming', unresolvedCount: 3 }],
            [{ topic: 'Loops', subject: 'Programming', totalCount: 4 }],
            [{ id: 101 }, { id: 102 }, { id: 103 }]
        );
        generateRecommendationsMock.mockResolvedValue([
            { topic: 'Loops', subject: 'Programming', suggestion: 'Review iteration basics' },
        ]);

        const req = new NextRequest('http://localhost/api/teacher/insights?classroomId=7');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.recommendations).toEqual([
            { topic: 'Loops', subject: 'Programming', suggestion: 'Review iteration basics' },
        ]);

        expect(generateRecommendationsMock).toHaveBeenCalledWith([
            {
                topic: 'Loops',
                subject: 'Programming',
                totalCount: 4,
                unresolvedCount: 3,
                sampleDoubtIds: [101, 102, 103],
            },
        ]);
    });

    it('falls back to unresolvedCount when no matching totalPerTopic entry is found', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });

        selectResultsQueue.push(
            [{ role: 'teacher' }],
            [],
            [],
            [],
            [{ topic: 'Recursion', subject: 'Programming', unresolvedCount: 2 }],
            [],
            [{ id: 201 }]
        );

        const req = new NextRequest('http://localhost/api/teacher/insights?classroomId=7');
        await GET(req);

        expect(generateRecommendationsMock).toHaveBeenCalledWith([
            {
                topic: 'Recursion',
                subject: 'Programming',
                totalCount: 2,
                unresolvedCount: 2,
                sampleDoubtIds: [201],
            },
        ]);
    });

    it('returns 500 when an unexpected (non-ApiError) error is thrown', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });

        const dbMock = jest.requireMock('@/configs/db').db;
        dbMock.select.mockImplementationOnce(() => {
            throw new Error('connection reset');
        });

        const req = new NextRequest('http://localhost/api/teacher/insights?classroomId=7');
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(500);
        expect(json.error).toBe('Internal Server Error');
    });
});