export function getSafeErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { message: String(error) };
  }

  const candidate = error as {
    message?: unknown;
    status?: unknown;
    code?: unknown;
    response?: { status?: unknown };
  };

  return {
    message:
      typeof candidate.message === "string" ? candidate.message : undefined,
    status:
      typeof candidate.status === "number"
        ? candidate.status
        : typeof candidate.response?.status === "number"
          ? candidate.response.status
          : undefined,
    code: typeof candidate.code === "string" ? candidate.code : undefined,
  };
}
