const mockGroq = jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn() } },
}));

jest.mock('groq-sdk', () => ({
    __esModule: true,
    default: mockGroq,
}));

jest.mock('@/inngest/client', () => ({
    inngest: {
        createFunction: jest.fn((_config, _handler) => ({ id: 'detect-confusion-spikes' })),
    },
}));

jest.mock('@/configs/db', () => ({ db: {} }));
jest.mock('@/configs/schema', () => ({
    doubtsTable: {},
    confusionAlertsTable: {},
}));

describe('confusion spike detector configuration', () => {
    afterEach(() => {
        jest.resetModules();
    });

    it('throws a clear error instead of falling back to a dummy key when GROQ_API_KEY is missing', async () => {
        const originalApiKey = process.env.GROQ_API_KEY;
        delete process.env.GROQ_API_KEY;

        await expect(import('@/app/api/inngest/ConfusionSpikeDetector')).rejects.toThrow(
            /GROQ_API_KEY is not set/
        );

        expect(mockGroq).not.toHaveBeenCalledWith(
            expect.objectContaining({ apiKey: expect.stringContaining('dummy') })
        );

        if (originalApiKey) {
            process.env.GROQ_API_KEY = originalApiKey;
        }
    });

    it('initializes the shared Groq client with the configured key when GROQ_API_KEY is set', async () => {
        const originalApiKey = process.env.GROQ_API_KEY;
        process.env.GROQ_API_KEY = 'test_key';

        await import('@/app/api/inngest/ConfusionSpikeDetector');

        expect(mockGroq).toHaveBeenCalledWith({ apiKey: 'test_key' });

        if (originalApiKey) {
            process.env.GROQ_API_KEY = originalApiKey;
        } else {
            delete process.env.GROQ_API_KEY;
        }
    });
});
