import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Header from "@/components/layout/Header";
import { useRouter, usePathname } from "next/navigation";
import { useAppUser } from "@/app/provider";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock @clerk/nextjs
jest.mock("@clerk/nextjs", () => ({
  SignedIn: ({ children }: any) => <div data-testid="signed-in">{children}</div>,
  SignedOut: ({ children }: any) => <div data-testid="signed-out">{children}</div>,
  UserButton: () => <div data-testid="user-button" />,
}));

// Mock app provider
jest.mock("@/app/provider", () => ({
  useAppUser: jest.fn(),
}));

// Mock ThemeToggle to keep tests focused
jest.mock("@/components/layout/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href, onClick, className }: any) => {
    return (
      <a href={href} onClick={onClick} className={className}>
        {children}
      </a>
    );
  };
});

describe("Header", () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (usePathname as jest.Mock).mockReturnValue("/");
    (useAppUser as jest.Mock).mockReturnValue({ appUser: null });
    // Mock window.history.length to enable back button by default
    jest.spyOn(window.history, 'length', 'get').mockReturnValue(2);
    
    // Mock matchMedia for scrollToSection
    window.matchMedia = window.matchMedia || function() {
      return {
        matches: false,
        media: "",
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders correctly", () => {
    render(<Header />);
    expect(screen.getByText("DoubtDesk")).toBeInTheDocument();
    expect(screen.getAllByTestId("theme-toggle")).toHaveLength(2); // desktop and mobile
  });

  it("handles back button click", () => {
    (usePathname as jest.Mock).mockReturnValue("/dashboard");
    render(<Header />);
    const backButton = screen.getAllByRole("button", { name: /go back/i })[0];
    expect(backButton).not.toBeDisabled();
    fireEvent.click(backButton);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("disables back button if history is empty", () => {
    (usePathname as jest.Mock).mockReturnValue("/dashboard");
    jest.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    render(<Header />);
    const backButton = screen.getAllByRole("button", { name: /go back/i })[0];
    expect(backButton).toBeDisabled();
  });

  it("renders admin link if user is admin", () => {
    (useAppUser as jest.Mock).mockReturnValue({ appUser: { role: "admin" } });
    render(<Header />);
    const adminLinks = screen.getAllByText("Admin");
    expect(adminLinks.length).toBeGreaterThan(0);
  });

  it("handles scroll navigation on same page", () => {
    render(<Header />);
    const link = screen.getAllByText("How it works")[0];
    
    // Mock window.scrollTo
    const mockScrollTo = jest.fn();
    window.scrollTo = mockScrollTo;

    // Mock getElementById
    const mockElement = { getBoundingClientRect: () => ({ top: 500 }) };
    jest.spyOn(document, 'getElementById').mockReturnValue(mockElement as any);

    fireEvent.click(link);
    
    expect(document.getElementById).toHaveBeenCalledWith("how-it-works");
    expect(mockScrollTo).toHaveBeenCalled();
  });

  it("handles scroll navigation from different page", () => {
    (usePathname as jest.Mock).mockReturnValue("/faq");
    render(<Header />);
    
    const link = screen.getAllByText("How it works")[0];
    fireEvent.click(link);
    
    expect(mockRouter.push).toHaveBeenCalledWith("/#how-it-works");
  });

  it("toggles mobile menu", () => {
    (usePathname as jest.Mock).mockReturnValue("/dashboard");
    render(<Header />);
    const toggleButton = screen.getByRole("button", { name: /toggle navigation menu/i });
    
    fireEvent.click(toggleButton);
    expect(screen.getAllByText("Back")[0]).toBeInTheDocument();
  });
});
