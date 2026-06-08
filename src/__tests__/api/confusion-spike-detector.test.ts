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
    it('can load during a production build without a Groq API key', async () => {
        const originalApiKey = process.env.GROQ_API_KEY;
        delete process.env.GROQ_API_KEY;

        await import('@/app/api/inngest/ConfusionSpikeDetector');

        expect(mockGroq).toHaveBeenCalledWith({ apiKey: 'dummy_key' });

        if (originalApiKey) {
            process.env.GROQ_API_KEY = originalApiKey;
        }
    });
});
