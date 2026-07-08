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
      resolvedTheme: "dark",
      setTheme: mockSetTheme,
    });
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /switch to light mode/i });
    expect(button).toBeInTheDocument();
  });

  it("toggles theme on click", async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /switch to dark mode/i });
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
  });

  it("fetches user preferences if signed in", async () => {
    (useUser as jest.Mock).mockReturnValue({ isSignedIn: true });
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        json: () => Promise.resolve({ themePreference: "dark" }),
      })
    );

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/user/preferences");
      expect(mockSetTheme).toHaveBeenCalledWith("dark");
    });
  });

  it("updates user preference on toggle if signed in", async () => {
    (useUser as jest.Mock).mockReturnValue({ isSignedIn: true });
    render(<ThemeToggle />);

    const button = screen.getByRole("button", { name: /switch to dark mode/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/user/preferences", expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ themePreference: "dark" }),
      }));
    });
  });
});
