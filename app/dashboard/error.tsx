"use client";

import { ErrorFallback } from "@/components/ErrorFallback";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Dashboard could not load"
      description="We had trouble loading your dashboard data. Try again to refresh this view."
      error={error}
      reset={reset}
    />
  );
}
