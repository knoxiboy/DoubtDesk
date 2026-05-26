"use client";

import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { dark } from "@clerk/themes";

export default function Page() {
  const { theme } = useTheme();

  return (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">

    <Link
      href="/"
      className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
    >
      &larr; Back to Home
    </Link>

    <SignUp
        appearance={{
          baseTheme: theme === "dark" ? dark : undefined,
          elements: {
            card:
              theme === "dark"
                ? "bg-[#020617] border border-white/10 shadow-2xl rounded-3xl"
                : "bg-white border border-slate-200 shadow-2xl rounded-3xl",

            headerTitle:
              theme === "dark"
                ? "text-white"
                : "text-slate-900",

            headerSubtitle:
              theme === "dark"
                ? "text-slate-400"
                : "text-slate-500",

            formFieldLabel:
              theme === "dark"
                ? "text-slate-300"
                : "text-slate-700",

            formFieldInput:
              theme === "dark"
                ? "bg-white/5 border-white/10 text-white"
                : "bg-white border-slate-300 text-slate-900",

            footerActionText:
              theme === "dark"
                ? "text-slate-400"
                : "text-slate-500",

            footerActionLink:
              theme === "dark"
                ? "text-blue-400"
                : "text-blue-600",
          },
        }}
      />
    </div>
  );
}