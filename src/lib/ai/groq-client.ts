import Groq from "groq-sdk";

/**
 * Centralized Groq client.
 *
 * Every route/module that needs Groq should import `groq` from here instead
 * of constructing its own client.
 */
const apiKey = process.env.GROQ_API_KEY || "gsk_placeholder_key_for_build";

export const groq = new Groq({ apiKey });
