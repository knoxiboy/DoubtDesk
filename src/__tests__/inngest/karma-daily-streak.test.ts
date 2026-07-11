import { dailyStreakProcessor } from "@/inngest/karma";
import { db } from "@/configs/db";
import { checkAndAwardBadges } from "@/lib/karma/karma-utils";

jest.mock("@/inngest/client", () => ({
  inngest: {
    createFunction: jest.fn((_: unknown, handler: unknown) => handler),
  },
}));

jest.mock("@/lib/karma/karma-utils", () => ({
  checkAndAwardBadges: jest.fn(),
}));

jest.mock("@/configs/schema", () => ({
  usersTable: {
    email: {},
    currentStreak: {},
    lastContributionAt: {},
    karmaScore: {},
    karmaLevel: {},
  },
  karmaTransactionsTable: {
    id: {},
    userEmail: {},
    eventType: {},
    createdAt: {},
  },
}));

const selectRows: any[] = [];
let updatePayload: any;

const createSelectQuery = () => {
  const query: any = {
    from: jest.fn(() => query),
    where: jest.fn(() => query),
    limit: jest.fn(() => query),
    then: (resolve: (value: any[]) => unknown) =>
      Promise.resolve(resolve(selectRows.shift() ?? [])),
  };

  return query;
};

const createUpdateQuery = () => {
  const query: any = {
    set: jest.fn((payload: any) => {
      updatePayload = payload;
      return query;
    }),
    where: jest.fn(() => query),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(undefined)),
  };

  return query;
};

jest.mock("@/configs/db", () => ({
  db: {
    select: jest.fn(() => createSelectQuery()),
    update: jest.fn(() => createUpdateQuery()),
    transaction: jest.fn(),
    insert: jest.fn(),
  },
}));

const updateMock = db.update as jest.Mock;
const transactionMock = db.transaction as jest.Mock;
const badgeMock = checkAndAwardBadges as jest.Mock;

describe("daily streak processor", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-10T18:30:00.000Z"));
    selectRows.length = 0;
    updatePayload = undefined;
    updateMock.mockClear();
    transactionMock.mockClear();
    badgeMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("resets the streak when the cron sees a one-day gap", async () => {
    selectRows.push([
        {
          email: "student@example.com",
          currentStreak: 6,
          lastContributionAt: new Date("2026-07-09T17:30:00.000Z"),
        },
    ]);

    await dailyStreakProcessor();

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(transactionMock).not.toHaveBeenCalled();
    expect(updatePayload).toEqual({ currentStreak: 0 });
    expect(badgeMock).not.toHaveBeenCalled();
  });
});
