import { GET } from "@/app/api/bookmarks/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/lib/errors/error-handler", () => ({
  buildErrorResponse: jest.fn().mockReturnValue({
    status: 500,
    body: { error: "Internal Server Error" },
  }),
  errorResponse: (message: string, status: number) =>
    Response.json({ error: message }, { status }),
}));

const orderByMock = jest.fn();

function createCountChain(total: number) {
  return {
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue([{ total }]),
    }),
  };
}

function createBookmarkPageChain(rows: Array<{ id: number; doubtId: number }>) {
  const chain = {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: orderByMock.mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockResolvedValue(rows),
  };
  return chain;
}

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

describe("Bookmarks API stable pagination", () => {
  const mockCurrentUser = currentUser as jest.Mock;
  const dbMock = db as jest.Mocked<typeof db>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
    });
  });

  it("orders bookmarks before limit/offset and preserves that order in the response", async () => {
    const bookmarkPage = [
      { id: 30, doubtId: 3 },
      { id: 20, doubtId: 2 },
    ];

    // Returned intentionally out of bookmark order to prove we re-sort.
    const doubts = [
      { id: 2, content: "older doubt", deletedAt: null },
      { id: 3, content: "newer bookmark target", deletedAt: null },
    ];

    let selectCall = 0;
    (dbMock.select as jest.Mock).mockImplementation(() => {
      selectCall += 1;
      if (selectCall === 1) return createCountChain(2);
      if (selectCall === 2) return createBookmarkPageChain(bookmarkPage);
      if (selectCall === 3) {
        return {
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(doubts),
          }),
        };
      }
      if (selectCall === 4) {
        return {
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        };
      }
      return {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            groupBy: jest.fn().mockResolvedValue([]),
          }),
        }),
      };
    });

    const res = await GET(
      new Request("http://localhost/api/bookmarks?page=1&limit=2"),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(orderByMock).toHaveBeenCalled();
    expect(json.data.map((d: { id: number }) => d.id)).toEqual([3, 2]);
    expect(json.pagination).toEqual({ page: 1, limit: 2, total: 2 });
  });

  it("returns 401 when unauthenticated", async () => {
    mockCurrentUser.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/bookmarks"));
    expect(res.status).toBe(401);
  });
});
