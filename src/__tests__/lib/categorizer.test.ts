import { categorizeDoubt } from '@/lib/ai/categorizer';

jest.mock('groq-sdk', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: jest.fn().mockImplementation(async ({ messages }: any) => {
                        const userMsg = JSON.stringify(messages[1]?.content || '');
                        if (userMsg.includes('derivative')) {
                            return { choices: [{ message: { content: 'Calculus' } }] };
                        }
                        if (userMsg.includes('recursive')) {
                            return { choices: [{ message: { content: 'Recursion' } }] };
                        }
                        return { choices: [{ message: { content: 'General' } }] };
                    })
                }
            }
        }))
    };
});

describe('AI Categorizer Service', () => {
    it('should categorize math questions correctly', async () => {
        const category = await categorizeDoubt('Find the derivative of x^2', 'Mathematics');
        expect(category).toBe('Calculus');
    });

    it('should categorize programming questions correctly', async () => {
        const category = await categorizeDoubt('How does this recursive function work?', 'Programming');
        expect(category).toBe('Recursion');
    });

    it('should fallback to General for unknown topics', async () => {
        const category = await categorizeDoubt('Random text without keywords', 'Other');
        expect(category).toBe('General');
    });
});
