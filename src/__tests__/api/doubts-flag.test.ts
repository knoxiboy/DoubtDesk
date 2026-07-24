import { GET, PATCH, POST } from '@/app/api/doubts/flag/route';

const currentUserMock = jest.fn();

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: () => currentUserMock(),
}));

jest.mock('@/lib/auth/membership-guard', () => {
    const actual = jest.requireActual('@/lib/auth/membership-guard');
    return {
        ...actual,
        requireTeacher: jest.fn(),
    };
});

const selectResultQueue: any[] = [];
const insertMock = jest.fn();
const updateMock = jest.fn();

const createQueryMock = (data: any) => ({
    from: () => createQueryMock(data),
    where: () => createQueryMock(data),
    innerJoin: () => createQueryMock(data),
    groupBy: () => createQueryMock(data),
    orderBy: () => createQueryMock(data),
    then: (resolve: any) => Promise.resolve(resolve(data)),
});

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn().mockImplementation(() => createQueryMock(selectResultQueue.shift() ?? [])),
        insert: jest.fn().mockImplementation((...args: any[]) => ({
            values: jest.fn().mockImplementation(async (...valueArgs: any[]) => insertMock(...args, ...valueArgs)),
        })),
        update: jest.fn().mockImplementation((...args: any[]) => ({
            set: jest.fn().mockImplementation((...setArgs: any[]) => ({
                where: jest.fn().mockImplementation(async (...whereArgs: any[]) => updateMock(...args, ...setArgs, ...whereArgs)),
            })),
        })),
    },
}));

import { requireTeacher } from '@/lib/auth/membership-guard';

describe('Doubts Flag API Endpoint (issue #735)', () => {
    beforeEach(() => {
        currentUserMock.mockReset();
        insertMock.mockReset();
        updateMock.mockReset();
        selectResultQueue.length = 0;
        (requireTeacher as jest.Mock).mockReset();
    });

    describe('POST /api/doubts/flag', () => {
        it('rejects unauthenticated requests', async () => {
            currentUserMock.mockResolvedValue(null);

            const req = new Request('http://localhost/api/doubts/flag', {
                method: 'POST',
                body: JSON.stringify({ doubtId: 1, reason: 'spam' }),
            });

            const res = await POST(req as any);
            expect(res.status).toBe(401);
        });

        it('rejects invalid reason values', async () => {
            currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'student@test.com' } });

            const req = new Request('http://localhost/api/doubts/flag', {
                method: 'POST',
                body: JSON.stringify({ doubtId: 1, reason: 'not_a_real_reason' }),
            });

            const res = await POST(req as any);
            expect(res.status).toBe(400);
        });

        it('returns 404 when the doubt does not exist', async () => {
            currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'student@test.com' } });
            selectResultQueue.push([]);

            const req = new Request('http://localhost/api/doubts/flag', {
                method: 'POST',
                body: JSON.stringify({ doubtId: 999, reason: 'spam' }),
            });

            const res = await POST(req as any);
            expect(res.status).toBe(404);
        });

        it('records a flag and does not auto-hide below the threshold', async () => {
            currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'student@test.com' } });
            selectResultQueue.push([{ id: 1 }]); // doubt exists
            selectResultQueue.push([{ value: 1 }]); // recent flag count after insert

            const req = new Request('http://localhost/api/doubts/flag', {
                method: 'POST',
                body: JSON.stringify({ doubtId: 1, reason: 'spam' }),
            });

            const res = await POST(req as any);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.autoHidden).toBe(false);
            expect(insertMock).toHaveBeenCalled();
            expect(updateMock).not.toHaveBeenCalled();
        });

        it('auto-hides the doubt once the flag threshold is reached', async () => {
            currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'student@test.com' } });
            selectResultQueue.push([{ id: 1 }]); // doubt exists
            selectResultQueue.push([{ value: 3 }]); // recent flag count after insert

            const req = new Request('http://localhost/api/doubts/flag', {
                method: 'POST',
                body: JSON.stringify({ doubtId: 1, reason: 'inappropriate' }),
            });

            const res = await POST(req as any);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.autoHidden).toBe(true);
            expect(updateMock).toHaveBeenCalled();
        });

        it('returns 409 when the same user flags a doubt twice', async () => {
            currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'student@test.com' } });
            selectResultQueue.push([{ id: 1 }]);
            insertMock.mockImplementation(() => {
                throw Object.assign(new Error('duplicate'), { code: '23505' });
            });

            const req = new Request('http://localhost/api/doubts/flag', {
                method: 'POST',
                body: JSON.stringify({ doubtId: 1, reason: 'spam' }),
            });

            const res = await POST(req as any);
            expect(res.status).toBe(409);
        });
    });

    describe('GET /api/doubts/flag', () => {
        it('requires a classroomId', async () => {
            currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'teacher@test.com' } });

            const req = new Request('http://localhost/api/doubts/flag');
            const res = await GET(req as any);
            expect(res.status).toBe(400);
        });

        it('requires the caller to be a teacher of the classroom', async () => {
            currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'student@test.com' } });
            const { ApiError } = jest.requireActual('@/lib/errors/error-handler');
            (requireTeacher as jest.Mock).mockRejectedValue(new ApiError(403, 'Forbidden: teacher access required'));

            const req = new Request('http://localhost/api/doubts/flag?classroomId=7');
            const res = await GET(req as any);
            expect(res.status).toBe(403);
        });

        it('returns the moderation queue for a teacher', async () => {
            currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'teacher@test.com' } });
            (requireTeacher as jest.Mock).mockResolvedValue({ role: 'teacher' });
            selectResultQueue.push([
                { doubtId: 1, content: 'spam post', subject: 'Physics', isHidden: true, flagCount: 3 },
            ]);

            const req = new Request('http://localhost/api/doubts/flag?classroomId=7');
            const res = await GET(req as any);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.data).toHaveLength(1);
            expect(json.data[0].flagCount).toBe(3);
        });
    });

    describe('PATCH /api/doubts/flag', () => {
        it('rejects an invalid action', async () => {
            currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'teacher@test.com' } });

            const req = new Request('http://localhost/api/doubts/flag', {
                method: 'PATCH',
                body: JSON.stringify({ doubtId: 1, action: 'delete_forever' }),
            });

            const res = await PATCH(req as any);
            expect(res.status).toBe(400);
        });

        it('dismisses open flags without un-hiding the doubt', async () => {
            currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'teacher@test.com' } });
            (requireTeacher as jest.Mock).mockResolvedValue({ role: 'teacher' });
            selectResultQueue.push([{ id: 1, classroomId: 7 }]);

            const req = new Request('http://localhost/api/doubts/flag', {
                method: 'PATCH',
                body: JSON.stringify({ doubtId: 1, action: 'dismiss' }),
            });

            const res = await PATCH(req as any);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.action).toBe('dismiss');
            expect(updateMock).toHaveBeenCalledTimes(1); // only the flags status update
        });

        it('re-shows a hidden doubt and resolves its flags', async () => {
            currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'teacher@test.com' } });
            (requireTeacher as jest.Mock).mockResolvedValue({ role: 'teacher' });
            selectResultQueue.push([{ id: 1, classroomId: 7 }]);

            const req = new Request('http://localhost/api/doubts/flag', {
                method: 'PATCH',
                body: JSON.stringify({ doubtId: 1, action: 'reshow' }),
            });

            const res = await PATCH(req as any);
            const json = await res.json();

            expect(res.status).toBe(200);
            expect(json.action).toBe('reshow');
            expect(updateMock).toHaveBeenCalledTimes(2); // flags resolved + doubt un-hidden
        });
    });
});
