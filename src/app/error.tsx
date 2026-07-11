"use client";

import { ErrorState } from "@/components/common/ErrorState";

type RootErrorProps = {
  error: Error;
  reset: () => void;
};

export default function RootError({ error, reset }: RootErrorProps) {
  return (
    <ErrorState
      title="DoubtDesk hit a runtime error"
      description="We could not finish loading this part of the app. Try again, or return to the dashboard and continue from there."
      homeHref="/dashboard"
      homeLabel="Go to dashboard"
      error={error}
      reset={reset}
    />
  );
}
