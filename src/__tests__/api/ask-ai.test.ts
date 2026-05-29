import { POST } from '@/app/api/ask-ai/route';

jest.mock('@clerk/nextjs/server', () => ({
    auth: jest.fn().mockImplementation(async () => ({ userId: 'user_123' })),
    currentUser: jest.fn().mockImplementation(async () => ({
        primaryEmailAddress: { emailAddress: 'student@example.com' },
        fullName: 'AI Student'
    }))
}));

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn().mockImplementation(() => ({
            from: jest.fn().mockImplementation(() => ({
                where: jest.fn().mockImplementation(async () => ([{
                    blockedUntil: null
                }]))
            }))
        })),
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

    afterEach(() => {
        global.fetch = originalFetch;
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
});