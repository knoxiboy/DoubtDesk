import { checkUserBlock } from "@/lib/auth/auth-utils";

jest.mock("@/configs/db", () => {
    const mockReturning = jest.fn();
    const mockWhere = jest.fn().mockReturnValue({ returning: mockReturning });
    const mockSet = jest.fn().mockReturnValue({ where: mockWhere });
    const mockUpdate = jest.fn().mockReturnValue({ set: mockSet });

    const mockSelectWhere = jest.fn();
    const mockFrom = jest.fn().mockReturnValue({ where: mockSelectWhere });
    const mockSelect = jest.fn().mockReturnValue({ from: mockFrom });

    return {
        db: {
            select: mockSelect,
            update: mockUpdate,
        },
        _mocks: {
            mockSelect,
            mockSelectWhere,
            mockUpdate,
            mockSet,
            mockWhere,
            mockReturning,
        }
    };
});

jest.mock("drizzle-orm", () => ({
    eq: jest.fn((col, val) => ({ type: "eq", col, val })),
    and: jest.fn((...args) => ({ type: "and", args })),
}));

const {
    mockSelectWhere,
    mockUpdate,
    mockWhere,
    mockReturning,
} = require("@/configs/db")._mocks;

describe("checkUserBlock", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return isBlocked: false if user does not exist", async () => {
        mockSelectWhere.mockResolvedValueOnce([]);

        const result = await checkUserBlock("test@example.com");

        expect(result).toEqual({
            isBlocked: false,
            errorResponse: undefined,
            dbUser: undefined,
        });
    });

    it("should return isBlocked: false if user is not blocked", async () => {
        const user = { email: "test@example.com", isBlocked: false, blockedUntil: null };
        mockSelectWhere.mockResolvedValueOnce([user]);

        const result = await checkUserBlock("test@example.com");

        expect(result).toEqual({
            isBlocked: false,
            errorResponse: undefined,
            dbUser: user,
        });
    });

    it("should return isBlocked: true if user is actively blocked", async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const user = { email: "test@example.com", isBlocked: true, blockedUntil: futureDate };
        mockSelectWhere.mockResolvedValueOnce([user]);

        const result = await checkUserBlock("test@example.com");

        expect(result.isBlocked).toBe(true);
        expect(result.errorResponse).toBeDefined();
        expect(result.dbUser).toEqual(user);
    });

    it("should atomically clear block state if block has expired and update succeeds", async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const user = { email: "test@example.com", isBlocked: true, blockedUntil: pastDate };
        const clearedUser = { email: "test@example.com", isBlocked: false, blockedUntil: null, violationCount: 0 };
        
        mockSelectWhere.mockResolvedValueOnce([user]);
        mockReturning.mockResolvedValueOnce([clearedUser]);

        const result = await checkUserBlock("test@example.com");

        expect(result).toEqual({
            isBlocked: false,
            errorResponse: undefined,
            dbUser: clearedUser,
        });

        expect(mockUpdate).toHaveBeenCalled();
        expect(mockWhere).toHaveBeenCalled();
    });

    it("should retry if concurrent update causes conditional update to fail", async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const expiredUser = { email: "test@example.com", isBlocked: true, blockedUntil: pastDate };
        
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 2);
        const newlyBlockedUser = { email: "test@example.com", isBlocked: true, blockedUntil: futureDate };

        // Attempt 1: Select returns expiredUser. Update returns [] (failed to match condition because of race).
        mockSelectWhere.mockResolvedValueOnce([expiredUser]);
        mockReturning.mockResolvedValueOnce([]);

        // Attempt 2: Select returns newlyBlockedUser (actively blocked).
        mockSelectWhere.mockResolvedValueOnce([newlyBlockedUser]);

        const result = await checkUserBlock("test@example.com");

        // The second attempt should detect they are actively blocked and block them
        expect(result.isBlocked).toBe(true);
        expect(result.errorResponse).toBeDefined();
        expect(result.dbUser).toEqual(newlyBlockedUser);

        expect(mockSelectWhere).toHaveBeenCalledTimes(2);
        expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it("fallback after 3 retries should return errorResponse when user is still actively blocked", async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        const expiredUser = { email: "test@example.com", isBlocked: true, blockedUntil: pastDate };

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 3);
        const activelyBlockedUser = { email: "test@example.com", isBlocked: true, blockedUntil: futureDate };

        // All 3 attempts: select expired user, update returns [] (race every time)
        mockSelectWhere.mockResolvedValueOnce([expiredUser]);
        mockReturning.mockResolvedValueOnce([]);
        mockSelectWhere.mockResolvedValueOnce([expiredUser]);
        mockReturning.mockResolvedValueOnce([]);
        mockSelectWhere.mockResolvedValueOnce([expiredUser]);
        mockReturning.mockResolvedValueOnce([]);

        // Fallback read: user is now actively blocked again
        mockSelectWhere.mockResolvedValueOnce([activelyBlockedUser]);

        const result = await checkUserBlock("test@example.com");

        // Fallback must NOT silently return errorResponse: undefined for a blocked user
        expect(result.isBlocked).toBe(true);
        expect(result.errorResponse).toBeDefined();
        expect(result.dbUser).toEqual(activelyBlockedUser);
    });
});
