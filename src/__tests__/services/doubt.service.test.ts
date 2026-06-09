import { getDoubts } from "@/services/doubt.service";

jest.mock("@/configs/db", () => ({
    db: {}
}));

describe("Doubt Service", () => {
    describe("getDoubts", () => {
        it("returns a list of doubts", async () => {
            // Deeply mock Drizzle chain
            const mockChain: any = {
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                innerJoin: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                offset: jest.fn().mockResolvedValue([{ id: 1, subject: "Math", content: "Test" }]),
                then: function(resolve: any) {
                    resolve([{ id: 1, subject: "Math", content: "Test" }]);
                }
            };
            
            const mockDb = { select: jest.fn().mockReturnValue(mockChain) } as any;

            const params = {
                email: "test@example.com",
                subject: "Math",
                classroomId: 123
            };

            const result = await getDoubts(mockDb, params);

            expect(result.doubts).toHaveLength(1);
            expect(result.doubts[0].subject).toBe("Math");
        });
    });
});
