"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

type ErrorStateProps = {
  title: string;
  description: string;
  homeHref: string;
  homeLabel: string;
  error: Error;
  reset: () => void;
};

export function ErrorState({
  title,
  description,
  homeHref,
  homeLabel,
  error,
  reset,
}: ErrorStateProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-[100dvh] bg-slate-50 px-6 py-10 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-2xl items-center justify-center">
        <section className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900 sm:p-10">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-zinc-400">
                Application Error
              </p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {title}
              </h1>
              <p className="max-w-xl text-sm leading-6 text-slate-600 dark:text-zinc-400">
                {description}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-zinc-400">
            {error.message}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button onClick={reset} className="sm:w-auto">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
            <Button asChild variant="outline" className="sm:w-auto">
              <Link href={homeHref}>
                <Home className="h-4 w-4" aria-hidden="true" />
                {homeLabel}
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
