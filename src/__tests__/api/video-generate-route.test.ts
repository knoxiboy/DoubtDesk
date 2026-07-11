import { POST } from "@/app/api/video/generate/route";

jest.mock("@clerk/nextjs/server", () => ({
    currentUser: jest.fn().mockResolvedValue({
        id: "user_123",
        primaryEmailAddress: { emailAddress: "student@example.com" },
    }),
}));

jest.mock("@/lib/ratelimit/api-rate-limit", () => ({
    enforceApiRateLimit: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/auth/auth-utils", () => ({
    checkUserBlock: jest.fn().mockResolvedValue({
        isBlocked: false,
        errorResponse: undefined,
        dbUser: undefined,
    }),
}));

jest.mock("@/configs/db", () => ({
    db: {
        insert: jest.fn(),
    },
}));

jest.mock("@/configs/schema", () => ({
    videoJobsTable: {},
}));

jest.mock("@/inngest/client", () => ({
    inngest: {
        send: jest.fn(),
    },
}));

jest.mock("@/lib/ratelimit/ratelimit", () => ({
    videoLimiter: {
        limit: jest.fn(),
    },
    redisClient: {
        set: jest.fn(),
        del: jest.fn(),
    },
}));

describe("video generate route", () => {
    it("rejects malformed image content before queueing OCR work", async () => {
        const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
            new Response("not an image", {
                status: 200,
                headers: { "Content-Type": "image/jpeg" },
            }),
        );

        const res = await POST(
            new Request("http://localhost/api/video/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    imageUrl: "https://example.com/malformed.jpg",
                }),
            }),
        );

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(res.status).toBe(422);
        await expect(res.json()).resolves.toEqual({
            error: "Please upload a valid PNG, JPG, or WEBP image.",
            code: "INVALID_IMAGE_PAYLOAD",
        });
    });
});
