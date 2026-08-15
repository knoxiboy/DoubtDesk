import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/audit/route";

const requireAdminMock = jest.fn();
const selectResultQueue: any[] = [];

let lastLimit: number | undefined;

const createQueryMock = (data: any) => {
    const chain: any = {
        from: jest.fn().mockImplementation(() => chain),
        leftJoin: jest.fn().mockImplementation(() => chain),
        orderBy: jest.fn().mockImplementation(() => chain),
        limit: jest.fn().mockImplementation((value: number) => {
            lastLimit = value;
            return chain;
        }),
        offset: jest.fn().mockImplementation(() => chain),
        then: jest.fn().mockImplementation((resolve) => Promise.resolve(resolve(data))),
    };

    return chain;
};

jest.mock("@/lib/auth/requireAdmin", () => ({
    requireAdmin: () => requireAdminMock(),
}));

jest.mock("@/configs/db", () => ({
    db: {
        select: jest.fn().mockImplementation(() => createQueryMock(selectResultQueue.shift() ?? [])),
    },
}));

describe("Admin Audit API Endpoint", () => {
    beforeEach(() => {
        requireAdminMock.mockReset();
        selectResultQueue.length = 0;
        lastLimit = undefined;
    });

    it.each([
        ["defaults to 20 when limit is missing", "http://localhost/api/admin/audit", 20],
        ["keeps a normal limit", "http://localhost/api/admin/audit?limit=20", 20],
        ["caps an oversized limit", "http://localhost/api/admin/audit?limit=999999", 100],
        ["clamps zero to 1", "http://localhost/api/admin/audit?limit=0", 1],
        ["clamps negative values to 1", "http://localhost/api/admin/audit?limit=-10", 1],
    ])("%s", async (_label, url, expectedLimit) => {
        requireAdminMock.mockResolvedValue({ id: 1, email: "admin@example.com", role: "admin" });

        selectResultQueue.push([{ value: 2 }], [
            {
                id: 1,
                actorEmail: "admin@example.com",
                targetEmail: null,
                action: "viewed",
                resourceType: "audit",
                resourceId: "1",
                metadata: {},
                createdAt: new Date(),
                actorName: "Admin",
            },
        ]);

        const req = new NextRequest(url);
        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.pagination.limit).toBe(expectedLimit);
        expect(lastLimit).toBe(expectedLimit);
    });
});