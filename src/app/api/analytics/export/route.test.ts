import { GET } from "./route";
import { NextRequest } from "next/server";

const currentUserMock = jest.fn();
const checkUserBlockMock = jest.fn();
const requireTeacherMock = jest.fn();

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: () => currentUserMock(),
}));

jest.mock("@/lib/auth/auth-utils", () => ({
  checkUserBlock: (...args: unknown[]) => checkUserBlockMock(...args),
}));

jest.mock("@/lib/auth/membership-guard", () => ({
  requireTeacher: (...args: unknown[]) => requireTeacherMock(...args),
  TEACHER_ROLES: ["teacher", "owner", "admin"],
}));

const selectResultQueue: any[] = [];

jest.mock("@/configs/db", () => {
  const makeChain = () => {
    const chain: any = {
      from: jest.fn().mockImplementation(() => chain),
      where: jest.fn().mockImplementation(() => chain),
      orderBy: jest.fn().mockImplementation(() => chain),
      limit: jest.fn().mockImplementation(() => chain),
      groupBy: jest.fn().mockImplementation(() => chain),
      innerJoin: jest.fn().mockImplementation(() => chain),
      then: jest.fn().mockImplementation((resolve) => {
        const data = selectResultQueue.shift() ?? [];
        return Promise.resolve(resolve(data));
      }),
    };
    return chain;
  };
  return {
    db: {
      select: jest.fn().mockImplementation(() => makeChain()),
    },
  };
});

function makeReq(classroomId?: number) {
  const url = classroomId
    ? `http://localhost/api/analytics/export?classroomId=${classroomId}`
    : "http://localhost/api/analytics/export";
  return new NextRequest(url);
}

describe("Analytics Export API Endpoint", () => {
  beforeEach(() => {
    currentUserMock.mockReset();
    checkUserBlockMock.mockReset();
    requireTeacherMock.mockReset();
    selectResultQueue.length = 0;
    jest.clearAllMocks();

    currentUserMock.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "teacher@example.com" },
    });
    checkUserBlockMock.mockResolvedValue({ isBlocked: false, errorResponse: null });
    requireTeacherMock.mockResolvedValue(undefined);
  });

  it("returns 200 with CSV on success", async () => {
    // trendingDoubts
    selectResultQueue.push([]);
    // mostAskedTopics
    selectResultQueue.push([]);
    // solvedStats
    selectResultQueue.push([]);
    // peakTime
    selectResultQueue.push([]);
    // engagement
    selectResultQueue.push([{ totalStudents: 5, totalDoubts: 20 }]);
    // totalReplies
    selectResultQueue.push([{ count: 30 }]);
    // topContributors
    selectResultQueue.push([]);
    // recentAIReplies
    selectResultQueue.push([]);

    const res = await GET(makeReq(1));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain("analytics-report.csv");
    const text = await res.text();
    expect(text).toContain("Metric,Value");
    expect(text).toContain("Total Students,5");
  });

  it("returns 500 JSON error when database query fails", async () => {
    // Force the parallel Promise.all to reject
    selectResultQueue.push(Promise.reject(new Error("DB connection failed")));

    const res = await GET(makeReq(1));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("does not return misleading analytics fallback payload on error", async () => {
    selectResultQueue.push(Promise.reject(new Error("DB failure")));

    const res = await GET(makeReq(1));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).not.toHaveProperty("trendingDoubts");
    expect(body).not.toHaveProperty("mostAskedTopics");
    expect(body).not.toHaveProperty("solvedStats");
    expect(body).not.toHaveProperty("peakTime");
    expect(body).not.toHaveProperty("engagement");
    expect(body).not.toHaveProperty("weakTopics");
    expect(body).not.toHaveProperty("topContributors");
    expect(body).not.toHaveProperty("classroomSettings");
    expect(body).not.toHaveProperty("recentAIReplies");
  });

  it("returns 401 JSON when user is not authenticated", async () => {
    currentUserMock.mockResolvedValue(null);

    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 JSON when user has no teacher classrooms", async () => {
    // No classroomId → multi-classroom path
    // teacherMemberships
    selectResultQueue.push([]);
    // ownedClassrooms
    selectResultQueue.push([]);

    const res = await GET(makeReq());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toBe("Forbidden");
  });
});
