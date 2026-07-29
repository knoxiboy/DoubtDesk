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
                        if (userMsg.includes('lowercase-test')) {
                            return { choices: [{ message: { content: 'recursion' } }] };
                        }
                        if (userMsg.includes('punctuation-test')) {
                            return { choices: [{ message: { content: 'Recursion.' } }] };
                        }
                        if (userMsg.includes('whitespace-test')) {
                            return { choices: [{ message: { content: '  Differential   Calculus  ' } }] };
                        }
                        if (userMsg.includes('empty-test')) {
                            return { choices: [{ message: { content: '' } }] };
                        }
                        if (userMsg.includes('quoted-test')) {
                            return { choices: [{ message: { content: '"Recursion"' } }] };
                        }
                        if (userMsg.includes('ellipsis-test')) {
                            return { choices: [{ message: { content: 'Recursion…' } }] };
                        }
                        if (userMsg.includes('trailing-junk-test')) {
                            return { choices: [{ message: { content: 'Recursion) . .' } }] };
                        }
                        if (userMsg.includes('sql-test')) {
                            return { choices: [{ message: { content: 'SQL' } }] };
                        }
                        if (userMsg.includes('api-design-test')) {
                            return { choices: [{ message: { content: 'API Design' } }] };
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

    describe('output normalization', () => {
        it('should title-case a lowercase response', async () => {
            const category = await categorizeDoubt('lowercase-test', 'Programming');
            expect(category).toBe('Recursion');
        });

        it('should strip trailing punctuation', async () => {
            const category = await categorizeDoubt('punctuation-test', 'Programming');
            expect(category).toBe('Recursion');
        });

        it('should collapse extra whitespace and title-case multi-word responses', async () => {
            const category = await categorizeDoubt('whitespace-test', 'Mathematics');
            expect(category).toBe('Differential Calculus');
        });

        it('should fallback to General when the model returns an empty string', async () => {
            const category = await categorizeDoubt('empty-test', 'Other');
            expect(category).toBe('General');
        });

        it('should strip leading and trailing quotes', async () => {
            const category = await categorizeDoubt('quoted-test', 'Programming');
            expect(category).toBe('Recursion');
        });

        it('should strip non-ASCII trailing punctuation like ellipsis', async () => {
            const category = await categorizeDoubt('ellipsis-test', 'Programming');
            expect(category).toBe('Recursion');
        });

        it('should strip trailing parenthesis and spaced periods', async () => {
            const category = await categorizeDoubt('trailing-junk-test', 'Programming');
            expect(category).toBe('Recursion');
        });

        it('should preserve known acronyms instead of lowercasing them', async () => {
            const category = await categorizeDoubt('sql-test', 'Databases');
            expect(category).toBe('SQL');
        });

        it('should preserve acronym casing within multi-word responses', async () => {
            const category = await categorizeDoubt('api-design-test', 'Programming');
            expect(category).toBe('API Design');
        });
    });
});