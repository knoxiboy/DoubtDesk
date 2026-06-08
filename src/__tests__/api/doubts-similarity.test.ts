import { currentUser } from "@clerk/nextjs/server";

import { POST } from "@/app/api/doubts/check-similarity/route";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

const createQueryMock = () => {
  const query: any = {
    from: () => query,
    where: () => query,
    orderBy: () => query,
    limit: () => query,
    then: (resolve: any) => Promise.resolve(resolve([])),
  };
  return query;
};

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(() => createQueryMock()),
  },
}));

jest.mock("groq-sdk", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  })),
}));

describe("Doubt similarity API endpoint", () => {
  const currentUserMock = currentUser as jest.MockedFunction<typeof currentUser>;

  beforeEach(() => {
    currentUserMock.mockReset();
    currentUserMock.mockResolvedValue(null);
  });

  it("allows anonymous community similarity checks", async () => {
    const req = new Request("http://localhost/api/doubts/check-similarity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "How does photosynthesis convert light into energy?",
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ similarDoubts: [] });
    expect(currentUserMock).not.toHaveBeenCalled();
  });

  it("requires authentication for classroom similarity checks", async () => {
    const req = new Request("http://localhost/api/doubts/check-similarity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "How does photosynthesis convert light into energy?",
        classroomId: 7,
      }),
    });

    const res = await POST(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: "Unauthorized" });
  });
});
