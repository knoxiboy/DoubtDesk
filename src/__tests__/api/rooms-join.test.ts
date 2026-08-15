import { POST } from "@/app/api/rooms/join/route";
import { currentUser } from "@clerk/nextjs/server";
import { checkUserBlock } from "@/lib/auth/auth-utils";
import { parseAndValidateRequest } from "@/lib/validations/validate";
import { inviteCodeLimiter } from "@/lib/ratelimit/ratelimit";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/lib/auth/auth-utils", () => ({
  checkUserBlock: jest.fn(),
}));

jest.mock("@/lib/validations/validate", () => ({
  parseAndValidateRequest: jest.fn(),
}));

const insertReturning = jest.fn();
const onConflictDoNothing = jest.fn(() => ({ returning: insertReturning }));

jest.mock("@/configs/schema", () => {
  const classroomsTable = { inviteCode: "inviteCode", id: "id" };
  const membershipsTable = { userEmail: "userEmail", classroomId: "classroomId" };
  (globalThis as any).__roomsJoinTables = { classroomsTable, membershipsTable };
  return { classroomsTable, membershipsTable };
});

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(() => {
      const chain: any = {
        from: (table: unknown) => {
          chain._table = table;
          return chain;
        },
        where: () => chain,
        then: (resolve: any) => {
          const { classroomsTable } = (globalThis as any).__roomsJoinTables;
          if (chain._table === classroomsTable) {
            return Promise.resolve(
              resolve([
                {
                  id: 9,
                  name: "Physics 101",
                  university: "MIT",
                  inviteCode: "ABC123",
                  inviteCodeExpiresAt: null,
                  allowedEmailDomains: null,
                },
              ]),
            );
          }
          return Promise.resolve(resolve([]));
        },
      };
      return chain;
    }),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        onConflictDoNothing,
        returning: insertReturning,
      })),
    })),
  },
}));

jest.mock("@/lib/errors/error-handler", () => ({
  buildErrorResponse: jest.fn((error: unknown) => ({
    status: 500,
    body: { error: error instanceof Error ? error.message : "Internal Server Error" },
  })),
}));

describe("POST /api/rooms/join concurrent membership (issue #1358)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (currentUser as jest.Mock).mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
    });
    (checkUserBlock as jest.Mock).mockResolvedValue({ isBlocked: false });
    (parseAndValidateRequest as jest.Mock).mockResolvedValue({
      errorResponse: null,
      data: { inviteCode: "ABC123" },
    });
    (inviteCodeLimiter.limit as jest.Mock).mockResolvedValue({ success: true });
    onConflictDoNothing.mockImplementation(() => ({ returning: insertReturning }));
  });

  function makeRequest() {
    return new Request("http://localhost/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode: "ABC123" }),
    }) as any;
  }

  it("returns already-member instead of 500 when ON CONFLICT inserts nothing", async () => {
    insertReturning.mockResolvedValue([]);

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Already a member of this classroom");
    expect(onConflictDoNothing).toHaveBeenCalled();
  });

  it("maps unique-constraint violations to already-member instead of 500", async () => {
    insertReturning.mockRejectedValue(Object.assign(new Error("duplicate"), { code: "23505" }));

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Already a member of this classroom");
  });

  it("does not return 500 when two joins race", async () => {
    insertReturning
      .mockResolvedValueOnce([{ id: 1, userEmail: "student@example.com", classroomId: 9 }])
      .mockResolvedValueOnce([]);

    const [first, second] = await Promise.all([POST(makeRequest()), POST(makeRequest())]);
    const statuses = [first.status, second.status].sort();
    const bodies = await Promise.all([first.json(), second.json()]);

    expect(statuses).toEqual([200, 400]);
    expect(bodies.some((b) => b.success === true)).toBe(true);
    expect(bodies.some((b) => b.error === "Already a member of this classroom")).toBe(true);
    expect(statuses.includes(500)).toBe(false);
  });
});
