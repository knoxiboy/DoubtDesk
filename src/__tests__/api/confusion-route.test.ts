import { GET, PATCH } from "@/app/api/confusion/route";
import { db } from "@/configs/db";
import {
  requireAuth,
  requireMembership,
  requireTeacher,
  parseClassroomId,
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

const createSelectMock = (results: unknown[] = []) => {
  const query: any = {
    from: () => query,
    where: () => query,
    orderBy: () => query,
    limit: (n: number) => query,
    then: (resolve: any) => Promise.resolve(resolve(results)),
  };
  return query;
};

const createUpdateMock = (results: unknown[] = []) => {
  const setSpy = jest.fn();
  const whereSpy = jest.fn();
  const query: any = {
    from: () => query,
    set: (...args: any[]) => {
      setSpy(...args);
      return query;
    },
    where: (...args: any[]) => {
      whereSpy(...args);
      return {
        then: (resolve: any) => Promise.resolve(resolve(results)),
      };
    },
    then: (resolve: any) => Promise.resolve(resolve(results)),
  };
  return { query, setSpy, whereSpy };
};

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(() => createSelectMock([])),
    update: jest.fn(() => createUpdateMock([])),
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
    jest.resetAllMocks();
    requireAuthMock.mockResolvedValue({
      user: {} as any,
      email: "teacher@example.com",
    });
    requireMembershipMock.mockResolvedValue(undefined);
    requireTeacherMock.mockResolvedValue(undefined);
    (parseClassroomId as jest.Mock).mockImplementation((v: string) => Number(v));
    (db.select as jest.Mock).mockImplementation(() => createSelectMock([]));
    (db.update as jest.Mock).mockImplementation(() => createUpdateMock([]));
  });

  describe("GET", () => {
    it("returns latest active alert", async () => {
      const latestAlert = {
        id: 7,
        classroomId: 1,
        status: "active",
      };
      (db.select as jest.Mock).mockImplementationOnce(() =>
        createSelectMock([latestAlert]),
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

    it("returns 403 when membership is denied", async () => {
      const { ApiError } = jest.requireActual("@/lib/errors/error-handler");
      requireMembershipMock.mockRejectedValue(
        new ApiError(403, "Access denied to this classroom"),
      );

      const req = new Request("http://localhost/api/confusion?roomId=1");
      const res = await GET(req);

      expect(res.status).toBe(403);
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
      (db.select as jest.Mock).mockImplementationOnce(() =>
        createSelectMock([]),
      );

      const req = new Request("http://localhost/api/confusion?id=999");
      const res = await PATCH(req);

      expect(res.status).toBe(404);
      expect(requireTeacherMock).not.toHaveBeenCalled();
      expect(db.update).not.toHaveBeenCalled();
    });

    it("returns 403 when teacher authorization is denied", async () => {
      const { ApiError } = jest.requireActual("@/lib/errors/error-handler");
      (db.select as jest.Mock).mockImplementationOnce(() =>
        createSelectMock([{ classroomId: 12 }]),
      );
      requireTeacherMock.mockRejectedValue(
        new ApiError(403, "Forbidden: teacher access required"),
      );

      const req = new Request("http://localhost/api/confusion?id=3");
      const res = await PATCH(req);

      expect(res.status).toBe(403);
      expect(db.update).not.toHaveBeenCalled();
    });

    it("acknowledges alert for teacher with correct payload", async () => {
      const setSpy = jest.fn();
      const whereSpy = jest.fn();
      (db.select as jest.Mock).mockImplementationOnce(() =>
        createSelectMock([{ classroomId: 12 }]),
      );
      (db.update as jest.Mock).mockImplementationOnce(() => {
        const query: any = {
          set: (...args: any[]) => {
            setSpy(...args);
            return query;
          },
          where: (...args: any[]) => {
            whereSpy(...args);
            return {
              then: (resolve: any) => Promise.resolve(resolve([])),
            };
          },
        };
        return query;
      });

      const req = new Request("http://localhost/api/confusion?id=3");
      const res = await PATCH(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json).toEqual({ success: true });
      expect(requireTeacherMock).toHaveBeenCalledWith("teacher@example.com", 12);
      expect(db.update).toHaveBeenCalledTimes(1);
      expect(setSpy).toHaveBeenCalledWith({
        status: "acknowledged",
        acknowledgedAt: expect.any(Date),
        acknowledgedBy: "teacher@example.com",
      });
      expect(whereSpy).toHaveBeenCalledTimes(1);
      const whereArg = whereSpy.mock.calls[0][0];
      expect(whereArg).toBeDefined();
    });
  });
});
