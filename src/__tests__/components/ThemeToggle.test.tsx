import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useTheme } from "next-themes";
import { useUser } from "@clerk/nextjs";

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}));

// Mock @clerk/nextjs
jest.mock("@clerk/nextjs", () => ({
  useUser: jest.fn(),
}));

describe("ThemeToggle", () => {
  const mockSetTheme = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({}),
      })
    ) as jest.Mock;
    (useTheme as jest.Mock).mockReturnValue({
      theme: "light",
      resolvedTheme: "light",
      setTheme: mockSetTheme,
    });
    (useUser as jest.Mock).mockReturnValue({
      isSignedIn: false,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders correctly in light mode", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /switch to dark mode/i });
    expect(button).toBeInTheDocument();
  });

  it("renders correctly in dark mode", () => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: "dark",
      resolvedTheme: "dark",
      setTheme: mockSetTheme,
    });
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /switch to light mode/i });
    expect(button).toBeInTheDocument();
  });

  it("opens menu and allows selecting custom theme (e.g. Midnight Blue)", async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /switch to dark mode/i });
    fireEvent.pointerDown(button, { pointerId: 1, button: 0 });

    const midnightOption = await screen.findByText("Midnight Blue");
    expect(midnightOption).toBeInTheDocument();

    fireEvent.click(midnightOption);
    expect(mockSetTheme).toHaveBeenCalledWith("midnight");
  });

  it("fetches user preferences if signed in", async () => {
    (useUser as jest.Mock).mockReturnValue({ isSignedIn: true });
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({ themePreference: "midnight" }),
      })
    );

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/user/preferences");
      expect(mockSetTheme).toHaveBeenCalledWith("midnight");
    });
  });

  it("updates user preference on theme selection if signed in", async () => {
    (useUser as jest.Mock).mockReturnValue({ isSignedIn: true });
    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: /switch to dark mode/i });
    fireEvent.pointerDown(button, { pointerId: 1, button: 0 });

    const cyberpunkOption = await screen.findByText("Cyberpunk");
    fireEvent.click(cyberpunkOption);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/user/preferences", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ themePreference: "cyberpunk" }),
      }));
    });
  });
});
