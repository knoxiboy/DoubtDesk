import {
    generateUnsubscribeLink,
    generateUnsubscribeToken,
    sendBlockEmail,
    sendWarningEmail,
    verifyUnsubscribeToken,
} from '@/lib/email/email';
import { jest } from '@jest/globals';

describe('Email Helper Functions', () => {
    let consoleSpy: jest.SpiedFunction<typeof console.log>;
    const originalClerkSecret = process.env.CLERK_SECRET_KEY;

    beforeEach(() => {
        process.env.UNSUBSCRIBE_SECRET = 'test-unsubscribe-secret';
        consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        delete process.env.UNSUBSCRIBE_SECRET;
        if (originalClerkSecret) {
            process.env.CLERK_SECRET_KEY = originalClerkSecret;
        } else {
            delete process.env.CLERK_SECRET_KEY;
        }
    });

    it('should log warning email simulation correctly', async () => {
        await sendWarningEmail('test@example.com', 'Inappropriate language', 2);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('To: test@example.com')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Inappropriate language')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('2/3 strikes')
        );
    });

    it('should log block email simulation correctly', async () => {
        await sendBlockEmail('student@college.edu', 7, 2);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('To: student@college.edu')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('suspended for 7 days')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('block #2')
        );
    });

    it('should generate and verify signed unsubscribe tokens', () => {
        const expiresAt = Date.now() + 60_000;
        const token = generateUnsubscribeToken('Student@College.edu', expiresAt);

        expect(verifyUnsubscribeToken('student@college.edu', expiresAt.toString(), token)).toBe(true);
        expect(verifyUnsubscribeToken('attacker@college.edu', expiresAt.toString(), token)).toBe(false);
        expect(verifyUnsubscribeToken('student@college.edu', (Date.now() - 1).toString(), token)).toBe(false);
    });

    it('should reject missing, malformed, and non-numeric token parameters', () => {
        const expiresAt = Date.now() + 60_000;
        const token = generateUnsubscribeToken('student@college.edu', expiresAt);

        expect(verifyUnsubscribeToken('student@college.edu', expiresAt.toString(), null)).toBe(false);
        expect(verifyUnsubscribeToken('student@college.edu', null, token)).toBe(false);
        expect(verifyUnsubscribeToken('student@college.edu', 'not-a-timestamp', token)).toBe(false);
        const tamperedToken = token[0] === '0' ? '1' + token.slice(1) : '0' + token.slice(1);
        expect(verifyUnsubscribeToken('student@college.edu', expiresAt.toString(), tamperedToken)).toBe(false);
        expect(verifyUnsubscribeToken('student@college.edu', expiresAt.toString(), 'not-hex')).toBe(false);
    });

    it('should require an unsubscribe signing secret', () => {
        delete process.env.UNSUBSCRIBE_SECRET;
        delete process.env.CLERK_SECRET_KEY;

        expect(() => generateUnsubscribeToken('student@college.edu')).toThrow('UNSUBSCRIBE_SECRET is required');
    });

    it('should include signed token parameters in unsubscribe links', () => {
        const link = generateUnsubscribeLink('student@college.edu', 'https://doubtdesk.example');
        const url = new URL(link);

        expect(url.pathname).toBe('/api/unsubscribe');
        expect(url.searchParams.get('email')).toBe('student@college.edu');
        expect(url.searchParams.get('expires')).toBeTruthy();
        expect(url.searchParams.get('token')).toBeTruthy();
        expect(verifyUnsubscribeToken(
            'student@college.edu',
            url.searchParams.get('expires'),
            url.searchParams.get('token')
        )).toBe(true);
    });
});
