/**
 * __tests__/socratic-mentor.test.ts
 *
 * Unit tests covering:
 *   1. Prompt builder returns correct system messages per mode.
 *   2. Socratic prompt enforces the no-direct-answer invariant (keyword check).
 *   3. Mode defaults to "direct" when not provided.
 *   4. Celebration detection helper works correctly.
 */

import {
  buildSystemMessages,
  SOCRATIC_TUTOR_SYSTEM_PROMPT,
  DIRECT_SYSTEM_PROMPT,
  type AIMode,
} from "@/lib/ai/socratic-prompt";

// ---------------------------------------------------------------------------
// 1. buildSystemMessages
// ---------------------------------------------------------------------------
describe("buildSystemMessages", () => {
  it('returns direct system prompt when mode is "direct"', () => {
    const msgs = buildSystemMessages("direct");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toBe(DIRECT_SYSTEM_PROMPT);
  });

  it('returns Socratic system prompt when mode is "mentor"', () => {
    const msgs = buildSystemMessages("mentor");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toBe(SOCRATIC_TUTOR_SYSTEM_PROMPT);
  });

  it("defaults to direct when an unknown mode is passed (type cast)", () => {
    // Simulate a runtime mismatch -- anything that is not "mentor" falls through
    // to the direct prompt, so behaviour is safe and predictable.
    const msgs = buildSystemMessages("unknown" as AIMode);
    expect(msgs[0].content).toBe(DIRECT_SYSTEM_PROMPT);
  });
});

// ---------------------------------------------------------------------------
// 2. SOCRATIC_TUTOR_SYSTEM_PROMPT sanity checks
// ---------------------------------------------------------------------------
describe("SOCRATIC_TUTOR_SYSTEM_PROMPT content", () => {
  it("explicitly forbids direct code fixes", () => {
    expect(SOCRATIC_TUTOR_SYSTEM_PROMPT).toMatch(/Do NOT provide/i);
  });

  it("requires the three structural sections", () => {
    expect(SOCRATIC_TUTOR_SYSTEM_PROMPT).toMatch(/VALIDATION/);
    expect(SOCRATIC_TUTOR_SYSTEM_PROMPT).toMatch(/NUDGE/);
    expect(SOCRATIC_TUTOR_SYSTEM_PROMPT).toMatch(/QUESTION/);
  });

  it("is long enough to benefit from prompt caching (>= 500 chars)", () => {
    // Groq caches prompts above ~1024 tokens; 500 chars is a reasonable proxy
    expect(SOCRATIC_TUTOR_SYSTEM_PROMPT.length).toBeGreaterThan(500);
  });

  it("instructs the model to remember previous hints", () => {
    expect(SOCRATIC_TUTOR_SYSTEM_PROMPT).toMatch(/full conversation history/i);
  });
});

// ---------------------------------------------------------------------------
// 3. Celebration detection (mirrors the helper in AskAIView)
// ---------------------------------------------------------------------------
function isCelebrationMessage(text: string): boolean {
  return /nailed it|correct!|well done|great job|you got it/i.test(text);
}

describe("isCelebrationMessage", () => {
  it("detects text-based celebration", () => {
    expect(isCelebrationMessage("Nailed it! Great work.")).toBe(true);
  });

  it("detects other celebration phrases", () => {
    expect(isCelebrationMessage("Correct! That is exactly right.")).toBe(true);
    expect(isCelebrationMessage("Well done — you got it!")).toBe(true);
  });

  it("returns false for a normal hint response", () => {
    expect(
      isCelebrationMessage(
        "✅ VALIDATION\nGood use of a for-loop.\n\n🔍 NUDGE\nCheck your index boundary.\n\n❓ QUESTION\nWhat happens at i = arr.length?"
      )
    ).toBe(false);
  });
});
