import React from "react";
import { render, screen } from "@testing-library/react";
import ProfilePage from "@/app/profile/page";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/configs/db";

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn().mockResolvedValue({ userId: "user_123" }),
  currentUser: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@/configs/db", () => {
  const makeSelectChain = (result: any) => ({
    from: () => ({ where: () => ({ limit: () => Promise.resolve(result) }) }),
  });

  return {
    db: {
      select: jest.fn().mockImplementation(() => {
        return makeSelectChain([]);
      }),
    },
  };
});

describe("ProfilePage Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders unlocked badges when provided by the database", async () => {
    (currentUser as jest.Mock).mockResolvedValue({
      id: "user_123",
      firstName: "Test",
      lastName: "User",
      imageUrl: "https://example.com/avatar.jpg",
      primaryEmailAddressId: "email_1",
      emailAddresses: [{ id: "email_1", emailAddress: "test@example.com" }],
    });

    const mockDbUser = {
      name: "Test User",
      email: "test@example.com",
      karmaScore: 100,
      helpfulVotes: 10,
      unlockedBadges: ["Top Solver", "Helper"],
      createdAt: new Date().toISOString(),
      role: "Student",
    };

    (db.select as jest.Mock).mockImplementationOnce(() => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([mockDbUser]),
        }),
      }),
    }));

    (db.select as jest.Mock).mockImplementation(() => ({
      from: () => ({
        where: () => Promise.resolve([{ value: 0 }]),
      }),
    }));

    // Server components can be awaited in tests
    const page = await ProfilePage();
    render(page);

    expect(screen.getByText("🏅 Top Solver")).toBeInTheDocument();
    expect(screen.getByText("🏅 Helper")).toBeInTheDocument();
    
    // Check that helpful votes is displayed
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("Helpful Votes")).toBeInTheDocument();
  });
});
