import { POST, GET } from "@/app/api/discussions/route";

const currentUserMock = jest.fn();
const checkUserBlockMock = jest.fn();

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: () => currentUserMock(),
}));

jest.mock("@/lib/auth/auth-utils", () => ({
  checkUserBlock: (...args: unknown[]) => checkUserBlockMock(...args),
}));

jest.mock("@/lib/validations/validate", () => ({
  limitRequestBodySize: jest.fn().mockResolvedValue(null),
}));

const selectWhereMock = jest.fn();
const insertReturningMock = jest.fn();
const countResultMock = jest.fn();
const dataResultMock = jest.fn();

let dbLimitValue: number | undefined;
let dbOffsetValue: number | undefined;

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn((...args: unknown[]) => {
      if (args.length > 0) {
        return {
          from: jest.fn(() => countResultMock()),
        };
      }
      return {
        from: jest.fn(() => ({
          where: selectWhereMock,
          orderBy: jest.fn(() => ({
            limit: jest.fn((limitValue: number) => {
              dbLimitValue = limitValue;
              return {
                offset: jest.fn((offsetValue: number) => {
                  dbOffsetValue = offsetValue;
                  return dataResultMock();
                }),
              };
            }),
          })),
        })),
      };
    }),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: insertReturningMock,
      })),
    })),
  },
}));

const threadRow = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: "Thread",
  description: "",
  category: "General",
  authorEmail: "a@example.com",
  authorName: "Author",
  isAnonymous: false,
  replyCount: 0,
  createdAt: new Date("2026-08-01T10:00:00.000Z"),
  updatedAt: new Date("2026-08-01T10:00:00.000Z"),
  ...overrides,
});

describe("Discussions API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbLimitValue = undefined;
    dbOffsetValue = undefined;
    checkUserBlockMock.mockResolvedValue({ isBlocked: false, errorResponse: null });
  });

  describe("GET /api/discussions — pagination", () => {
    it("applies default limit=20 and offset=0 when no query params", async () => {
      countResultMock.mockResolvedValue([{ count: 1 }]);
      dataResultMock.mockResolvedValue([threadRow()]);

      const res = await GET(new Request("http://localhost/api/discussions"));
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(dbLimitValue).toBe(20);
      expect(dbOffsetValue).toBe(0);
      expect(json.limit).toBe(20);
      expect(json.page).toBe(1);
      expect(json.totalCount).toBe(1);
      expect(json.hasMore).toBe(false);
      expect(json.data).toHaveLength(1);
      expect(json.data[0]).toMatchObject({
        id: 1,
        title: "Thread",
        author: "Author",
        replies: 0,
      });
    });

    it("applies custom limit from query params", async () => {
      countResultMock.mockResolvedValue([{ count: 100 }]);
      dataResultMock.mockResolvedValue([threadRow(), threadRow({ id: 2 })]);

      const res = await GET(new Request("http://localhost/api/discussions?limit=5"));
      const json = await res.json();

      expect(dbLimitValue).toBe(5);
      expect(json.limit).toBe(5);
      expect(json.data).toHaveLength(2);
    });

    it("applies custom offset from query params", async () => {
      countResultMock.mockResolvedValue([{ count: 100 }]);
      dataResultMock.mockResolvedValue([threadRow({ id: 11 })]);

      const res = await GET(new Request("http://localhost/api/discussions?offset=10"));
      const json = await res.json();

      expect(dbOffsetValue).toBe(10);
      expect(json.page).toBe(1);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].id).toBe(11);
    });

    it("converts page=2&limit=10 to offset=10", async () => {
      countResultMock.mockResolvedValue([{ count: 100 }]);
      dataResultMock.mockResolvedValue([threadRow({ id: 11 })]);

      const res = await GET(new Request("http://localhost/api/discussions?page=2&limit=10"));
      const json = await res.json();

      expect(dbLimitValue).toBe(10);
      expect(dbOffsetValue).toBe(10);
      expect(json.limit).toBe(10);
      expect(json.page).toBe(2);
    });

    it("caps limit at 100 when exceeding maximum", async () => {
      countResultMock.mockResolvedValue([{ count: 1000 }]);
      dataResultMock.mockResolvedValue([]);

      const res = await GET(new Request("http://localhost/api/discussions?limit=200"));
      const json = await res.json();

      expect(dbLimitValue).toBe(100);
      expect(json.limit).toBe(100);
    });

    it("falls back to default limit=20 for non-numeric limit", async () => {
      countResultMock.mockResolvedValue([{ count: 50 }]);
      dataResultMock.mockResolvedValue([]);

      const res = await GET(new Request("http://localhost/api/discussions?limit=abc"));
      const json = await res.json();

      expect(dbLimitValue).toBe(20);
      expect(json.limit).toBe(20);
    });

    it("returns hasMore=true when more rows remain", async () => {
      countResultMock.mockResolvedValue([{ count: 50 }]);
      dataResultMock.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => threadRow({ id: i + 1 })),
      );

      const res = await GET(new Request("http://localhost/api/discussions"));
      const json = await res.json();

      expect(json.hasMore).toBe(true);
      expect(json.totalCount).toBe(50);
      expect(json.data).toHaveLength(20);
    });

    it("returns hasMore=false when all rows are returned", async () => {
      countResultMock.mockResolvedValue([{ count: 3 }]);
      dataResultMock.mockResolvedValue(
        Array.from({ length: 3 }, (_, i) => threadRow({ id: i + 1 })),
      );

      const res = await GET(new Request("http://localhost/api/discussions"));
      const json = await res.json();

      expect(json.hasMore).toBe(false);
      expect(json.totalCount).toBe(3);
      expect(json.data).toHaveLength(3);
    });

    it("returns empty data with hasMore=false when table is empty", async () => {
      countResultMock.mockResolvedValue([{ count: 0 }]);
      dataResultMock.mockResolvedValue([]);

      const res = await GET(new Request("http://localhost/api/discussions"));
      const json = await res.json();

      expect(json.data).toEqual([]);
      expect(json.totalCount).toBe(0);
      expect(json.hasMore).toBe(false);
      expect(json.page).toBe(1);
      expect(json.limit).toBe(20);
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
