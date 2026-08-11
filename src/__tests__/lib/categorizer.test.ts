import { categorizeDoubt, normalizeCategory } from '@/lib/ai/categorizer';

let mockResponseContent = '';

jest.mock('groq-sdk', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            chat: {
                completions: {
                    create: jest.fn().mockImplementation(async ({ messages }: any) => {
                        if (mockResponseContent !== '') {
                            return { choices: [{ message: { content: mockResponseContent } }] };
                        }
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
    beforeEach(() => {
        mockResponseContent = '';
    });

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

    describe('normalizeCategory', () => {
        it('lowercases and re-title-cases inconsistent casing', () => {
            expect(normalizeCategory('recursion')).toBe('Recursion');
            expect(normalizeCategory('RECURSION')).toBe('Recursion');
        });

        it('strips trailing punctuation', () => {
            expect(normalizeCategory('Recursion.')).toBe('Recursion');
            expect(normalizeCategory('Recursion!')).toBe('Recursion');
            expect(normalizeCategory('Recursion,')).toBe('Recursion');
        });

        it('trims surrounding whitespace and collapses internal whitespace', () => {
            expect(normalizeCategory(' Recursion ')).toBe('Recursion');
            expect(normalizeCategory('Differential   Calculus')).toBe('Differential Calculus');
        });

        it('title-cases every word in multi-word categories', () => {
            expect(normalizeCategory('differential calculus')).toBe('Differential Calculus');
        });

        it('collapses casing/punctuation/whitespace variants of the same topic to one string', () => {
            const variants = ['Recursion', 'recursion', 'Recursion.', ' Recursion ', 'RECURSION!'];
            const normalized = variants.map(normalizeCategory);
            expect(new Set(normalized).size).toBe(1);
            expect(normalized[0]).toBe('Recursion');
        });
    });

    it('normalizes inconsistent LLM output before returning from categorizeDoubt', async () => {
        mockResponseContent = 'recursion.';
        const category = await categorizeDoubt('How does this recursive function work?', 'Programming');
        expect(category).toBe('Recursion');
    });

    it('normalizes an untrimmed, oddly-cased LLM response', async () => {
        mockResponseContent = '  DIFFERENTIAL calculus  ';
        const category = await categorizeDoubt('Find the derivative of x^2', 'Mathematics');
        expect(category).toBe('Differential Calculus');
    });
});
