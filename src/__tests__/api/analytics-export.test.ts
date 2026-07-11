import { currentUser } from "@clerk/nextjs/server";

import { GET } from "@/app/api/analytics/export/route";
import { db } from "@/configs/db";
import { checkUserBlock } from "@/lib/auth/auth-utils";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/lib/auth/auth-utils", () => ({
  checkUserBlock: jest.fn(),
}));

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

jest.mock("@/lib/auth/membership-guard", () => ({
  requireTeacher: jest.fn(),
}));

const currentUserMock = currentUser as jest.MockedFunction<typeof currentUser>;
const checkUserBlockMock = checkUserBlock as jest.MockedFunction<
  typeof checkUserBlock
>;
const selectMock = db.select as jest.Mock;

describe("analytics export API", () => {
  beforeEach(() => {
    currentUserMock.mockReset();
    checkUserBlockMock.mockReset();
    selectMock.mockReset();
    currentUserMock.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
    } as Awaited<ReturnType<typeof currentUser>>);
    checkUserBlockMock.mockResolvedValue({
      isBlocked: false,
      errorResponse: undefined,
    } as Awaited<ReturnType<typeof checkUserBlock>>);
  });

  it("rejects non-teachers before exporting analytics for all classrooms", async () => {
    const where = jest.fn().mockResolvedValue([{ role: "student" }]);
    selectMock.mockReturnValue({
      from: jest.fn(() => ({
        where,
      })),
    });

    const res = await GET(
      new Request("http://localhost/api/analytics/export"),
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: "Forbidden: teacher access required",
    });
    expect(selectMock).toHaveBeenCalledTimes(1);
  });
});
