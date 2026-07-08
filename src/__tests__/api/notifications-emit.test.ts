import { POST } from '@/app/api/notifications/emit/route';

const currentUserMock = jest.fn();
const selectResultQueue: any[] = [];
const createReplyNotificationMock = jest.fn();

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: () => currentUserMock(),
}));

jest.mock('@/lib/notifications/service', () => ({
    createReplyNotification: (...args: any[]) => createReplyNotificationMock(...args),
}));

const createQueryMock = (data) => ({
    from: () => createQueryMock(data),
    where: () => createQueryMock(data),
    then: (resolve) => Promise.resolve(resolve(data)),
});

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn().mockImplementation(() => createQueryMock(selectResultQueue.shift() ?? [])),
    },
}));

describe('Notifications Emit API Endpoint (issue #734)', () => {
    beforeEach(() => {
        currentUserMock.mockReset();
        createReplyNotificationMock.mockReset();
        selectResultQueue.length = 0;
    });

    it('rejects unauthenticated requests', async () => {
        currentUserMock.mockResolvedValue(null);

        const req = new Request('http://localhost/api/notifications/emit', {
            method: 'POST',
            body: JSON.stringify({ doubtId: 1, replyId: 1 }),
        });

        const res = await POST(req as any);
        expect(res.status).toBe(401);
    });

    it('rejects requests missing doubtId/replyId', async () => {
        currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'student@test.com' } });

        const req = new Request('http://localhost/api/notifications/emit', {
            method: 'POST',
            body: JSON.stringify({ doubtId: 1 }),
        });

        const res = await POST(req as any);
        expect(res.status).toBe(400);
    });

    it('returns 404 when the doubt does not exist', async () => {
        currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'student@test.com' } });
        selectResultQueue.push([]);

        const req = new Request('http://localhost/api/notifications/emit', {
            method: 'POST',
            body: JSON.stringify({ doubtId: 1, replyId: 1 }),
        });

        const res = await POST(req as any);
        expect(res.status).toBe(404);
    });

    it('returns 404 when the reply does not belong to the doubt', async () => {
        currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'student@test.com' } });
        selectResultQueue.push([{ id: 1, userEmail: 'asker@test.com' }]); // doubt
        selectResultQueue.push([{ id: 1, doubtId: 999, userEmail: 'student@test.com' }]); // reply belongs elsewhere

        const req = new Request('http://localhost/api/notifications/emit', {
            method: 'POST',
            body: JSON.stringify({ doubtId: 1, replyId: 1 }),
        });

        const res = await POST(req as any);
        expect(res.status).toBe(404);
    });

    it('rejects when the caller is not the reply author', async () => {
        currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'someone-else@test.com' } });
        selectResultQueue.push([{ id: 1, userEmail: 'asker@test.com' }]);
        selectResultQueue.push([{ id: 1, doubtId: 1, userEmail: 'replier@test.com', content: 'answer' }]);

        const req = new Request('http://localhost/api/notifications/emit', {
            method: 'POST',
            body: JSON.stringify({ doubtId: 1, replyId: 1 }),
        });

        const res = await POST(req as any);
        expect(res.status).toBe(403);
    });

    it('triggers the real notification pipeline using authoritative DB data', async () => {
        currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'replier@test.com' }, fullName: 'Replier' });
        selectResultQueue.push([{ id: 1, userEmail: 'asker@test.com', subject: 'Physics', content: 'why?', classroomId: 7, type: 'community' }]);
        selectResultQueue.push([{ id: 1, doubtId: 1, userEmail: 'replier@test.com', content: 'because gravity' }]);
        createReplyNotificationMock.mockResolvedValue([{ id: 5, userEmail: 'asker@test.com' }]);

        const req = new Request('http://localhost/api/notifications/emit', {
            method: 'POST',
            body: JSON.stringify({ doubtId: 1, replyId: 1 }),
        });

        const res = await POST(req as any);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.notification).toEqual({ id: 5, userEmail: 'asker@test.com' });
        expect(createReplyNotificationMock).toHaveBeenCalledWith(
            expect.objectContaining({
                doubtId: 1,
                replyId: 1,
                doubtOwnerEmail: 'asker@test.com',
                replierEmail: 'replier@test.com',
                replyContent: 'because gravity',
            }),
        );
    });
});
