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
        orderBy: () => chain,
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

// Select call order in GET /api/rooms/members:
// 1. requireMembership → memberships table (returns row or [])
// 2. requireMembership → classrooms table (only when step 1 returns []; ownership fallback)
// 3. classrooms.teacherEmail lookup (always)
// 4. memberships count
// 5. paginated memberships list

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
        // requireMembership: membership miss, then classroom ownership miss → 403
        selectResultQueue.push([], []);

        const res = (await GET(new Request('http://localhost/api/rooms/members?classroomId=1')))!;
        const json = await res.json();

        expect(res.status).toBe(403);
        expect(json.error).toBe('Access denied to this classroom');
    });

    it('does not expose member emails to student requesters, includes isOwner for all', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'student@example.com' },
        });
        checkUserBlockMock.mockResolvedValue({ isBlocked: false });
        selectResultQueue.push(
            // 1. requireMembership: student found
            [{ id: 1, userEmail: 'student@example.com', role: 'student', classroomId: 1 }],
            // 2. classrooms.teacherEmail (owner is teacher@example.com)
            [{ teacherEmail: 'teacher@example.com' }],
            // 3. count
            [{ count: 2 }],
            // 4. members list
            [
                {
                    id: 1,
                    userEmail: 'student@example.com',
                    role: 'student',
                    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
                },
                {
                    id: 2,
                    userEmail: 'teacher@example.com',
                    role: 'teacher',
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
                    isOwner: false,
                },
                {
                    displayName: 'Member_2',
                    role: 'teacher',
                    joinedAt: '2026-01-02T00:00:00.000Z',
                    isOwner: true,
                },
            ],
            pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
        });
        // Emails must never appear in the student-facing response
        expect(JSON.stringify(json)).not.toContain('userEmail');
        expect(JSON.stringify(json)).not.toContain('teacher@example.com');
        expect(JSON.stringify(json)).not.toContain('student@example.com');
    });

    it('includes member emails and isOwner for teacher requesters', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });
        checkUserBlockMock.mockResolvedValue({ isBlocked: false });
        selectResultQueue.push(
            // 1. requireMembership: teacher found
            [{ id: 1, userEmail: 'teacher@example.com', role: 'teacher', classroomId: 1 }],
            // 2. classrooms.teacherEmail
            [{ teacherEmail: 'teacher@example.com' }],
            // 3. count
            [{ count: 2 }],
            // 4. members list
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
                    isOwner: true,
                },
                {
                    userEmail: 'student@example.com',
                    role: 'student',
                    joinedAt: '2026-01-02T00:00:00.000Z',
                    isOwner: false,
                },
            ],
            pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
        });
    });

    it('correctly distinguishes owner from co-teacher with elevated role', async () => {
        // Scenario: classroom has an owner (alice) and a co-teacher (bob).
        // Only alice should have isOwner:true even though bob has an elevated role.
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'alice@example.com' },
        });
        checkUserBlockMock.mockResolvedValue({ isBlocked: false });
        selectResultQueue.push(
            // 1. requireMembership: alice found as teacher
            [{ id: 1, userEmail: 'alice@example.com', role: 'teacher', classroomId: 1 }],
            // 2. classrooms.teacherEmail: alice is the owner
            [{ teacherEmail: 'alice@example.com' }],
            // 3. count
            [{ count: 2 }],
            // 4. members list
            [
                {
                    id: 1,
                    userEmail: 'alice@example.com',
                    role: 'teacher',
                    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
                },
                {
                    id: 2,
                    userEmail: 'bob@example.com',
                    role: 'co-teacher',
                    joinedAt: new Date('2026-01-03T00:00:00.000Z'),
                },
            ],
        );

        const res = (await GET(new Request('http://localhost/api/rooms/members?classroomId=1')))!;
        const json = await res.json();

        expect(res.status).toBe(200);

        const alice = json.members.find((m: any) => m.userEmail === 'alice@example.com');
        const bob = json.members.find((m: any) => m.userEmail === 'bob@example.com');

        expect(alice.isOwner).toBe(true);
        expect(bob.isOwner).toBe(false);
        // Bob's role is preserved accurately — only the badge label in the UI
        // will distinguish owner from other elevated roles
        expect(bob.role).toBe('co-teacher');
    });

    it('sets isOwner false for all members when classroom lookup returns nothing', async () => {
        // Defensive: if classroomData is missing (e.g. race with deletion),
        // no member should be falsely marked as owner.
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });
        checkUserBlockMock.mockResolvedValue({ isBlocked: false });
        selectResultQueue.push(
            // 1. requireMembership
            [{ id: 1, userEmail: 'teacher@example.com', role: 'teacher', classroomId: 1 }],
            // 2. classrooms.teacherEmail — missing (classroom deleted between calls)
            [],
            // 3. count
            [{ count: 1 }],
            // 4. members list
            [
                {
                    id: 1,
                    userEmail: 'teacher@example.com',
                    role: 'teacher',
                    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
                },
            ],
        );

        const res = (await GET(new Request('http://localhost/api/rooms/members?classroomId=1')))!;
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.members[0].isOwner).toBe(false);
    });

    it('includes member emails for co-teacher requesters', async () => {
        // Directly protects PRIVILEGED_MEMBER_ROLES including 'co-teacher'.
        // A future contributor removing it would cause this test to fail,
        // since co-teacher requesters would then receive the redacted
        // (displayName) shape instead of real emails.
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'coteacher@example.com' },
        });
        checkUserBlockMock.mockResolvedValue({ isBlocked: false });
        selectResultQueue.push(
            // 1. requireMembership: co-teacher found
            [{ id: 2, userEmail: 'coteacher@example.com', role: 'co-teacher', classroomId: 1 }],
            // 2. classrooms.teacherEmail: owner is someone else
            [{ teacherEmail: 'owner@example.com' }],
            // 3. count
            [{ count: 2 }],
            // 4. members list
            [
                {
                    id: 1,
                    userEmail: 'owner@example.com',
                    role: 'teacher',
                    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
                },
                {
                    id: 2,
                    userEmail: 'coteacher@example.com',
                    role: 'co-teacher',
                    joinedAt: new Date('2026-01-03T00:00:00.000Z'),
                },
            ],
        );

        const res = (await GET(new Request('http://localhost/api/rooms/members?classroomId=1')))!;
        const json = await res.json();

        expect(res.status).toBe(200);
        // Co-teacher must receive the privileged (email-visible) shape
        expect(json.members[0].userEmail).toBe('owner@example.com');
        expect(json.members[1].userEmail).toBe('coteacher@example.com');
        // No displayName field should appear in the privileged response
        expect(json.members[0].displayName).toBeUndefined();
        expect(json.members[1].displayName).toBeUndefined();
        // isOwner correctly reflects classrooms.teacherEmail, not role string
        expect(json.members[0].isOwner).toBe(true);
        expect(json.members[1].isOwner).toBe(false);
    });

    it('correctly identifies owner when teacherEmail and userEmail have different casing', async () => {
        // Guards the email normalization fix: isOwner must be true even when
        // classrooms.teacherEmail and memberships.userEmail differ only by case.
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'teacher@example.com' },
        });
        checkUserBlockMock.mockResolvedValue({ isBlocked: false });
        selectResultQueue.push(
            // 1. requireMembership: teacher found (lowercase)
            [{ id: 1, userEmail: 'teacher@example.com', role: 'teacher', classroomId: 1 }],
            // 2. classrooms.teacherEmail stored with different casing
            [{ teacherEmail: 'Teacher@Example.COM' }],
            // 3. count
            [{ count: 1 }],
            // 4. members list — userEmail stored lowercase
            [
                {
                    id: 1,
                    userEmail: 'teacher@example.com',
                    role: 'teacher',
                    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
                },
            ],
        );

        const res = (await GET(new Request('http://localhost/api/rooms/members?classroomId=1')))!;
        const json = await res.json();

        expect(res.status).toBe(200);
        // Must be true despite casing mismatch between teacherEmail and userEmail
        expect(json.members[0].isOwner).toBe(true);
    });
});