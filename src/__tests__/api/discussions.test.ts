import { POST, GET } from "@/app/api/discussions/route";

const currentUserMock = jest.fn();
const checkUserBlockMock = jest.fn();

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: () => currentUserMock(),
}));

jest.mock("@/lib/auth/auth-utils", () => ({
  checkUserBlock: (...args: unknown[]) => checkUserBlockMock(...args),
}));

jest.mock("@/lib/validations/validate", () => {
  const actual = jest.requireActual("@/lib/validations/validate");
  return {
    ...actual,
    limitRequestBodySize: jest.fn().mockResolvedValue(null),
  };
});

const selectWhereMock = jest.fn();
const insertReturningMock = jest.fn();
const orderByMock = jest.fn();

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: selectWhereMock,
        orderBy: orderByMock,
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: insertReturningMock,
      })),
    })),
  },
}));

describe("Discussions API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    checkUserBlockMock.mockResolvedValue({ isBlocked: false, errorResponse: null });
  });

  it("GET returns discussion threads newest first", async () => {
    const createdAt = new Date("2026-08-01T10:00:00.000Z");
    orderByMock.mockResolvedValue([
      {
        id: 2,
        title: "Newer thread",
        description: "desc",
        category: "General",
        authorEmail: "a@example.com",
        authorName: "Aarav",
        isAnonymous: false,
        replyCount: 3,
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0]).toMatchObject({
      id: 2,
      title: "Newer thread",
      author: "Aarav",
      replies: 3,
    });
  });

  it("POST rejects unauthenticated users", async () => {
    currentUserMock.mockResolvedValue(null);

    const res = await POST(
      new Request("http://localhost/api/discussions", {
        method: "POST",
        body: JSON.stringify({ title: "Hello" }),
      }),
    );

    expect(res.status).toBe(401);
  });

  it("POST persists a thread for an authenticated user", async () => {
    currentUserMock.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
      fullName: "Sumit Kumar",
      firstName: "Sumit",
    });

    selectWhereMock.mockResolvedValue([
      { id: 1, email: "student@example.com", name: "Sumit Kumar" },
    ]);

    const createdAt = new Date("2026-08-06T12:00:00.000Z");
    insertReturningMock.mockResolvedValue([
      {
        id: 10,
        title: "DBMS viva tips",
        description: "How should I prepare?",
        category: "General",
        authorEmail: "student@example.com",
        authorName: "Sumit Kumar",
        isAnonymous: false,
        replyCount: 0,
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    const res = await POST(
      new Request("http://localhost/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "DBMS viva tips",
          description: "How should I prepare?",
          anonymous: false,
        }),
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data).toMatchObject({
      id: 10,
      title: "DBMS viva tips",
      author: "Sumit Kumar",
      replies: 0,
    });
  });

  it("POST masks author when anonymous is true", async () => {
    currentUserMock.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
      fullName: "Sumit Kumar",
    });

    selectWhereMock.mockResolvedValue([
      { id: 1, email: "student@example.com", name: "Sumit Kumar" },
    ]);

    const createdAt = new Date("2026-08-06T12:00:00.000Z");
    insertReturningMock.mockResolvedValue([
      {
        id: 11,
        title: "Anonymous thread",
        description: "",
        category: "General",
        authorEmail: "student@example.com",
        authorName: "Sumit Kumar",
        isAnonymous: true,
        replyCount: 0,
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    const res = await POST(
      new Request("http://localhost/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Anonymous thread",
          anonymous: true,
        }),
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.data.author).toBe("Anonymous");
  });
});
