"use client";

import { ErrorState } from "@/components/common/ErrorState";

type AskAiErrorProps = {
  error: Error;
  reset: () => void;
};

export default function AskAiError({ error, reset }: AskAiErrorProps) {
  return (
    <ErrorState
      title="Ask AI ran into a problem"
      description="The assistant view failed to recover cleanly. Retry the request or head back to the AI solver page."
      homeHref="/ask-ai"
      homeLabel="Open Ask AI"
      error={error}
      reset={reset}
    />
  );
}
