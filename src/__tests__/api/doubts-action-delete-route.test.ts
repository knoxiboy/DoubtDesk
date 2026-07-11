import { DELETE } from "@/app/api/doubts/action/[id]/route";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
  },
}));

const currentUserMock = currentUser as jest.MockedFunction<typeof currentUser>;
const selectMock = db.select as jest.Mock;
const updateMock = db.update as jest.Mock;

describe("doubts action delete route", () => {
  beforeEach(() => {
    currentUserMock.mockReset();
    selectMock.mockReset();
    updateMock.mockReset();
  });

  it("returns 401 when the authenticated user has no primary email", async () => {
    currentUserMock.mockResolvedValue({
      primaryEmailAddress: null,
    } as never);

    const response = await DELETE(new Request("http://localhost/api/doubts/action/7"), {
      params: Promise.resolve({ id: "7" }),
    });

    expect(selectMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
