import {
    computeNextReview,
    DEFAULT_EASE_FACTOR,
    MIN_EASE_FACTOR,
} from "@/lib/spaced-repetition";

describe("computeNextReview", () => {
    const now = new Date("2026-08-14T00:00:00.000Z");

    it("schedules 1 day out on first correct answer (interval was 0)", () => {
        const result = computeNextReview(
            { intervalDays: 0, easeFactor: DEFAULT_EASE_FACTOR },
            true,
            now
        );
        expect(result.intervalDays).toBe(1);
        expect(result.easeFactor).toBeCloseTo(2.6, 5);
        expect(result.nextReviewAt.toISOString()).toBe("2026-08-15T00:00:00.000Z");
    });

    it("grows interval by ease factor on repeated correct answers", () => {
        const result = computeNextReview(
            { intervalDays: 6, easeFactor: 2.5 },
            true,
            now
        );
        expect(result.intervalDays).toBe(15);
    });

    it("resets interval to 1 day on incorrect answer", () => {
        const result = computeNextReview(
            { intervalDays: 20, easeFactor: 2.8 },
            false,
            now
        );
        expect(result.intervalDays).toBe(1);
        expect(result.easeFactor).toBeCloseTo(2.6, 5);
    });

    it("floors ease factor at MIN_EASE_FACTOR after repeated failures", () => {
        let state = { intervalDays: 5, easeFactor: 1.4 };
        state = computeNextReview(state, false, now);
        state = computeNextReview(state, false, now);
        expect(state.easeFactor).toBeGreaterThanOrEqual(MIN_EASE_FACTOR);
        expect(state.easeFactor).toBeCloseTo(MIN_EASE_FACTOR, 5);
    });
});