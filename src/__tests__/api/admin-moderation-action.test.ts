import { POST } from '@/app/api/admin/moderation/action/route';
import { NextRequest } from 'next/server';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const currentUserMock = jest.fn();
jest.mock('@clerk/nextjs/server', () => ({
    currentUser: () => currentUserMock(),
}));

const requireAdminMock = jest.fn();
jest.mock('@/lib/auth/requireAdmin', () => ({
    requireAdmin: () => requireAdminMock(),
}));

const sendWarningEmailMock = jest.fn().mockResolvedValue({ success: true });
const sendBlockEmailMock = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/email/email', () => ({
    sendWarningEmail: (...args: any[]) => sendWarningEmailMock(...args),
    sendBlockEmail: (...args: any[]) => sendBlockEmailMock(...args),
}));

const auditLogMock = jest.fn();
jest.mock('@/lib/audit/audit', () => ({
    auditLog: (...args: any[]) => auditLogMock(...args),
    AUDIT_ACTIONS: {
        MODERATION_DISMISSED: 'MODERATION_DISMISSED',
        USER_WARNED: 'USER_WARNED',
        USER_BLOCKED: 'USER_BLOCKED',
    },
}));

jest.mock('@/lib/validations/validate', () => ({
    parseAndValidateRequest: jest.fn(),
}));

// ── Database Mocks ─────────────────────────────────────────────────────────────

let selectResultQueue: any[] = [];
let updateMock = jest.fn();

const createQueryMock = (data: any) => ({
    from: () => createQueryMock(data),
    where: () => createQueryMock(data),
    then: (resolve: any) => Promise.resolve(resolve(data)),
});

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn().mockImplementation(() => createQueryMock(selectResultQueue.shift() ?? [])),
        update: jest.fn().mockImplementation((...args: any[]) => ({
            set: jest.fn().mockImplementation((...setArgs: any[]) => ({
                where: jest.fn().mockImplementation(async (...whereArgs: any[]) => updateMock(...args, ...setArgs, ...whereArgs)),
            })),
        })),
    },
}));

// ── Import after mocks ─────────────────────────────────────────────────────────

import { parseAndValidateRequest } from '@/lib/validations/validate';

// ── Test Suite ─────────────────────────────────────────────────────────────────

describe('Admin Moderation Action — warn 3-strike auto-block (issue #1341)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        selectResultQueue.length = 0;
        currentUserMock.mockResolvedValue({ primaryEmailAddress: { emailAddress: 'admin@test.com' } });
        requireAdminMock.mockResolvedValue(undefined);
        updateMock.mockResolvedValue(undefined);
    });

    // ── Helper ─────────────────────────────────────────────────────────────────

    function makeWarnRequest(violationCount: number, blockCount: number = 0) {
        const user = {
            email: 'user@test.com',
            violationCount,
            blockCount,
            isBlocked: false,
        };
        const log = { id: 42, reason: 'Abusive content' };

        selectResultQueue.push([user]);
        selectResultQueue.push([log]);

        (parseAndValidateRequest as jest.Mock).mockResolvedValue({
            errorResponse: null,
            data: { logId: 42, userEmail: 'user@test.com', action: 'warn' },
        });

        return new NextRequest('http://localhost/api/admin/moderation/action', {
            method: 'POST',
            body: JSON.stringify({ logId: 42, userEmail: 'user@test.com', action: 'warn' }),
        });
    }

    // ── Test 1: Third warning blocks user ──────────────────────────────────────

    it('blocks user when third warning reaches the 3-strike threshold', async () => {
        const req = makeWarnRequest(2); // violationCount = 2 → becomes 3
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);

        // Should call sendBlockEmail
        expect(sendBlockEmailMock).toHaveBeenCalledTimes(1);
        expect(sendBlockEmailMock).toHaveBeenCalledWith(
            'user@test.com',
            3, // first block = 3 days
            1  // blockCount becomes 1
        );

        // Should still call sendWarningEmail (warning email is sent even on block)
        expect(sendWarningEmailMock).toHaveBeenCalledTimes(1);

        // User should be blocked in DB
        expect(updateMock).toHaveBeenCalledWith(
            expect.anything(), // usersTable
            expect.objectContaining({
                violationCount: 0,
                isBlocked: true,
                blockCount: 1,
            }),
            expect.anything()
        );

        // Audit log should use USER_BLOCKED
        expect(auditLogMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'USER_BLOCKED',
                metadata: expect.objectContaining({
                    violationCount: 0,
                    blockCount: 1,
                }),
            })
        );
    });

    // ── Test 2: First warning does not block ───────────────────────────────────

    it('does not block on first warning (violationCount 0 → 1)', async () => {
        const req = makeWarnRequest(0); // violationCount = 0 → becomes 1
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);

        // Should NOT call sendBlockEmail
        expect(sendBlockEmailMock).not.toHaveBeenCalled();

        // Should call sendWarningEmail
        expect(sendWarningEmailMock).toHaveBeenCalledTimes(1);

        // User should NOT be blocked in DB
        expect(updateMock).toHaveBeenCalledWith(
            expect.anything(), // usersTable
            expect.objectContaining({
                violationCount: 1,
            }),
            expect.anything()
        );

        // Audit log should use USER_WARNED
        expect(auditLogMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'USER_WARNED',
                metadata: expect.objectContaining({
                    violationCount: 1,
                }),
            })
        );
    });

    // ── Test 3: Second warning does not block ──────────────────────────────────

    it('does not block on second warning (violationCount 1 → 2)', async () => {
        const req = makeWarnRequest(1); // violationCount = 1 → becomes 2
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);

        // Should NOT call sendBlockEmail
        expect(sendBlockEmailMock).not.toHaveBeenCalled();

        // Should call sendWarningEmail
        expect(sendWarningEmailMock).toHaveBeenCalledTimes(1);

        // User should NOT be blocked in DB
        expect(updateMock).toHaveBeenCalledWith(
            expect.anything(), // usersTable
            expect.objectContaining({
                violationCount: 2,
            }),
            expect.anything()
        );

        // Audit log should use USER_WARNED
        expect(auditLogMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'USER_WARNED',
                metadata: expect.objectContaining({
                    violationCount: 2,
                }),
            })
        );
    });

    // ── Test 4: Existing threshold behavior ────────────────────────────────────

    it('blocks user when already at or above threshold (violationCount ≥ 3)', async () => {
        const req = makeWarnRequest(3); // violationCount = 3 → becomes 4
        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);

        // Should call sendBlockEmail
        expect(sendBlockEmailMock).toHaveBeenCalledTimes(1);

        // User should be blocked in DB
        expect(updateMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                violationCount: 0,
                isBlocked: true,
            }),
            expect.anything()
        );
    });

    // ── Test 5: Existing manual warning behavior remains intact ────────────────

    it('preserves moderation log update and warning email behavior', async () => {
        const req = makeWarnRequest(0);
        const res = await POST(req);

        expect(res.status).toBe(200);

        // Moderation log should be updated to "warned"
        expect(updateMock).toHaveBeenCalledWith(
            expect.anything(), // moderationLogsTable
            expect.objectContaining({ status: 'warned' }),
            expect.anything()
        );

        // Warning email should be sent with correct parameters
        expect(sendWarningEmailMock).toHaveBeenCalledWith(
            'user@test.com',
            'Abusive content',
            1 // newViolationCount
        );
    });

    // ── Test 6: Block duration escalation ──────────────────────────────────────

    it('uses correct block duration for second block', async () => {
        const req = makeWarnRequest(2, 1); // violationCount=2, blockCount=1 → second block
        const res = await POST(req);

        expect(res.status).toBe(200);

        // Second block should be 7 days
        expect(sendBlockEmailMock).toHaveBeenCalledWith(
            'user@test.com',
            7, // second block = 7 days
            2  // blockCount becomes 2
        );

        // blockCount should be incremented
        expect(updateMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                blockCount: 2,
            }),
            expect.anything()
        );
    });

    // ── Test 7: Block duration exponential escalation ──────────────────────────

    it('uses correct block duration for third+ block', async () => {
        const req = makeWarnRequest(2, 2); // violationCount=2, blockCount=2 → third block
        const res = await POST(req);

        expect(res.status).toBe(200);

        // Third block should be 14 * 2^(3-3) = 14 days
        expect(sendBlockEmailMock).toHaveBeenCalledWith(
            'user@test.com',
            14, // third block = 14 days
            3  // blockCount becomes 3
        );
    });

    // ── Test 8: User not found ─────────────────────────────────────────────────

    it('returns 404 when user is not found', async () => {
        selectResultQueue.push([]); // no user found

        (parseAndValidateRequest as jest.Mock).mockResolvedValue({
            errorResponse: null,
            data: { logId: 42, userEmail: 'nonexistent@test.com', action: 'warn' },
        });

        const req = new NextRequest('http://localhost/api/admin/moderation/action', {
            method: 'POST',
            body: JSON.stringify({ logId: 42, userEmail: 'nonexistent@test.com', action: 'warn' }),
        });

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(404);
        expect(json.error).toBe('User not found');
    });

    // ── Test 9: Admin authorization ────────────────────────────────────────────

    it('rejects unauthorized access when requireAdmin fails', async () => {
        requireAdminMock.mockRejectedValue(new Error('NEXT_REDIRECT'));

        const req = new NextRequest('http://localhost/api/admin/moderation/action', {
            method: 'POST',
            body: JSON.stringify({ logId: 42, userEmail: 'user@test.com', action: 'warn' }),
        });

        await expect(POST(req)).rejects.toThrow('NEXT_REDIRECT');
    });

    // ── Test 10: Validation failure ────────────────────────────────────────────

    it('returns validation error for invalid request', async () => {
        const errorResponse = new Response(JSON.stringify({ error: 'Invalid' }), { status: 400 });
        (parseAndValidateRequest as jest.Mock).mockResolvedValue({
            errorResponse,
            data: null,
        });

        const req = new NextRequest('http://localhost/api/admin/moderation/action', {
            method: 'POST',
            body: JSON.stringify({}),
        });

        const res = await POST(req);

        expect(res.status).toBe(400);
    });
});
