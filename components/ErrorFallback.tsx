"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

type ErrorFallbackProps = {
  title?: string;
  description?: string;
  error: Error;
  reset: () => void;
};

export function ErrorFallback({
  title = "Something went wrong",
  description = "We could not load this part of DoubtDesk. Please try again.",
  error,
  reset,
}: ErrorFallbackProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-16 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-xl shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/30">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        <h2 className="mb-3 text-2xl font-bold">{title}</h2>
        <p className="mb-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>

        {error.message ? (
          <p className="mb-6 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {error.message}
          </p>
        ) : null}

        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
