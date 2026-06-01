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
    return <div className="min-h-screen bg-slate-50 dark:bg-black" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-black p-4 relative overflow-hidden transition-colors duration-500">
      {/* Decorative Aurora Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[300px] bg-gradient-to-b from-blue-500/10 dark:from-blue-500/5 to-transparent blur-3xl pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-md">
        {/* Navigation Action */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors duration-200 self-start ml-2 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" aria-hidden={true} focusable={false} />
          {BACK_TO_HOME_LABEL}
        </Link>

        {/* Auth Interface */}
        <div className="w-full shadow-2xl shadow-slate-200/50 dark:shadow-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SignUp
            appearance={{
              baseTheme: isDark ? dark : undefined,
              elements: {
                // Main Bounding Root Wrapper
                rootBox: "w-full flex justify-center",

                card:
                  isDark
                    ? "bg-black border border-zinc-900 shadow-none rounded-3xl w-full p-8 overflow-hidden"
                    : "bg-white border border-slate-200/80 rounded-3xl w-full p-8 overflow-hidden",

                headerTitle:
                  isDark ? "text-white font-bold tracking-tight" : "text-slate-900 font-bold tracking-tight",

                headerSubtitle:
                  isDark ? "text-zinc-400 text-sm" : "text-slate-500 text-sm",

                formFieldLabel:
                  isDark ? "text-zinc-300 font-medium" : "text-slate-700 font-medium",

                formFieldInput:
                  isDark
                    ? "bg-zinc-900/50 border-zinc-800 text-white rounded-xl focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
                    : "bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus:border-blue-600 focus:ring-blue-600/10 transition-all duration-200",

                formFieldInputShowHideButton: isDark
                  ? "text-zinc-400 hover:text-white"
                  : "text-slate-400 hover:text-slate-900",

                socialButtonsBlockButton:
                  isDark
                    ? "border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 text-white rounded-xl transition-all duration-200"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-all duration-200",

                formButtonPrimary:
                  isDark
                    ? "bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 active:scale-[0.99]"
                    : "bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 active:scale-[0.99]",

                // Enforces background unity across Clerk's structural footer wrappers
                footer:
                  isDark
                    ? "bg-black text-zinc-400 border-t border-zinc-900"
                    : "bg-white text-slate-500 border-t border-slate-100",

                footerActionText:
                  isDark ? "text-zinc-400" : "text-slate-500",

                footerActionLink:
                  "text-[hsl(var(--auth-link))] hover:text-[hsl(var(--auth-link-hover))] font-semibold transition-colors duration-200",

                dividerLine:
                  isDark ? "bg-zinc-800" : "bg-slate-100",

                dividerText:
                  isDark ? "text-zinc-500" : "text-slate-400",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
