"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";
import { ArrowLeft } from "lucide-react";
import { BACK_TO_HOME_LABEL } from "@/lib/constants";

/**
 * Renders the Sign Up page for user authentication.
 * 
 * This component provides the registration interface using Clerk's `<SignUp />` component.
 * It includes a theme-aware background, decorative gradients, and waits for client-side
 * hydration to prevent theme flickering for dark mode users.
 * 
 * @returns {JSX.Element | null} The rendered sign-up page or null before hydration.
 */
export default function SignUpPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-black p-4 relative overflow-hidden transition-colors duration-500">
      {/* Decorative Aurora Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[300px] bg-gradient-to-b from-blue-500/10 dark:from-blue-500/5 to-transparent blur-3xl pointer-events-none z-0" />
      
      <div className="relative z-10 gap-6 w-full max-w-md">
    <div className="relative">
      
      <Link
        href="/"
        className="absolute top-6 left-8 z-50 text-sm font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        &larr; Back to Home
      </Link>
      <SignUp
        appearance={{
          baseTheme: isDark ? dark : undefined,
          elements: {
            card: isDark
              ? "bg-zinc-950 border border-zinc-900 shadow-2xl rounded-2xl pt-16 pb-8 px-8"
              : "bg-white border border-slate-200 shadow-xl rounded-2xl pt-16 pb-8 px-8",

            headerTitle: isDark ? "text-white" : "text-slate-900",
            headerSubtitle: isDark ? "text-zinc-400" : "text-slate-500",
            formFieldLabel: isDark ? "text-zinc-300" : "text-slate-700",
            
            formFieldInput: isDark
              ? "bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700 focus:ring-0"
              : "bg-white border-slate-200 text-slate-900 focus:border-slate-400 focus:ring-0",

            formFieldInputShowHideButton: isDark
              ? "text-zinc-400 hover:text-white"
              : "text-slate-400 hover:text-slate-900",

            socialButtonsBlockButton: isDark
              ? "bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800"
              : "bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100",

            formButtonPrimary: isDark
              ? "bg-white text-black hover:bg-zinc-200"
              : "bg-slate-900 text-white hover:bg-slate-800",

            footerActionText: isDark ? "text-zinc-400" : "text-slate-500",
            footerActionLink: isDark ? "text-blue-400" : "text-blue-600",
          },
        }}
      />
    </div>
    </div>
    </div>
  );
}
