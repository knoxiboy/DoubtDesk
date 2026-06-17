// src/__tests__/api/admin-overview.test.ts
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/overview/route";

const requireAdminMock = jest.fn();
jest.mock("@/lib/auth/requireAdmin", () => ({
    requireAdmin: () => requireAdminMock(),
}));

const selectResultsQueue: any[] = [];

const createQueryMock = (data: any) => ({
    from: () => createQueryMock(data),
    where: () => createQueryMock(data),
    leftJoin: () => createQueryMock(data),
    innerJoin: () => createQueryMock(data),
    groupBy: () => createQueryMock(data),
    orderBy: () => createQueryMock(data),
    limit: () => createQueryMock(data),
    offset: () => createQueryMock(data),
    then: (resolve: any) => Promise.resolve(resolve(data)),
});

jest.mock("@/configs/db", () => ({
    db: {
        select: jest.fn().mockImplementation(() => createQueryMock(selectResultsQueue.shift() ?? [])),
        selectDistinct: jest.fn().mockImplementation(() => createQueryMock(selectResultsQueue.shift() ?? [])),
    },
}));

describe("Admin Overview API Endpoint", () => {
    beforeEach(() => {
        requireAdminMock.mockReset();
        selectResultsQueue.length = 0;
    });

    it("rejects unauthorized access when requireAdmin fails", async () => {
        // Next.js redirection throws NEXT_REDIRECT
        requireAdminMock.mockRejectedValue(new Error("NEXT_REDIRECT"));

        const req = new NextRequest("http://localhost/api/admin/overview");
        
        await expect(GET(req)).rejects.toThrow("NEXT_REDIRECT");
    });

    it("returns compiled stats when user is authenticated admin", async () => {
        requireAdminMock.mockResolvedValue({ id: 1, email: "admin@example.com", role: "admin" });

        // Push mock responses for all 17 queries in sequence
        selectResultsQueue.push(
            [{ value: 100 }], // totalUsers
            [{ value: 10 }],  // totalClassrooms
            [{ value: 250 }], // totalDoubts
            [{ value: 45 }],  // totalAiCalls
            [{ value: 2 }],   // activeConfusionAlerts
            [{ role: "student", count: 85 }, { role: "teacher", count: 14 }, { role: "admin", count: 1 }], // rolesBreakdown
            [{ id: 1 }, { id: 2 }], // activeClassrooms
            [{ subject: "Math", count: 150 }, { subject: "Science", count: 100 }], // subjectVolume
            [
                { id: 1, name: "Math 101", university: "Uni", year: "2026", teacherEmail: "t@u.edu", teacherName: "Teacher" }
            ], // classrooms list
            [{ classroomId: 1, count: 20 }], // studentCounts
            [{ classroomId: 1, total: 15, solved: 10 }], // doubtStats
            [{ classroomId: 1, totalReplies: 8, driftedReplies: 1 }], // pedagogyStats
            [{ classroomId: 1, count: 1 }], // activeAlertsPerClassroom
            [{ classroomId: 1, avgTimeMins: 35 }], // resolutionTimes
            [
                { id: 5, classroomId: 1, classroomName: "Math 101", topic: "Integrals", summary: "Help", suggestedAction: "Do recap", confidence: 85, doubtCount: 6, createdAt: new Date() }
            ], // confusionAlerts list
            [{ value: 3 }], // pendingFlags
            [{ value: 12 }]  // totalFlags
        );

        const req = new NextRequest("http://localhost/api/admin/overview");
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.stats.totalUsers).toBe(100);
        expect(json.stats.totalClassrooms).toBe(10);
        expect(json.stats.totalDoubts).toBe(250);
        expect(json.stats.totalAiCalls).toBe(45);
        expect(json.stats.activeConfusionAlerts).toBe(2);
        expect(json.classroomHealth).toHaveLength(1);
        expect(json.classroomHealth[0].name).toBe("Math 101");
        expect(json.classroomHealth[0].driftRate).toBe(13); // 1 / 8 = 12.5 -> 13%
        expect(json.confusionAlerts).toHaveLength(1);
        expect(json.confusionAlerts[0].topic).toBe("Integrals");
        expect(json.stats.moderationQueue.pendingFlags).toBe(3);
    });
});
