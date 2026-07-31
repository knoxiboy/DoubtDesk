import Groq from "groq-sdk";

/**
 * Centralized Groq client.
 *
 * Every route/module that needs Groq should import `groq` from here instead
 * of constructing its own client. This guarantees that if GROQ_API_KEY is
 * missing, the app fails fast with a clear error at initialization time
 * instead of silently constructing a client with a "dummy_key" fallback
 * that only surfaces as an opaque API error once a real request is made.
 */
function validateApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to your .env file (see .env.example) before starting the app."
    );
  }
  return apiKey;
}

const isNextBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

let initialGroq: Groq | null = null;
if (process.env.GROQ_API_KEY) {
  initialGroq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} else if (!isNextBuildPhase) {
  validateApiKey();
}

export function getGroqClient(): Groq {
  if (initialGroq) return initialGroq;
  const apiKey = validateApiKey();
  return new Groq({ apiKey });
}

export const groq = new Proxy({} as Groq, {
  get(_target, prop: keyof Groq) {
    const client = getGroqClient();
    const value = client[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

