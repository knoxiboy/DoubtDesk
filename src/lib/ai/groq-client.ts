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
if (!process.env.GROQ_API_KEY) {
  throw new Error(
    "GROQ_API_KEY is not set. Add it to your .env file (see .env.example) before starting the app."
  );
}

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
