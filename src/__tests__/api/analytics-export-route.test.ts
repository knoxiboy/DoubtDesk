import { GET } from "@/app/api/analytics/export/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/lib/auth/auth-utils", () => ({
  checkUserBlock: jest.fn().mockResolvedValue({
    isBlocked: false,
    errorResponse: undefined,
  }),
}));

const selectResults: any[] = [];

const createQuery = () => {
  const query: any = {
    from: jest.fn(() => query),
    where: jest.fn(() => query),
    then: (resolve: (value: any[]) => unknown) =>
      Promise.resolve(resolve(selectResults.shift() ?? [])),
  };

  return query;
};

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(() => createQuery()),
  },
}));

const currentUserMock = currentUser as jest.MockedFunction<typeof currentUser>;
const selectMock = db.select as jest.Mock;

describe("analytics export route", () => {
  beforeEach(() => {
    currentUserMock.mockReset();
    selectMock.mockClear();
    selectResults.length = 0;
    currentUserMock.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
    } as never);
  });

  it("rejects unscoped export requests from non-teachers", async () => {
    selectResults.push([], []);

    const response = await GET(
      new Request("http://localhost/api/analytics/export"),
    );

    expect(selectMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden: teacher access required",
    });
  });
});
