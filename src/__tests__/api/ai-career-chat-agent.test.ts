import axios from "axios";

import { POST } from "@/app/api/ai-career-chat-agent/route";
import {
    buildAiProviderErrorResponse,
    enforceAiAvailability,
} from "@/lib/ai/kill-switch";

jest.mock("axios", () => ({
    __esModule: true,
    default: {
        post: jest.fn(),
    },
}));

jest.mock("@clerk/nextjs/server", () => ({
    currentUser: jest.fn().mockResolvedValue({
        primaryEmailAddress: { emailAddress: "student@example.com" },
    }),
}));

jest.mock("@/lib/auth-utils", () => ({
    checkUserBlock: jest.fn().mockResolvedValue({ errorResponse: null }),
}));

jest.mock("@/lib/ai/kill-switch", () => ({
    buildAiProviderErrorResponse: jest.fn(
        () => new Response(JSON.stringify({ error: "provider unavailable" }), { status: 503 }),
    ),
    enforceAiAvailability: jest.fn().mockResolvedValue(null),
}));

describe("AI Career Chat API Endpoint", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (enforceAiAvailability as jest.Mock).mockResolvedValue(null);
        (buildAiProviderErrorResponse as jest.Mock).mockImplementation(
            () => new Response(JSON.stringify({ error: "provider unavailable" }), { status: 503 }),
        );
    });

    it("returns 400 for malformed JSON before quota or provider calls", async () => {
        const request = new Request("http://localhost/api/ai-career-chat-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "not-json",
        });

        const response = await POST(request as any);

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: "Invalid JSON body",
        });
        expect(enforceAiAvailability).not.toHaveBeenCalled();
        expect(axios.post).not.toHaveBeenCalled();
    });

    it.each(["null", "[]"])(
        "returns 400 for non-object JSON body %s",
        async (body) => {
            const request = new Request("http://localhost/api/ai-career-chat-agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body,
            });

            const response = await POST(request as any);

            expect(response.status).toBe(400);
            await expect(response.json()).resolves.toEqual({
                error: "Invalid JSON body",
            });
            expect(enforceAiAvailability).not.toHaveBeenCalled();
            expect(axios.post).not.toHaveBeenCalled();
        },
    );

    it("sets a timeout on the provider request", async () => {
        (axios.post as jest.Mock).mockResolvedValue({
            data: { choices: [{ message: { content: "response" } }] },
        });
        const request = new Request("http://localhost/api/ai-career-chat-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userInput: "How should I learn TypeScript?" }),
        });

        const response = await POST(request as any);

        expect(response.status).toBe(200);
        expect(axios.post).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(Object),
            expect.objectContaining({ timeout: 15_000 }),
        );
    });

    it("logs only safe provider error fields", async () => {
        const error = {
            message: "provider failed",
            status: 503,
            code: "ETIMEDOUT",
            config: { headers: { Authorization: "secret" } },
        };
        (axios.post as jest.Mock).mockRejectedValue(error);
        const consoleError = jest.spyOn(console, "error").mockImplementation();
        const request = new Request("http://localhost/api/ai-career-chat-agent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userInput: "How should I learn TypeScript?" }),
        });

        await POST(request as any);

        expect(consoleError).toHaveBeenCalledWith(
            "AI Career Chat Provider Error:",
            {
                message: "provider failed",
                status: 503,
                code: "ETIMEDOUT",
            },
        );
        expect(consoleError).not.toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ config: expect.anything() }),
        );
        consoleError.mockRestore();
    });
});
