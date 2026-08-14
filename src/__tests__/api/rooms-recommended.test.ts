import { GET } from "@/app/api/rooms/route";
import { currentUser } from "@clerk/nextjs/server";
import { checkUserBlock } from "@/lib/auth/auth-utils";
import { classroomsTable } from "@/configs/schema";
import { isNull, notInArray } from "drizzle-orm";

jest.mock("drizzle-orm", () => {
  const actual = jest.requireActual("drizzle-orm");
  return {
    ...actual,
    isNull: jest.fn(actual.isNull),
    notInArray: jest.fn(actual.notInArray),
  };
});

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/lib/auth/auth-utils", () => ({
  checkUserBlock: jest.fn(),
}));

jest.mock("@/lib/errors/error-handler", () => ({
  buildErrorResponse: jest.fn().mockReturnValue({
    status: 500,
    body: { error: "Internal Server Error" },
  }),
  errorResponse: (message: string, status: number) =>
    Response.json({ error: message }, { status }),
}));

const selectResultQueue: any[] = [];
const selectArgs: any[] = [];

const createQueryMock = (data: any) => {
  const chain: any = {
    from: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    then: (resolve: any) => Promise.resolve(resolve(data)),
  };
  return chain;
};

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn((fields?: unknown) => {
      selectArgs.push(fields);
      return createQueryMock(selectResultQueue.shift() ?? []);
    }),
  },
}));

describe("GET /api/rooms recommended[]", () => {
  const mockCurrentUser = currentUser as jest.Mock;
  const mockCheckUserBlock = checkUserBlock as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    selectResultQueue.length = 0;
    selectArgs.length = 0;
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
    });
    mockCheckUserBlock.mockResolvedValue({ isBlocked: false });
  });

  it("does not expose inviteCode or teacherEmail on recommended classrooms", async () => {
    selectResultQueue.push(
      [{ id: 5, role: "student" }], // joined rooms
      [{ email: "student@example.com", university: "MIT", year: "1st Year" }],
      [
        {
          id: 9,
          name: "Physics 101",
          university: "MIT",
          year: "1st Year",
          pedagogyLevel: "Undergraduate (Freshman)",
          targetGradeLevel: 13,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );

    const res = await GET(new Request("http://localhost/api/rooms"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.recommended).toHaveLength(1);

    const recommended = json.recommended[0];
    expect(recommended).not.toHaveProperty("inviteCode");
    expect(recommended).not.toHaveProperty("inviteCodeExpiresAt");
    expect(recommended).not.toHaveProperty("teacherEmail");
    expect(recommended).not.toHaveProperty("allowedEmailDomains");
    expect(recommended.id).toBe(9);
    expect(recommended.name).toBe("Physics 101");

    const recommendedSelect = selectArgs.find(
      (fields) => fields && typeof fields === "object" && "pedagogyLevel" in fields,
    );
    expect(recommendedSelect).toBeDefined();
    expect(recommendedSelect).not.toHaveProperty("inviteCode");
    expect(recommendedSelect).not.toHaveProperty("teacherEmail");
    expect(recommendedSelect).not.toHaveProperty("allowedEmailDomains");
    expect(recommendedSelect).not.toHaveProperty("inviteCodeExpiresAt");
    expect(isNull).toHaveBeenCalledWith(classroomsTable.organizationId);
    expect(notInArray).toHaveBeenCalledWith(classroomsTable.id, [5]);
  });
});
