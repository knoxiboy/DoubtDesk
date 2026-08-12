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

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

describe("Bookmarks API soft-delete totals", () => {
  const mockCurrentUser = currentUser as jest.Mock;
  const dbMock = db as jest.Mocked<typeof db>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
    });
  });

  it("reports total 0 when every bookmark points at a soft-deleted doubt", async () => {
    const countWhere = jest.fn().mockResolvedValue([{ total: 0 }]);
    const countJoin = jest.fn().mockReturnValue({ where: countWhere });

    (dbMock.select as jest.Mock).mockImplementationOnce(() => ({
      from: jest.fn().mockReturnValue({
        innerJoin: countJoin,
      }),
    }));

    const res = await GET(
      new Request("http://localhost/api/bookmarks?page=1&limit=20"),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(countJoin).toHaveBeenCalled();
    expect(json).toEqual({
      data: [],
      pagination: { page: 1, limit: 20, total: 0 },
    });
    // No further queries once the eligible total is zero.
    expect(dbMock.select).toHaveBeenCalledTimes(1);
  });
});
