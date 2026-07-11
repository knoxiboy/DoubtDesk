import { db } from "@/configs/db";
import { checkAndAwardBadges } from "@/lib/karma/karma-utils";

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    transaction: jest.fn(),
    insert: jest.fn(),
  },
}));

jest.mock("@/lib/karma/karma-utils", () => ({
  checkAndAwardBadges: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/inngest/client", () => ({
  inngest: {
    createFunction: jest.fn((config: unknown, handler: unknown) => handler),
  },
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn((_col: unknown, val: unknown) => ({ col: _col, val })),
  and: jest.fn((...args: unknown[]) => args),
  isNotNull: jest.fn((col: unknown) => ({ col })),
  sql: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    raw: strings.join(""),
    values,
  })),
}));

const makeSelectChain = (rows: unknown[]) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(resolve(rows)),
  };
  return chain;
};

const makeUpdateChain = () => {
  const chain: any = {
    set: jest.fn(() => chain),
    where: jest.fn(() => Promise.resolve(undefined)),
  };
  return chain;
};

describe("dailyStreakProcessor", () => {
  const mockDb = db as jest.Mocked<typeof db>;
  const mockAwardBadges = checkAndAwardBadges as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("resets a live streak after a missed day and awards no duplicate badge work", async () => {
    jest.setSystemTime(new Date("2026-07-11T00:00:00.000Z"));

    (mockDb.select as jest.Mock).mockReturnValue(
      makeSelectChain([
        {
          email: "student@example.com",
          currentStreak: 6,
          lastContributionAt: new Date("2026-07-09T12:00:00.000Z"),
        },
      ]),
    );
    (mockDb.update as jest.Mock).mockReturnValue(makeUpdateChain());

    const { dailyStreakProcessor } = await import("@/inngest/karma");
    const result = await dailyStreakProcessor({});

    expect(result).toEqual({ processed: 1, skippedNoOp: 0, failures: 0 });
    expect(mockDb.update).toHaveBeenCalledTimes(1);
    expect(mockAwardBadges).not.toHaveBeenCalled();
  });

  it("skips the reset write when the streak is already zero", async () => {
    jest.setSystemTime(new Date("2026-07-11T00:00:00.000Z"));

    (mockDb.select as jest.Mock).mockReturnValue(
      makeSelectChain([
        {
          email: "student@example.com",
          currentStreak: 0,
          lastContributionAt: new Date("2026-07-09T12:00:00.000Z"),
        },
      ]),
    );
    (mockDb.update as jest.Mock).mockReturnValue(makeUpdateChain());

    const { dailyStreakProcessor } = await import("@/inngest/karma");
    const result = await dailyStreakProcessor({});

    expect(result).toEqual({ processed: 0, skippedNoOp: 1, failures: 0 });
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});
