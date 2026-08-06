import {
    escapeHtml,
    generateUnsubscribeLink,
    generateUnsubscribeToken,
    sendBlockEmail,
    sendReplyNotificationEmail,
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

    it('should report unavailable delivery when Resend is not configured for warnings', async () => {
        delete process.env.RESEND_API_KEY;
        const result = await sendWarningEmail('test@example.com', 'Inappropriate language', 2);
        expect(result.success).toBe(false);
        expect(result.simulated).toBe(true);
        expect(result.error).toMatch(/RESEND_API_KEY/);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('test@example.com')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('2/3 strikes')
        );
        expect(consoleSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('test@example.com')
        );
        expect(consoleSpy).not.toHaveBeenCalledWith(
            expect.stringContaining('Inappropriate language')
        );
    });

    it('should report unavailable delivery when Resend is not configured for blocks', async () => {
        delete process.env.RESEND_API_KEY;
        const result = await sendBlockEmail('student@college.edu', 7, 2);
        expect(result.success).toBe(false);
        expect(result.simulated).toBe(true);
        expect(result.error).toMatch(/RESEND_API_KEY/);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('student@college.edu')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('accepted by Resend')
        );

        fetchSpy.mockRestore();
        delete process.env.RESEND_API_KEY;
        delete process.env.RESEND_FROM_EMAIL;
    });

    it('should deliver warning emails through Resend when configured', async () => {
        process.env.RESEND_API_KEY = 're_test_key';
        const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            text: async () => '',
        } as Response);

        const result = await sendWarningEmail('test@example.com', 'Spam', 1);

        expect(result).toEqual({ success: true, simulated: false });
        expect(fetchSpy).toHaveBeenCalledWith(
            'https://api.resend.com/emails',
            expect.objectContaining({
                method: 'POST',
            }),
        );

        fetchSpy.mockRestore();
        delete process.env.RESEND_API_KEY;
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

    describe('escapeHtml', () => {
        it('should escape XSS payloads', () => {
            const input = '<img src=x onerror="alert(1)">';
            const result = escapeHtml(input);
            expect(result).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
            expect(result).not.toContain('<img');
        });

        it('should escape HTML tags', () => {
            const input = '<b>Hello</b>';
            const result = escapeHtml(input);
            expect(result).toBe('&lt;b&gt;Hello&lt;/b&gt;');
        });

        it('should leave normal text unchanged', () => {
            const input = 'Hello World';
            expect(escapeHtml(input)).toBe('Hello World');
        });

        it('should escape all special characters', () => {
            const input = '<>&\'"';
            const result = escapeHtml(input);
            expect(result).toBe('&lt;&gt;&amp;&#039;&quot;');
        });
    });

    describe('sendReplyNotificationEmail', () => {
        let fetchSpy: jest.SpiedFunction<typeof fetch>;

        beforeEach(() => {
            fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                text: () => Promise.resolve('Email sent'),
            } as Response);
            process.env.RESEND_API_KEY = 're_test_key';
            process.env.NEXT_PUBLIC_APP_URL = 'https://doubtdesk.example';
        });

        afterEach(() => {
            fetchSpy.mockRestore();
            delete process.env.RESEND_API_KEY;
            delete process.env.NEXT_PUBLIC_APP_URL;
        });

        it('should preserve original characters in email subject', async () => {
            const testSubject = 'A & B <script>alert("xss")</script>';
            
            await sendReplyNotificationEmail({
                toEmail: 'user@example.com',
                doubtId: 1,
                doubtSubject: testSubject,
                doubtContent: 'Test content',
                replierName: 'Test Replier',
                replyContent: 'Test reply',
            });

            const fetchCall = fetchSpy.mock.calls[0];
            const requestBody = JSON.parse(fetchCall[1]?.body as string);
            
            // Subject should contain original characters, not escaped
            expect(requestBody.subject).toContain('A & B');
            expect(requestBody.subject).toContain('<script>');
            expect(requestBody.subject).not.toContain('&amp;');
            expect(requestBody.subject).not.toContain('&lt;');
        });

        it('should escape HTML in email body', async () => {
            const testSubject = 'A & B <script>alert("xss")</script>';
            
            await sendReplyNotificationEmail({
                toEmail: 'user@example.com',
                doubtId: 1,
                doubtSubject: testSubject,
                doubtContent: 'Test content',
                replierName: 'Test Replier',
                replyContent: 'Test reply',
            });

            const fetchCall = fetchSpy.mock.calls[0];
            const requestBody = JSON.parse(fetchCall[1]?.body as string);
            
            // HTML body should contain escaped values
            expect(requestBody.html).toContain('A &amp; B');
            expect(requestBody.html).toContain('&lt;script&gt;');
            expect(requestBody.html).not.toContain('A & B');
            expect(requestBody.html).not.toContain('<script>');
        });
    });
});
