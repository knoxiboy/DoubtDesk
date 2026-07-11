"use client";

import { ErrorState } from "@/components/common/ErrorState";

type DashboardErrorProps = {
  error: Error;
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <ErrorState
      title="Dashboard data could not be loaded"
      description="The dashboard needs another pass. Retry the page, or jump back to classrooms and try again from a known-good view."
      homeHref="/rooms"
      homeLabel="Go to classrooms"
      error={error}
      reset={reset}
    />
  );
}
