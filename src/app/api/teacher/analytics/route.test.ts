import { GET } from './route';
import { NextRequest } from 'next/server';
import { ApiError } from '@/lib/errors/error-handler';

const mockRequireAdmin = jest.fn();
const mockRequireTeacher = jest.fn().mockImplementation(() => Promise.resolve({ role: 'teacher' }));
const mockRequireAuth = jest.fn().mockImplementation(() => Promise.resolve({ email: 'user@example.com' }));
const selectResultQueue: any[] = [];

jest.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: () => mockRequireAdmin(),
}));

jest.mock('@/lib/auth/membership-guard', () => {
    return {
        parseOptionalClassroomId: (val: any) => {
            if (val === null || val === undefined || val === '') {
                return null;
            }
            // Strict regex match to mirror parseClassroomId
            const isStrInt = typeof val === 'string' && /^[1-9]\d*$/.test(val);
            if (!isStrInt) {
                throw new ApiError(400, 'Invalid classroom ID');
            }
            return Number(val);
        },
        requireAuth: () => mockRequireAuth(),
        requireTeacher: (email: string, classroomId: number) => mockRequireTeacher(email, classroomId),
    };
});

jest.mock('@/configs/db', () => {
    const makeChain = () => {
        const chain: any = {
            from: jest.fn().mockImplementation(() => chain),
            where: jest.fn().mockImplementation(() => chain),
            then: jest.fn().mockImplementation((resolve) => {
                const data = selectResultQueue.shift() ?? [];
                return Promise.resolve(resolve(data));
            }),
        };
        return chain;
    };
    return {
        db: {
            select: jest.fn().mockImplementation(() => makeChain()),
        },
    };
});

describe('Teacher Analytics API Endpoint', () => {
    beforeEach(() => {
        mockRequireAdmin.mockReset();
        mockRequireTeacher.mockReset();
        mockRequireAuth.mockReset();
        selectResultQueue.length = 0;
        jest.clearAllMocks();

        // Default auth setup
        mockRequireAuth.mockResolvedValue({ email: 'user@example.com' });
    });

    it('requires admin verification for the all-classrooms query', async () => {
        // Mock requireAdmin to throw NEXT_REDIRECT
        mockRequireAdmin.mockRejectedValue(new Error('NEXT_REDIRECT'));

        // Mock usersTable query (dbUser is a teacher, but trying to query "all" classrooms)
        selectResultQueue.push(
            [{ id: 1, email: 'user@example.com', role: 'teacher' }], // usersTable query
            [], // classroomsTaught query
            []  // teacherMemberships query
        );

        const req = new NextRequest('http://localhost/api/teacher/analytics?classroomId=all');

        await expect(GET(req)).rejects.toThrow('NEXT_REDIRECT');
    });

    it('allows a teacher to query analytics for a specific classroom without requireAdmin', async () => {
        // Mock usersTable query
        selectResultQueue.push(
            [{ id: 1, email: 'user@example.com', role: 'teacher' }], // usersTable query
            [], // classroomsTaught query
            []  // teacherMemberships query
        );

        const req = new NextRequest('http://localhost/api/teacher/analytics?classroomId=1');

        const res = await GET(req);

        expect(res?.status).toBe(200);
        expect(mockRequireAdmin).not.toHaveBeenCalled();
        expect(mockRequireTeacher).toHaveBeenCalledWith('user@example.com', 1);
    });

    it('allows a teacher to query analytics without classroomId parameter', async () => {
        // Mock usersTable query
        selectResultQueue.push(
            [{ id: 1, email: 'user@example.com', role: 'teacher' }], // usersTable query
            [], // classroomsTaught query
            []  // teacherMemberships query
        );

        const req = new NextRequest('http://localhost/api/teacher/analytics');

        const res = await GET(req);

        expect(res?.status).toBe(200);
        expect(mockRequireAdmin).not.toHaveBeenCalled();
        expect(mockRequireTeacher).not.toHaveBeenCalled();
    });

    it('fails with 400 when classroomId is invalid/malformed', async () => {
        // Mock usersTable query
        selectResultQueue.push(
            [{ id: 1, email: 'user@example.com', role: 'teacher' }], // usersTable query
            [], // classroomsTaught query
            []  // teacherMemberships query
        );

        const req = new NextRequest('http://localhost/api/teacher/analytics?classroomId=7abc');

        const res = await GET(req);
        const json = await res?.json();

        expect(res?.status).toBe(400);
        expect(json.error).toBe('Invalid classroom ID');
    });

    it('allows an admin to query analytics for all classrooms successfully', async () => {
        // Mock requireAdmin to succeed
        mockRequireAdmin.mockResolvedValue(undefined);

        // Mock usersTable query (dbUser is an admin)
        selectResultQueue.push(
            [{ id: 1, email: 'admin@example.com', role: 'admin' }], // usersTable query
            [{ id: 1, name: 'Admin Class', university: 'Admin Uni' }], // classroomsList query (admin branch)
            [] // doubtsTable query
        );

        const req = new NextRequest('http://localhost/api/teacher/analytics?classroomId=all');

        const res = await GET(req);

        expect(res?.status).toBe(200);
        expect(mockRequireAdmin).toHaveBeenCalled();
        expect(mockRequireTeacher).not.toHaveBeenCalled();
    });
});
