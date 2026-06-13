const currentUserMock = jest.fn();

jest.mock('@clerk/nextjs/server', () => ({
    currentUser: () => currentUserMock(),
}));

jest.mock('@/configs/db', () => {
    const mockValues = jest.fn();
    const mockInsert = jest.fn(() => ({ values: mockValues }));

    return {
        db: {
            insert: mockInsert,
        },
        _mocks: {
            mockInsert,
            mockValues,
        },
    };
});

jest.mock('@/configs/schema', () => ({
    notificationsTable: {
        id: 'id',
    },
}));

const { GET, POST } = require('@/app/api/notifications/test-seed/route');
const { mockInsert, mockValues } = require('@/configs/db')._mocks;

describe('Notification test seed API endpoint', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
        currentUserMock.mockReset();
        mockValues.mockReset();
        mockInsert.mockClear();
        mockValues.mockResolvedValue({});
    });

    afterEach(() => {
        (process.env as any).NODE_ENV = originalNodeEnv;
    });

    it('does not seed notifications from GET requests', async () => {
        const res = await GET();
        const json = await res.json();

        expect(res.status).toBe(405);
        expect(res.headers.get('allow')).toBe('POST');
        expect(json.error).toBe('Method Not Allowed');
        expect(currentUserMock).not.toHaveBeenCalled();
        expect(mockInsert).not.toHaveBeenCalled();
    });

    it('hides the seed route from GET requests in production', async () => {
        (process.env as any).NODE_ENV = 'production';

        const res = await GET();
        const json = await res.json();

        expect(res.status).toBe(404);
        expect(json).toEqual({ error: 'Not found' });
        expect(currentUserMock).not.toHaveBeenCalled();
        expect(mockInsert).not.toHaveBeenCalled();
        expect(mockValues).not.toHaveBeenCalled();
    });

    it('hides the seed route from POST requests in production', async () => {
        (process.env as any).NODE_ENV = 'production';

        const res = await POST();
        const json = await res.json();

        expect(res.status).toBe(404);
        expect(json).toEqual({ error: 'Not found' });
        expect(currentUserMock).not.toHaveBeenCalled();
        expect(mockInsert).not.toHaveBeenCalled();
        expect(mockValues).not.toHaveBeenCalled();
    });

    it('seeds notifications for the signed-in user only through POST', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'student@example.com' },
        });

        const res = await POST();
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith({ id: 'id' });
        expect(mockValues).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ userEmail: 'student@example.com' }),
            ])
        );
    });

    it('returns a generic error when seeding fails', async () => {
        currentUserMock.mockResolvedValue({
            primaryEmailAddress: { emailAddress: 'student@example.com' },
        });
        mockValues.mockRejectedValue(new Error('sensitive stack trace'));

        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        try {
            const res = await POST();
            const json = await res.json();

            expect(res.status).toBe(500);
            expect(json).toEqual({ error: 'Failed to seed notifications' });
            expect(json.details).toBeUndefined();
            expect(json.stack).toBeUndefined();
        } finally {
            consoleErrorSpy.mockRestore();
        }
    });
});
