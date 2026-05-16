const mockInstance = {
    chat: {
        completions: {
            create: jest.fn().mockImplementation(async () => ({
                choices: [{
                    message: {
                        content: JSON.stringify({ isAllowed: true, reason: 'Allowed' })
                    }
                }]
            }))
        }
    }
};

export const Groq = function() { return mockInstance; } as any;
export default Groq;
