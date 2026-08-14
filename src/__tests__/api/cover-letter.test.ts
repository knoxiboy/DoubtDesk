import { NextResponse } from "next/server";
import { POST } from "@/app/api/cover-letter/route";
import { currentUser } from "@clerk/nextjs/server";
import { checkUserBlock } from "@/lib/auth/auth-utils";
import { limitRequestBodySize } from "@/lib/validations/validate";
import axios from "axios";

jest.mock("@clerk/nextjs/server", () => ({
  currentUser: jest.fn(),
}));

jest.mock("@/lib/auth/auth-utils", () => ({
  checkUserBlock: jest.fn(),
}));

jest.mock("@/lib/validations/validate", () => ({
  limitRequestBodySize: jest.fn().mockResolvedValue(null),
}));

jest.mock("axios", () => ({
  post: jest.fn(),
}));

jest.mock("@/configs/db", () => ({
  db: {
    insert: jest.fn(() => ({
      values: jest.fn().mockResolvedValue([]),
    })),
  },
}));

describe("POST /api/cover-letter", () => {
  const mockCurrentUser = currentUser as jest.Mock;
  const mockCheckUserBlock = checkUserBlock as jest.Mock;
  const mockAxiosPost = axios.post as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (limitRequestBodySize as jest.Mock).mockResolvedValue(null);
  });

  function makeRequest() {
    return new Request("http://localhost/api/cover-letter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription: "Software engineer",
        userDetails: "Built APIs in Node",
      }),
    }) as any;
  }

  it("returns 401 and does not call Groq when unauthenticated", async () => {
    mockCurrentUser.mockResolvedValue(null);

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
    expect(mockAxiosPost).not.toHaveBeenCalled();
    expect(mockCheckUserBlock).not.toHaveBeenCalled();
  });

  it("returns 401 when the session has no email", async () => {
    mockCurrentUser.mockResolvedValue({ primaryEmailAddress: null });

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("rejects blocked users before calling Groq", async () => {
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "blocked@example.com" },
    });
    mockCheckUserBlock.mockResolvedValue({
      isBlocked: true,
      errorResponse: NextResponse.json({ error: "Blocked" }, { status: 403 }),
    });

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Blocked");
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("returns block-check failures before calling Groq", async () => {
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
    });
    mockCheckUserBlock.mockResolvedValue({
      isBlocked: false,
      errorResponse: NextResponse.json({ error: "Unable to verify account" }, { status: 503 }),
    });

    const res = await POST(makeRequest());

    expect(res.status).toBe(503);
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("requires a persisted user before calling Groq", async () => {
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
    });
    mockCheckUserBlock.mockResolvedValue({ isBlocked: false, dbUser: undefined });

    const res = await POST(makeRequest());

    expect(res.status).toBe(409);
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it("generates a cover letter for an authenticated user", async () => {
    mockCurrentUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "student@example.com" },
    });
    mockCheckUserBlock.mockResolvedValue({ isBlocked: false, dbUser: { id: 1 } });
    mockAxiosPost.mockResolvedValue({
      data: { choices: [{ message: { content: "Dear Hiring Manager..." } }] },
    });

    const res = await POST(makeRequest());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.coverLetter).toBe("Dear Hiring Manager...");
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
  });
});
