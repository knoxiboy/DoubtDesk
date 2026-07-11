import { GET } from "@/app/api/analytics/personal/route";
import { db } from "@/configs/db";

var cacheStore = new Map<string, string>();

jest.mock("@/lib/auth/membership-guard", () => ({
  requireAuth: jest.fn().mockResolvedValue({ email: "student@example.com" }),
  requireMembership: jest.fn().mockResolvedValue({ role: "student" }),
  parseClassroomId: jest.fn((value: string) => Number(value)),
}));

jest.mock("groq-sdk", () =>
  {
    const mockGroqCreate = jest.fn();
    const fn = jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockGroqCreate,
        },
      },
    })) as any;
    return {
      __esModule: true,
      default: fn,
      Groq: fn,
      __mockGroqCreate: mockGroqCreate,
    };
  },
);

jest.mock("@/lib/ratelimit/ratelimit", () => ({
  redisClient: {
    get: jest.fn(async (key: string) => cacheStore.get(key) ?? null),
    set: jest.fn(async (key: string, value: string) => {
      cacheStore.set(key, value);
      return "OK";
    }),
  },
}));

jest.mock("@/configs/schema", () => ({
  doubtsTable: {
    content: {},
    subject: {},
    createdAt: {},
    classroomId: {},
    userEmail: {},
    deletedAt: {},
  },
}));

const selectMock = db.select as jest.Mock;
const groqCreateMock = require("groq-sdk").__mockGroqCreate as jest.Mock;

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(),
  },
}));

const doubts = [
  {
    content: "What is recursion?",
    subject: "Programming",
    createdAt: new Date("2026-07-01T10:00:00.000Z"),
  },
  {
    content: "How do call stacks work?",
    subject: "Programming",
    createdAt: new Date("2026-07-02T10:00:00.000Z"),
  },
];

const createChain = (rows: any[]) => {
  const chain: any = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    then: (resolve: (value: any[]) => unknown) => Promise.resolve(resolve(rows)),
  };
  return chain;
};

describe("personal analytics route", () => {
  beforeEach(() => {
    cacheStore.clear();
    groqCreateMock.mockReset().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              weakTopics: [],
              insight: "Great progress.",
              recommendations: {
                practiceQuestions: ["Q1"],
                conceptExplainer: "Keep going.",
              },
            }),
          },
        },
      ],
    });
    selectMock.mockReset().mockImplementation(() => createChain(doubts));
  });

  it("reuses cached analytics for the same doubt snapshot", async () => {
    const first = await GET(new Request("http://localhost/api/analytics/personal?classroomId=7"));
    const firstJson = await first.json();

    const second = await GET(new Request("http://localhost/api/analytics/personal?classroomId=7"));
    const secondJson = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(firstJson).toEqual(secondJson);
    expect(groqCreateMock).toHaveBeenCalledTimes(1);
  });
});
