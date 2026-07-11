"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type EmptyStatePanelProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  secondaryLabel?: string;
};

export function EmptyStatePanel({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  secondaryLabel,
}: EmptyStatePanelProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-50/70 px-6 py-10 text-center shadow-sm dark:border-white/10 dark:bg-white/5 sm:px-10 sm:py-12">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <Icon className="h-8 w-8" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {title}
          </h2>
          <p className="mx-auto max-w-lg text-sm leading-6 text-slate-600 dark:text-zinc-400">
            {description}
          </p>
        </div>

        {actionLabel ? (
          actionHref ? (
            <Button asChild>
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : (
            <Button onClick={onAction}>{actionLabel}</Button>
          )
        ) : null}

        {secondaryLabel ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400 dark:text-zinc-500">
            {secondaryLabel}
          </p>
        ) : null}
      </div>
    </section>
  );
}
