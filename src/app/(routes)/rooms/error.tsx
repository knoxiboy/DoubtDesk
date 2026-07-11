"use client";

import { ErrorState } from "@/components/common/ErrorState";

type RoomsErrorProps = {
  error: Error;
  reset: () => void;
};

export default function RoomsError({ error, reset }: RoomsErrorProps) {
  return (
    <ErrorState
      title="Classrooms could not finish loading"
      description="Something interrupted the rooms experience. Try again or go back to the dashboard and reopen the classroom list."
      homeHref="/dashboard"
      homeLabel="Go to dashboard"
      error={error}
      reset={reset}
    />
  );
}
