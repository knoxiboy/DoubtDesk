import { POST } from './route';

const authMock = jest.fn();
const currentUserMock = jest.fn();
const selectResultQueue: any[] = [];

jest.mock('@clerk/nextjs/server', () => ({
    auth: () => authMock(),
    currentUser: () => currentUserMock(),
}));

const createQueryMock = (data: any) => ({
    from: () => createQueryMock(data),
    where: () => createQueryMock(data),
    limit: () => createQueryMock(data),
    then: (resolve: any) => Promise.resolve(resolve(data)),
});

jest.mock('@/configs/db', () => ({
    db: (() => {
        const db = {
            select: jest.fn().mockImplementation(() => createQueryMock(selectResultQueue.shift() ?? [])),
            update: jest.fn().mockImplementation(() => ({
                set: jest.fn().mockImplementation(() => ({
                    where: jest.fn().mockImplementation(() => ({
                        returning: jest.fn().mockResolvedValue([{ id: 1 }]),
                    })),
                })),
            })),
        } as any;
        (globalThis as any).__onboardDbMock = db;
        return db;
    })(),
}));

describe('Onboarding API Endpoint', () => {
    beforeEach(() => {
        authMock.mockReset();
        currentUserMock.mockReset();
        selectResultQueue.length = 0;
        jest.clearAllMocks();
    });

    it('rejects onboarding if the user is already onboarded', async () => {
        authMock.mockResolvedValue({ userId: 'user_1' });
        currentUserMock.mockResolvedValue({
            id: 'user_1',
            primaryEmailAddress: { emailAddress: 'user@example.com' },
        });

        // 1. check if onboarded select query
        selectResultQueue.push([{ onboarded: true }]);

        const req = new Request('http://localhost/api/user/onboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: 'student',
                university: 'Harvard',
                collegeEmail: 'user@example.com',
                year: 'Freshman',
            }),
        });

        const res = await POST(req);
        const json = await res?.json();

        expect(res?.status).toBe(400);
        expect(json.error).toContain('already onboarded');
    });

    it('sets role to student and requestedRole to teacher when client attempts self-promotion', async () => {
        authMock.mockResolvedValue({ userId: 'user_1' });
        currentUserMock.mockResolvedValue({
            id: 'user_1',
            primaryEmailAddress: { emailAddress: 'user@example.com' },
        });

        // 1. check if onboarded select query (empty = not onboarded)
        selectResultQueue.push([]);

        const req = new Request('http://localhost/api/user/onboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role: 'teacher',
                university: 'Harvard',
                collegeEmail: 'user@example.com',
                instituteInfo: 'Staff',
            }),
        });

        const res = await POST(req);
        const json = await res?.json();
        const dbMock = (globalThis as any).__onboardDbMock;

        expect(res?.status).toBe(200);
        expect(json.success).toBe(true);
        expect(dbMock.update).toHaveBeenCalled();
        expect(dbMock.update.mock.results[0].value.set).toHaveBeenCalledWith(
            expect.objectContaining({
                role: 'student',
                requestedRole: 'teacher',
            })
        );
    });
});
