export const MIN_EASE_FACTOR = 1.3;
export const DEFAULT_EASE_FACTOR = 2.5;
export const INCORRECT_INTERVAL_DAYS = 1;

export interface ReviewState {
    intervalDays: number;
    easeFactor: number;
}

export interface NextReview extends ReviewState {
    nextReviewAt: Date;
}

export function computeNextReview(
    prev: ReviewState,
    wasCorrect: boolean,
    now: Date = new Date()
): NextReview {
    let { intervalDays, easeFactor } = prev;

    if (wasCorrect) {
        intervalDays = intervalDays <= 0 ? 1 : Math.round(intervalDays * easeFactor);
        easeFactor = Math.max(MIN_EASE_FACTOR, roundToTenth(easeFactor + 0.1));
    } else {
        intervalDays = INCORRECT_INTERVAL_DAYS;
        easeFactor = Math.max(MIN_EASE_FACTOR, roundToTenth(easeFactor - 0.2));
    }

    const nextReviewAt = new Date(now);
    nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

    return { intervalDays, easeFactor, nextReviewAt };
}

function roundToTenth(n: number): number {
    return Math.round(n * 10) / 10;
}