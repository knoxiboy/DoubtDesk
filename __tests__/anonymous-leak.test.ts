/**
 * __tests__/anonymous-leak.test.ts
 *
 * Tests the privacy invariant:
 * Anonymous doubt/reply API responses must never contain identifying fields.
 */

import { sanitizeDoubt, sanitizeReply, sanitizeDoubts } from "@/lib/sanitize-response";

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const AUTHOR_ID = "user_clerk_abc123";
const OTHER_USER_ID = "user_clerk_xyz999";

// Define the shape of our test data with number IDs (matching the sanitization function)
interface TestDoubt {
  id: number;
  content: string;
  subject: string;
  isAnonymous: boolean;
  anonymousHandle: string | null;
  authorId: string;
  authorName: string;
  authorEmail: string;
  roomId: string;
  createdAt: Date;
  likeCount: number;
  isResolved: boolean;
  displayName?: string;
  userEmail?: string | null;
}

interface TestReply {
  id: number;
  content: string;
  isAnonymous: boolean;
  anonymousHandle: string | null;
  authorId: string;
  authorName: string;
  authorEmail: string;
  doubtId: string;
  createdAt: Date;
  displayName?: string;
  userEmail?: string | null;
}

const anonymousDoubt: TestDoubt = {
  id: 1,
  content: "What is the difference between Stack and Queue?",
  subject: "Data Structures",
  isAnonymous: true,
  anonymousHandle: "Student_A7X",
  authorId: AUTHOR_ID,
  authorName: "Rahul Sharma",
  authorEmail: "rahul@college.edu",
  roomId: "room_cs101",
  createdAt: new Date("2026-06-01T10:00:00Z"),
  likeCount: 5,
  isResolved: false,
  displayName: "Student_A7X",
  userEmail: null,
};

const publicDoubt: TestDoubt = {
  id: 2,
  content: "How does merge sort work?",
  subject: "Algorithms",
  isAnonymous: false,
  anonymousHandle: null,
  authorId: AUTHOR_ID,
  authorName: "Rahul Sharma",
  authorEmail: "rahul@college.edu",
  roomId: "room_cs101",
  createdAt: new Date("2026-06-01T11:00:00Z"),
  likeCount: 2,
  isResolved: true,
  displayName: "Rahul Sharma",
  userEmail: "rahul@college.edu",
};

const anonymousReply: TestReply = {
  id: 1,
  content: "Stack is LIFO, Queue is FIFO.",
  isAnonymous: true,
  anonymousHandle: "Student_B2K",
  authorId: "user_clerk_replier111",
  authorName: "Priya Patel",
  authorEmail: "priya@college.edu",
  doubtId: "doubt_001",
  createdAt: new Date("2026-06-01T10:30:00Z"),
  displayName: "Student_B2K",
  userEmail: null,
};

// ─── Tests: Anonymous Doubt Sanitization ─────────────────────────────────────

describe("sanitizeDoubt — anonymous post, different viewer", () => {
  const result = sanitizeDoubt(anonymousDoubt, OTHER_USER_ID);

  test("does not contain authorId", () => {
    expect(JSON.stringify(result)).not.toContain(AUTHOR_ID);
  });

  test("does not contain real author name", () => {
    expect(JSON.stringify(result)).not.toContain("Rahul Sharma");
  });

  test("does not contain author email", () => {
    expect(JSON.stringify(result)).not.toContain("rahul@college.edu");
  });

  test("returns the anonymous handle as displayName", () => {
    expect(result.displayName).toBe("Student_A7X");
  });

  test("isOwnPost is false for a different viewer", () => {
    expect(result.isOwnPost).toBe(false);
  });

  test("contains non-sensitive fields correctly", () => {
    expect(result.id).toBe(1);
    expect(result.content).toBe("What is the difference between Stack and Queue?");
    expect(result.isAnonymous).toBe(true);
    expect(result.likeCount).toBe(5);
    expect(result.isResolved).toBe(false);
  });
});

describe("sanitizeDoubt — anonymous post, own author viewing", () => {
  const result = sanitizeDoubt(anonymousDoubt, AUTHOR_ID);

  test("isOwnPost is true for the author themselves", () => {
    expect(result.isOwnPost).toBe(true);
  });

  test("still does not expose authorId even to the author", () => {
    expect(Object.keys(result)).not.toContain("authorId");
  });

  test("still does not expose authorEmail even to the author", () => {
    expect(Object.keys(result)).not.toContain("authorEmail");
  });
});

describe("sanitizeDoubt — anonymous post, unauthenticated viewer", () => {
  const result = sanitizeDoubt(anonymousDoubt, null);

  test("isOwnPost is false for unauthenticated viewer", () => {
    expect(result.isOwnPost).toBe(false);
  });

  test("does not expose authorId", () => {
    expect(JSON.stringify(result)).not.toContain(AUTHOR_ID);
  });
});

// ─── Tests: Public (Non-Anonymous) Doubt ─────────────────────────────────────

describe("sanitizeDoubt — non-anonymous post", () => {
  const result = sanitizeDoubt(publicDoubt, OTHER_USER_ID);

  test("shows real author name for public posts", () => {
    expect(result.displayName).toBe("Rahul Sharma");
  });

  test("still does not expose authorId for public posts", () => {
    expect(Object.keys(result)).not.toContain("authorId");
  });

  test("still does not expose authorEmail", () => {
    expect(Object.keys(result)).not.toContain("authorEmail");
  });
});

// ─── Tests: Reply Sanitization ────────────────────────────────────────────────

describe("sanitizeReply — anonymous reply, different viewer", () => {
  const result = sanitizeReply(anonymousReply, OTHER_USER_ID);

  test("does not contain authorId in reply", () => {
    expect(JSON.stringify(result)).not.toContain("user_clerk_replier111");
  });

  test("does not contain real name in anonymous reply", () => {
    expect(JSON.stringify(result)).not.toContain("Priya Patel");
  });

  test("does not contain email in reply", () => {
    expect(JSON.stringify(result)).not.toContain("priya@college.edu");
  });

  test("returns anonymous handle as displayName", () => {
    expect(result.displayName).toBe("Student_B2K");
  });

  test("isOwnPost false for different viewer", () => {
    expect(result.isOwnPost).toBe(false);
  });
});

// ─── Tests: Bulk Sanitization ────────────────────────────────────────────────

describe("sanitizeDoubts — array of mixed doubts", () => {
  const results = sanitizeDoubts([anonymousDoubt, publicDoubt], OTHER_USER_ID);

  test("sanitizes all items in the array", () => {
    expect(results).toHaveLength(2);
  });

  test("no item in array contains authorId", () => {
    const json = JSON.stringify(results);
    expect(json).not.toContain(AUTHOR_ID);
  });

  test("no item in array contains any email", () => {
    const json = JSON.stringify(results);
    expect(json).not.toContain("@college.edu");
  });

  test("anonymous item has anonymous handle", () => {
    expect(results[0].displayName).toBe("Student_A7X");
  });

  test("public item has real name", () => {
    expect(results[1].displayName).toBe("Rahul Sharma");
  });
});