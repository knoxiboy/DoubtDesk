import { GET } from "@/app/api/profile/route";
import { auth, currentUser } from "@clerk/nextjs/server";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
  currentUser: jest.fn(),
}));

jest.mock("@/lib/errors/error-handler", () => ({
  buildErrorResponse: jest.fn().mockReturnValue({
    status: 500,
    body: { error: "Internal Server Error" },
  }),
}));

jest.mock("@/lib/anonymity/anonymity", () => ({
  toPublicDoubt: (d: any) => d,
  toPublicReply: (r: any) => r,
}));

const selectResultQueue: any[] = [];
const selectArgs: any[] = [];

const createQueryMock = (data: any) => {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
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

describe("GET /api/profile activities.classrooms", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectResultQueue.length = 0;
    selectArgs.length = 0;
    (auth as unknown as jest.Mock).mockResolvedValue({ userId: "user_1" });
    (currentUser as jest.Mock).mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
      fullName: "Student One",
      imageUrl: "https://img.example/avatar.png",
      createdAt: Date.parse("2026-01-01T00:00:00.000Z"),
    });
  });

  it("omits inviteCode and teacherEmail from student classroom summaries", async () => {
    selectResultQueue.push(
      [{ id: 1, email: "student@example.com", createdAt: new Date("2026-01-01") }],
      [{ value: 0 }],
      [{ value: 0 }],
      [],
      [],
      [{ classroomId: 9, role: "student", userEmail: "student@example.com" }],
      [
        {
          id: 9,
          name: "Physics 101",
          university: "MIT",
          year: "1st Year",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );

    const res = await GET(new Request("http://localhost/api/profile"));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.activities.classrooms).toHaveLength(1);

    const classroom = json.activities.classrooms[0];
    expect(classroom).not.toHaveProperty("inviteCode");
    expect(classroom).not.toHaveProperty("inviteCodeExpiresAt");
    expect(classroom).not.toHaveProperty("teacherEmail");
    expect(classroom).not.toHaveProperty("allowedEmailDomains");
    expect(classroom.id).toBe(9);
    expect(classroom.name).toBe("Physics 101");
    expect(classroom.role).toBe("student");

    const classroomSelect = selectArgs.find(
      (fields) => fields && typeof fields === "object" && "name" in fields && "university" in fields,
    );
    expect(classroomSelect).toBeDefined();
    expect(classroomSelect).not.toHaveProperty("inviteCode");
    expect(classroomSelect).not.toHaveProperty("inviteCodeExpiresAt");
    expect(classroomSelect).not.toHaveProperty("teacherEmail");
    expect(classroomSelect).not.toHaveProperty("allowedEmailDomains");
  });
});
