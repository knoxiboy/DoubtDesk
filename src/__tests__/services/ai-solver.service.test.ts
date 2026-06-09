import { generateAISolution } from "@/services/ai-solver.service";

jest.mock("@/configs/db", () => ({
    db: {}
}));

jest.mock("@/lib/moderation", () => ({
    moderateContent: jest.fn().mockResolvedValue({}),
    handleModerationViolation: jest.fn().mockResolvedValue(null)
}));

jest.mock("@/lib/auth-utils", () => ({
    checkUserBlock: jest.fn().mockResolvedValue({ isBlocked: false })
}));

// Mock the Groq SDK
jest.mock('groq-sdk', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: "SUBJECT: Math\n\nThis is a test response." } }]
                })
            }
        }
    }));
});

describe("AI Solver Service", () => {
    describe("generateAISolution", () => {
        it("returns an AI reply and extracts the subject", async () => {
            const mockDb = {
                select: jest.fn().mockReturnThis(),
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([]),
                insert: jest.fn().mockReturnThis(),
                values: jest.fn().mockReturnThis(),
                returning: jest.fn().mockResolvedValue([{ id: 1 }]),
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis()
            } as any;

            const params = {
                email: "student@example.com",
                fullName: "Test Student",
                prompt: "What is 2+2?",
                type: "standard",
                imageBase64: undefined,
                classroomId: null,
                history: []
            };

            const result = await generateAISolution(mockDb, params);

            expect(result.reply).toContain("This is a test response.");
            expect(result.subject).toBe("Math");
        });
    });
});
