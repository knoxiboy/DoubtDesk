"use client"

import Link from "next/link"
import { SignUp } from "@clerk/nextjs"
import { useTheme } from "next-themes"
import { dark } from "@clerk/themes"

export default function Page() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black p-4 gap-6 transition-colors duration-500">
      
      <Link
        href="/"
        className="text-sm font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        &larr; Back to Home
      </Link>

      <SignUp
        appearance={{
          baseTheme: isDark ? dark : undefined,
          elements: {
            card: isDark
              ? "bg-zinc-950 border border-zinc-900 shadow-2xl rounded-2xl"
              : "bg-white border border-slate-200 shadow-xl rounded-2xl",

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
  );
}
