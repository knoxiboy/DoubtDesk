"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "./ThemeToggle";
import { useAppUser } from "@/app/provider";
import { Menu, X, ChevronRight, ArrowLeft } from "lucide-react";
import { scrollToSection } from "@/lib/utils/scroll-to-section";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const router = useRouter();
  const pathname = usePathname();
  const { appUser } = useAppUser();
  const showBackButton = pathname !== "/";

  // Determine if back navigation is possible
  useEffect(() => {
    setCanGoBack(window.history.length > 1);

    const handlePopState = () => {
      setCanGoBack(window.history.length > 1);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [pathname]);

  // Scroll Progress Bar
  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(Math.min(Math.max(progress, 0), 100));
    };

    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    updateScrollProgress(); // Initial calculation

    return () => window.removeEventListener("scroll", updateScrollProgress);
  }, []);

  const pageLinks = [
    { href: "#features-grid", label: "Features" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#testimonials", label: "Testimonials" },
    { href: "/ask-ai", label: "AI Solver" },
    { href: "/public-rooms", label: "Public Rooms" },
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact" },
  ];

  const handleScrollNavigation = (targetId: string) => {
    setIsOpen(false);

    if (pathname === "/") {
      scrollToSection(targetId);
    } else {
      router.push(`/#${targetId}`);
    }
  };

  const handleBackClick = () => {
    router.back();
  };

  return (
    <header className="sticky inset-x-0 top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-200 dark:border-zinc-900 transition-colors duration-500">
      <div className="max-w-7xl mx-auto h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">
        {showBackButton && (
          <button
            onClick={handleBackClick}
            className={`hidden md:flex items-center justify-center p-2 rounded-xl transition-all duration-300 flex-shrink-0 ${
              canGoBack
                ? "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer"
                : "text-slate-400 dark:text-zinc-600 opacity-50 cursor-default"
            }`}
            disabled={!canGoBack}
            aria-label="Go back"
            title="Go back to previous page"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}

        {/* Logo and Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 sm:gap-3 hover:opacity-90 transition-opacity shrink-0 group relative z-50"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <img
              src="/logo.png"
              alt="DoubtDesk logo"
              className="h-6 w-6 sm:h-7 sm:w-7 object-contain"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white drop-shadow-sm transition-colors duration-300">
            DoubtDesk
          </h1>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-4 flex-wrap">
          {pageLinks.map((link) => {
            const scrollId = link.href.startsWith("#")
              ? link.href.slice(1)
              : null;
            return scrollId ? (
              <button
                key={link.href}
                onClick={() => handleScrollNavigation(scrollId)}
                className="text-sm font-medium text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-white transition-colors duration-300 cursor-pointer bg-transparent border-0"
              >
                {link.label}
              </button>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-white transition-colors duration-300"
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Desktop Right Section */}
        <div className="hidden lg:flex items-center gap-4">
          <ThemeToggle />

          <SignedOut>
            <Link href="/sign-in">
              <button className="px-4 py-2 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 rounded-xl text-sm font-semibold border border-slate-200 dark:border-zinc-800 transition-all duration-300 hover:shadow-sm">
                Sign In
              </button>
            </Link>
            <Link href="/sign-up">
              <button className="px-4 py-2 bg-blue-600 dark:bg-[#5E8CFF] hover:bg-blue-700 dark:hover:bg-[#8BB8FF] text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/10 dark:shadow-[#5E8CFF]/10 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                Join DoubtDesk
              </button>
            </Link>
          </SignedOut>

          <SignedIn>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-white transition-colors duration-300"
            >
              Dashboard
            </Link>
            {appUser?.role === "admin" && (
              <Link
                href="/admin"
                className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline transition-colors duration-300"
              >
                Admin
              </Link>
            )}
            <Link
              href="/profile"
              className="text-sm font-medium text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-white transition-colors duration-300"
            >
              Profile
            </Link>
            {appUser?.role && (
              <span className="hidden sm:inline text-xs px-2 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 font-semibold">
                {appUser.role}
              </span>
            )}
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  userButtonAvatarBox:
                    "w-9 h-9 border border-slate-200 dark:border-zinc-800 shadow-sm",
                },
              }}
            />
          </SignedIn>
        </div>

        {/* Mobile Menu Toggle and Theme */}
        <div className="flex lg:hidden items-center gap-3 relative z-50 ml-auto">
          <ThemeToggle />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900 rounded-xl transition-colors outline-none"
            aria-label="Toggle navigation menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Scroll Progress Bar - Mid Navy Blue */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-slate-200 dark:bg-zinc-800 overflow-hidden z-50">
        <div
          className="h-full bg-[#1E40A6] dark:bg-[#3B82F6] transition-all duration-200 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 h-screen w-screen z-40 bg-white dark:bg-black transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col pt-24 px-6 pb-8 gap-8 overflow-y-auto ${
          isOpen ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        {showBackButton && (
          <div className="flex items-center gap-3 -mt-6">
            <button
              onClick={() => {
                handleBackClick();
                setIsOpen(false);
              }}
              className={`flex items-center justify-center p-2 rounded-xl transition-all duration-300 ${
                canGoBack
                  ? "text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer"
                  : "text-slate-400 dark:text-zinc-600 opacity-50 cursor-default"
              }`}
              disabled={!canGoBack}
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-500">
              Back
            </span>
          </div>
        )}

        <nav
          className="flex flex-col gap-1 w-full"
          aria-label="Mobile navigation container"
        >
          {pageLinks.map((link) => {
            const scrollId = link.href.startsWith("#")
              ? link.href.slice(1)
              : null;
            return scrollId ? (
              <button
                key={link.href}
                onClick={() => handleScrollNavigation(scrollId)}
                className="flex items-center justify-between w-full py-4 text-base font-semibold text-slate-800 dark:text-zinc-200 border-b border-slate-100 dark:border-zinc-900/60 bg-transparent border-l-0 border-r-0 border-t-0 hover:bg-slate-50 dark:hover:bg-zinc-900/30 rounded-lg px-2 transition-colors duration-300"
              >
                <span>{link.label}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between w-full py-4 text-base font-semibold text-slate-800 dark:text-zinc-200 border-b border-slate-100 dark:border-zinc-900/60"
              >
                <span>{link.label}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            );
          })}

          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between w-full py-4 text-base font-semibold text-slate-800 dark:text-zinc-200 border-b border-slate-100 dark:border-zinc-900/60"
          >
            <span>Dashboard</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>

          <Link
            href="/about"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between w-full py-4 text-base font-semibold text-slate-800 dark:text-zinc-200 border-b border-slate-100 dark:border-zinc-900/60"
          >
            <span>About</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>

          {appUser?.role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between w-full py-4 text-base font-semibold text-red-600 dark:text-red-400 border-b border-slate-100 dark:border-zinc-900/60"
            >
              <span>Admin</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </Link>
          )}
        </nav>

        <div className="mt-auto w-full flex flex-col gap-3 pb-8">
          <SignedOut>
            <Link
              href="/sign-in"
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              <button className="w-full py-3.5 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-bold bg-transparent rounded-2xl transition-all text-sm">
                Sign In
              </button>
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setIsOpen(false)}
              className="w-full"
            >
              <button className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/10 text-sm">
                Join DoubtDesk
              </button>
            </Link>
          </SignedOut>

          <SignedIn>
            <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-100 dark:border-zinc-900">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
                  Account Active
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                  Session Controls
                </span>
              </div>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonAvatarBox:
                      "w-10 h-10 border border-slate-200 dark:border-zinc-800 shadow-sm",
                  },
                }}
              />
            </div>
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
