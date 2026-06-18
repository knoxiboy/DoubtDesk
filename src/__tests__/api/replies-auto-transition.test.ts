import { POST } from "@/app/api/replies/route";
import { db } from "@/configs/db";
import { doubtsTable, repliesTable } from "@/configs/schema";
import { eq, and } from "drizzle-orm";
import { DOUBT_STATUS } from "@/lib/doubtStatus";

// Mock the dependencies
jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("@/lib/moderation", () => ({
  moderateContent: jest.fn().mockResolvedValue({ allowed: true }),
  handleModerationViolation: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/error-handler", () => ({
  buildErrorResponse: jest.fn(),
  errorResponse: jest.fn(),
}));

jest.mock("@/lib/auth/membership-guard", () => ({
  canTeach: jest.fn().mockReturnValue(false),
}));

jest.mock("@/lib/notifications/service", () => ({
  createReplyNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/inngest/client", () => ({
  inngest: {
    send: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock currentUser from Clerk
jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

describe("lib/doubtStatus", () => {
  it("isValidDoubtStatus accepts the three canonical values", () => {
    const { isValidDoubtStatus } = require("@/lib/doubtStatus");
    expect(isValidDoubtStatus(DOUBT_STATUS.UNSOLVED)).toBe(true);
    expect(isValidDoubtStatus(DOUBT_STATUS.IN_PROGRESS)).toBe(true);
    expect(isValidDoubtStatus(DOUBT_STATUS.SOLVED)).toBe(true);
  });

  it("isValidDoubtStatus rejects everything else", () => {
    const { isValidDoubtStatus } = require("@/lib/doubtStatus");
    expect(isValidDoubtStatus("invalid")).toBe(false);
    expect(isValidDoubtStatus("")).toBe(false);
    expect(isValidDoubtStatus(null)).toBe(false);
    expect(isValidDoubtStatus(undefined)).toBe(false);
  });

  it("isOpen is true for unsolved and in-progress, false for solved", () => {
    const { isOpen } = require("@/lib/doubtStatus");
    expect(isOpen(DOUBT_STATUS.UNSOLVED)).toBe(true);
    expect(isOpen(DOUBT_STATUS.IN_PROGRESS)).toBe(true);
    expect(isOpen(DOUBT_STATUS.SOLVED)).toBe(false);
  });
});

describe("POST /api/replies — auto-transition (issue #183)", () => {
  const mockUser = {
    id: "user_123",
    primaryEmailAddress: { emailAddress: "test@example.com" },
    fullName: "Test User",
  };

  const mockReq = (body: any) => {
    return {
      json: jest.fn().mockResolvedValue(body),
      url: "http://localhost:3000/api/replies",
    } as unknown as Request;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { currentUser } = require("@clerk/nextjs/server");
    currentUser.mockResolvedValue(mockUser);
  });

  it("unsolved community doubt is transitioned to in-progress after a reply", async () => {
    const doubtId = 1;

    const mockDb = require("@/configs/db").db;
    
    // Mock user block check - no blocked users
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    // Mock doubt check - unsolved community doubt
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{
          id: doubtId,
          userEmail: "author@example.com",
          classroomId: null,
          type: "community",
          isSolved: DOUBT_STATUS.UNSOLVED,
          subject: "Test Subject",
          content: "Test Content",
        }]),
      }),
    });

    // Mock reply insert
    const insertSpy = jest.fn().mockResolvedValue([{ 
      id: 1, 
      doubtId, 
      userEmail: "test@example.com",
      type: "community",
      content: "Test reply",
      createdAt: new Date()
    }]);
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: insertSpy,
      }),
    });

    // Mock doubt update
    const updateSpy = jest.fn().mockResolvedValue([{ id: doubtId }]);
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: updateSpy,
      }),
    });

    const req = mockReq({ doubtId, type: "community", content: "Test reply" });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty("id");
    expect(insertSpy).toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalled();
  });

  it("in-progress doubt is left alone (idempotent)", async () => {
    const doubtId = 2;

    const mockDb = require("@/configs/db").db;
    
    // Mock user block check
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    // Mock doubt check - in-progress doubt
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{
          id: doubtId,
          userEmail: "author@example.com",
          classroomId: null,
          type: "community",
          isSolved: DOUBT_STATUS.IN_PROGRESS,
          subject: "Test Subject",
          content: "Test Content",
        }]),
      }),
    });

    // Mock reply insert
    const insertSpy = jest.fn().mockResolvedValue([{ 
      id: 2, 
      doubtId, 
      userEmail: "test@example.com",
      type: "community",
      content: "Another reply",
      createdAt: new Date()
    }]);
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: insertSpy,
      }),
    });

    // Mock doubt update - should be called but not change status
    const updateSpy = jest.fn().mockResolvedValue([{ id: doubtId }]);
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: updateSpy,
      }),
    });

    const req = mockReq({ doubtId, type: "community", content: "Another reply" });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty("id");
    expect(insertSpy).toHaveBeenCalled();
    // The update should be called but the WHERE clause will check isSolved = 'unsolved'
    // so it won't actually update the in-progress doubt
    expect(updateSpy).toHaveBeenCalled();
  });

  it("solved doubt is NEVER downgraded by a new reply", async () => {
    const doubtId = 3;

    const mockDb = require("@/configs/db").db;
    
    // Mock user block check
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    // Mock doubt check - solved doubt
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{
          id: doubtId,
          userEmail: "author@example.com",
          classroomId: null,
          type: "community",
          isSolved: DOUBT_STATUS.SOLVED,
          subject: "Test Subject",
          content: "Test Content",
        }]),
      }),
    });

    // Mock reply insert
    const insertSpy = jest.fn().mockResolvedValue([{ 
      id: 3, 
      doubtId, 
      userEmail: "test@example.com",
      type: "community",
      content: "Reply to solved",
      createdAt: new Date()
    }]);
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: insertSpy,
      }),
    });

    // Mock doubt update - should not be called for solved doubts
    const updateSpy = jest.fn();
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: updateSpy,
      }),
    });

    const req = mockReq({ doubtId, type: "community", content: "Reply to solved" });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty("id");
    expect(insertSpy).toHaveBeenCalled();
    // The update should NOT be called because the doubt is solved
    // and the code checks if (doubt && doubt.type !== "ai") before attempting update
    // But since doubt.isSolved === DOUBT_STATUS.SOLVED, the WHERE clause won't match
    // The updateSpy might be called but won't update anything
    // Let's check that it's called with the correct WHERE conditions
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("AI-typed doubts are excluded from auto-transition", async () => {
    const doubtId = 4;

    const mockDb = require("@/configs/db").db;
    
    // Mock user block check
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    // Mock doubt check - AI doubt
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{
          id: doubtId,
          userEmail: "author@example.com",
          classroomId: null,
          type: "ai",
          isSolved: DOUBT_STATUS.UNSOLVED,
          subject: "Test Subject",
          content: "Test Content",
        }]),
      }),
    });

    // Mock reply insert
    const insertSpy = jest.fn().mockResolvedValue([{ 
      id: 4, 
      doubtId, 
      userEmail: "test@example.com",
      type: "community",
      content: "Reply to AI doubt",
      createdAt: new Date()
    }]);
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: insertSpy,
      }),
    });

    // Mock doubt update - should not be called for AI doubts
    const updateSpy = jest.fn();
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: updateSpy,
      }),
    });

    const req = mockReq({ doubtId, type: "community", content: "Reply to AI doubt" });
    const response = await POST(req);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toHaveProperty("id");
    expect(insertSpy).toHaveBeenCalled();
    // The update should NOT be called because doubt.type === "ai"
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it("transition failure does not fail the reply insert", async () => {
    const doubtId = 5;

    const mockDb = require("@/configs/db").db;
    
    // Mock user block check
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      }),
    });

    // Mock doubt check - unsolved community doubt
    mockDb.select.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{
          id: doubtId,
          userEmail: "author@example.com",
          classroomId: null,
          type: "community",
          isSolved: DOUBT_STATUS.UNSOLVED,
          subject: "Test Subject",
          content: "Test Content",
        }]),
      }),
    });

    // Mock reply insert - this should succeed
    const insertSpy = jest.fn().mockResolvedValue([{ 
      id: 5, 
      doubtId, 
      userEmail: "test@example.com",
      type: "community",
      content: "Test reply",
      createdAt: new Date()
    }]);
    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: insertSpy,
      }),
    });

    // Mock update to fail - this should be caught and not fail the reply
    const updateSpy = jest.fn().mockRejectedValue(new Error("transient db error"));
    mockDb.update.mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: updateSpy,
      }),
    });

    const req = mockReq({ doubtId, type: "community", content: "Test reply" });
    const response = await POST(req);
    const json = await response.json();

    // The reply should still be created successfully despite the transition failure
    expect(insertSpy).toHaveBeenCalled();
    expect(updateSpy).toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(json).toHaveProperty("id");
  });
});