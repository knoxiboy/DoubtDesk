import { moderateContent } from '@/lib/moderation';

jest.mock('@/configs/db', () => ({
    db: {
        select: jest.fn(),
        update: jest.fn(),
        insert: jest.fn(),
    },
}));

// Mock groq-sdk
jest.mock('groq-sdk', () => {
    return {
        Groq: jest.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: jest.fn().mockImplementation(async ({ messages }: any) => {
                        const content = messages[1]?.content || '';
                        if (content.includes('badword')) {
                            return {
                                choices: [{
                                    message: {
                                        content: JSON.stringify({
                                            isAllowed: false,
                                            reason: 'Contains inappropriate language',
                                            violationType: 'abusive'
                                        })
                                    }
                                }]
                            };
                        }
                        return {
                            choices: [{
                                message: {
                                    content: JSON.stringify({
                                        isAllowed: true,
                                        reason: 'Content looks good'
                                    })
                                }
                            }]
                        };
                    })
                }
            }
        }))
    };
});

describe('Moderation Service', () => {
    it('should allow valid academic content', async () => {
        const result = await moderateContent('How does recursion work in Python?');
        expect(result.isAllowed).toBe(true);
        expect(result.reason).toBe('Content looks good');
    });

    it('should disallow abusive content', async () => {
        const result = await moderateContent('This is a badword post!');
        expect(result.isAllowed).toBe(false);
        expect(result.reason).toBe('Contains inappropriate language');
        expect(result.violationType).toBe('abusive');
    });

    it('should return allowed for empty content', async () => {
        const result = await moderateContent('   ');
        expect(result.isAllowed).toBe(true);
        expect(result.reason).toBe('Empty content');
    });
});
