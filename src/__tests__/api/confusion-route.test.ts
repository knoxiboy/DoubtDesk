import { GET, PATCH } from "@/app/api/confusion/route";
import { db } from "@/configs/db";
import {
  requireAuth,
  requireMembership,
  requireTeacher,
} from "@/lib/auth/membership-guard";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/lib/auth/membership-guard", () => ({
  requireAuth: jest.fn(),
  requireMembership: jest.fn().mockResolvedValue(undefined),
  requireTeacher: jest.fn().mockResolvedValue(undefined),
  parseClassroomId: jest.fn((v: string) => Number(v)),
}));

const createQueryMock = (results: unknown[] = []) => {
  const query: any = {
    from: () => query,
    where: () => query,
    orderBy: () => query,
    limit: (n: number) => query,
    set: () => query,
    then: (resolve: any) => Promise.resolve(resolve(results)),
  };
  return query;
};

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(() => createQueryMock([])),
    update: jest.fn(() => createQueryMock([])),
  },
}));

describe("Confusion API route", () => {
  const requireAuthMock = requireAuth as jest.MockedFunction<typeof requireAuth>;
  const requireMembershipMock = requireMembership as jest.MockedFunction<
    typeof requireMembership
  >;
  const requireTeacherMock = requireTeacher as jest.MockedFunction<
    typeof requireTeacher
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    requireAuthMock.mockResolvedValue({
      user: {} as any,
      email: "teacher@example.com",
    });
  });

  describe("GET", () => {
    it("returns latest active alert", async () => {
      const latestAlert = {
        id: 7,
        classroomId: 1,
        status: "active",
      };
      (db.select as jest.Mock).mockImplementationOnce(() =>
        createQueryMock([latestAlert]),
      );

      const req = new Request("http://localhost/api/confusion?roomId=1");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual(latestAlert);
      expect(requireMembershipMock).toHaveBeenCalledWith("teacher@example.com", 1);
    });

    it("returns 400 when roomId is missing", async () => {
      const req = new Request("http://localhost/api/confusion");
      const res = await GET(req);

      expect(res.status).toBe(400);
      expect(db.select).not.toHaveBeenCalled();
    });
  });

  describe("PATCH", () => {
    it("returns 400 when id is invalid", async () => {
      const req = new Request("http://localhost/api/confusion?id=abc");
      const res = await PATCH(req);

      expect(res.status).toBe(400);
      expect(db.select).not.toHaveBeenCalled();
      expect(db.update).not.toHaveBeenCalled();
    });

    it("returns 400 when id is missing", async () => {
      const req = new Request("http://localhost/api/confusion");
      const res = await PATCH(req);

      expect(res.status).toBe(400);
      expect(db.select).not.toHaveBeenCalled();
      expect(db.update).not.toHaveBeenCalled();
    });

    it("returns 404 when alert is not found", async () => {
      (db.select as jest.Mock).mockImplementationOnce(() => createQueryMock([]));

      const req = new Request("http://localhost/api/confusion?id=999");
      const res = await PATCH(req);

      expect(res.status).toBe(404);
      expect(requireTeacherMock).not.toHaveBeenCalled();
      expect(db.update).not.toHaveBeenCalled();
    });

    it("acknowledges alert for teacher", async () => {
      (db.select as jest.Mock).mockImplementationOnce(() =>
        createQueryMock([{ classroomId: 12 }]),
      );

      const req = new Request("http://localhost/api/confusion?id=3");
      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true });
      expect(requireTeacherMock).toHaveBeenCalledWith("teacher@example.com", 12);
      expect(db.update).toHaveBeenCalledTimes(1);
    });
  });
});
