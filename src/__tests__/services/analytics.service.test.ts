import { getDashboardAnalytics } from "@/services/analytics.service";
import * as authUtils from "@/lib/auth-utils";

jest.mock("@/lib/auth-utils", () => ({
    checkUserBlock: jest.fn().mockResolvedValue({ isBlocked: false })
}));

jest.mock("@/configs/db", () => ({
    db: {}
}));

describe("Analytics Service", () => {
    describe("getDashboardAnalytics", () => {
        it("returns an empty object when user is in no classrooms", async () => {
            const mockDb = {
                select: jest.fn().mockReturnThis(),
                from: jest.fn().mockReturnThis(),
                where: jest.fn().mockResolvedValue([]) // returns empty userClassroomIds
            } as any;

            const params = {
                email: "teacher@example.com",
                classroomId: null
            };

            const result = await getDashboardAnalytics(mockDb, params);

            expect(result.trendingDoubts).toHaveLength(0);
            expect(result.engagement.totalStudents).toBe(0);
        });
    });
});
