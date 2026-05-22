"use client";

import { ErrorFallback } from "@/components/ErrorFallback";

export default function RoomsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Rooms could not load"
      description="We could not load your classroom rooms right now. Try again to reload the page."
      error={error}
      reset={reset}
    />
  );
}
