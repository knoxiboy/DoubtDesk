import { POST } from '@/app/api/ask-ai/route';
import { aiLimiter } from '@/lib/ratelimit';
import { AI_REQUEST_MAX_BYTES } from '@/lib/ai-image-validation';

jest.mock('@/lib/ratelimit', () => ({
    aiLimiter: {
        limit: jest.fn().mockResolvedValue({
            success: true,
            limit: 10,
            remaining: 9,
            reset: Date.now() + 60_000,
        }),
    },
}));

jest.mock('@clerk/nextjs/server', () => ({
    auth: jest.fn().mockImplementation(async () => ({ userId: 'user_123' })),
    currentUser: jest.fn().mockImplementation(async () => ({
        primaryEmailAddress: { emailAddress: 'student@example.com' },
        fullName: 'AI Student'
    }))
}));

const selectResultsQueue: any[] = [];

const createQueryMock = (data: any[]) => {
    const query: any = {
        from: () => query,
        where: () => query,
        limit: () => Promise.resolve(data),
        then: (resolve: any) => Promise.resolve(resolve(data)),
    };
    return query;
};

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn().mockImplementation(() =>
            createQueryMock(selectResultsQueue.shift() ?? [{ blockedUntil: null }])
        ),
        insert: jest.fn().mockImplementation(() => ({
            values: jest.fn().mockImplementation(() => ({
                returning: jest.fn().mockImplementation(async () => ([{
                    id: 10,
                    userName: 'AI Student',
                    subject: 'Physics',
                    content: 'Visual Inquiry'
                }]))
            }))
        })),
        update: jest.fn().mockImplementation(() => ({
            set: jest.fn().mockImplementation(() => ({
                where: jest.fn().mockImplementation(async () => ([{ id: 10 }]))
            }))
        }))
    }
}));

jest.mock('groq-sdk', () => {
    const fn = jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockImplementation(async () => ({
                    choices: [{
                        message: {
                            content: JSON.stringify({ isAllowed: true, reason: 'Allowed' }) + '\nSUBJECT: Physics\n\n## Step-by-step explanation\nLight travels at approximately $3 \\times 10^8$ m/s.\n\n## Final Answer\n$3 \\times 10^8$ m/s.'
                        }
                    }]
                }))
            }
        }
    })) as any;
    return {
        __esModule: true,
        default: fn,
        Groq: fn
    };
});

describe('Ask AI API Endpoint', () => {
    const originalFetch = global.fetch;
    const mockAiLimit = aiLimiter.limit as jest.MockedFunction<typeof aiLimiter.limit>;

    beforeEach(() => {
        selectResultsQueue.length = 0;
    });

    afterEach(() => {
        global.fetch = originalFetch;
        mockAiLimit.mockReset();
        mockAiLimit.mockResolvedValue({
            success: true,
            limit: 10,
            remaining: 9,
            reset: Date.now() + 60_000,
        });
    });

    it('POST should generate AI solution and extract subject', async () => {
        global.fetch = jest.fn().mockImplementation(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ flagged: false, categories: {} }),
                text: () => Promise.resolve('{"flagged":false,"categories":{}}')
            })
        );

        const req = new Request('http://localhost/api/ask-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: 'What is the speed of light?',
                type: 'standard'
            })
        });

        const res = await POST(req);
        const json = await res.json();
        
        expect(res.status).toBe(200);
        expect(json.subject).toBe('Physics');
        expect(json.reply).toContain('Light travels at approximately');
    });

    it('rejects classroom-scoped requests from non-members', async () => {
        selectResultsQueue.push([{ blockedUntil: null }], [], []);

        const req = new Request('http://localhost/api/ask-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: 'What is the speed of light?',
                classroomId: 7,
            })
        });

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(403);
        expect(json.error).toBe('Access denied to this classroom');
    });

    it('POST should reject rate-limited requests before processing the body', async () => {
        mockAiLimit.mockResolvedValueOnce({
            success: false,
            limit: 10,
            remaining: 0,
            reset: Date.now() + 30_000,
        });

        const req = new Request('http://localhost/api/ask-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: 'What is the speed of light?',
            }),
        });

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(429);
        expect(res.headers.get('Retry-After')).toBeTruthy();
        expect(json).toEqual({
            error: 'Too many AI requests. Please try again shortly.',
            code: 'RATE_LIMITED',
        });
    });

    it('POST should reject unsupported image payloads before provider calls', async () => {
        const req = new Request('http://localhost/api/ask-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: '',
                imageBase64: 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBA==',
            }),
        });

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(422);
        expect(json).toEqual({
            error: 'Please upload a valid PNG, JPG, or WEBP image.',
            code: 'INVALID_IMAGE_PAYLOAD',
        });
    });

    it('POST should reject malformed classroom IDs without coercing them', async () => {
        const req = new Request('http://localhost/api/ask-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: 'What is the speed of light?',
                classroomId: '1e2',
            }),
        });

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(422);
        expect(json).toEqual({
            error: 'Invalid classroomId.',
            code: 'INVALID_CLASSROOM_ID',
        });
    });

    it('POST should reject request bodies larger than the configured limit', async () => {
        const req = new Request('http://localhost/api/ask-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: 'x'.repeat(AI_REQUEST_MAX_BYTES),
            }),
        });

        const res = await POST(req);
        const json = await res.json();

        expect(res.status).toBe(413);
        expect(json).toEqual({
            error: 'Requests must be 4MB or smaller.',
            code: 'REQUEST_TOO_LARGE',
        });
    });
});
