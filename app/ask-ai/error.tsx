"use client";

import { ErrorFallback } from "@/components/ErrorFallback";

export default function AskAIError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="AI solver could not load"
      description="The AI workspace hit an unexpected error. Try again to restart this flow."
      error={error}
      reset={reset}
    />
  );
}
