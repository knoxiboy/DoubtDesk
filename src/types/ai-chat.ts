/**
 * types/ai-chat.ts
 *
 * Shared TypeScript interfaces used across the AI Solver feature.
 */

/** The two operating modes for the AI assistant. */
export type AIMode = "direct" | "mentor";

/** A single message in the conversation history. */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Shape of the request body sent to POST /api/ask-ai */
export interface AskAIRequestBody {
  /** The current user message. */
  message: string;
  /** Full conversation history EXCLUDING the current message. */
  history: ChatMessage[];
  /** Which mode the user has selected. */
  mode: AIMode;
}

/** Shape of the successful JSON response from POST /api/ask-ai */
export interface AskAIResponse {
  reply: string;
  mode: AIMode;
  /** Whether Groq reported a cache hit (for dev logging). */
  cached?: boolean;
}
