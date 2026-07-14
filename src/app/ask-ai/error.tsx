"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";

export default function AskAIError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DoubtDesk] AI Solver error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20">
          <AlertCircle className="h-8 w-8 text-purple-500 dark:text-purple-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            AI Solver hit a snag
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
            The AI assistant encountered an error. This might be a temporary issue — please try again.
          </p>
        </div>

        {error.digest && (
          <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-600">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
