"use client";

import { ErrorState } from "@/components/common/ErrorState";

type ProfileErrorProps = {
  error: Error;
  reset: () => void;
};

export default function ProfileError({ error, reset }: ProfileErrorProps) {
  return (
    <ErrorState
      title="Profile loading failed"
      description="We could not finish rendering your profile details. Retry the page or return to the dashboard."
      homeHref="/dashboard"
      homeLabel="Go to dashboard"
      error={error}
      reset={reset}
    />
  );
}
