type RecommendationInput = {
    universityMatch: boolean;
    yearMatch: boolean;
    roleMatch: boolean;
    memberCount: number;
    activityCount: number;
    alreadyJoined?: boolean;
    isInactive?: boolean;
};

export function calculateRecommendationScore({
    universityMatch,
    yearMatch,
    roleMatch,
    memberCount,
    activityCount,
    alreadyJoined = false,
    isInactive = false,
}: RecommendationInput) {
    // Prevent recommending classrooms user already joined
    if (alreadyJoined) {
        return -1;
    }

    let score = 0;

    /**
     * PERSONALIZATION
     * Highest priority
     */
    if (universityMatch) score += 40;
    if (yearMatch) score += 25;
    if (roleMatch) score += 15;

    /**
     * POPULARITY SIGNAL
     * Prevent massive classrooms from dominating
     */
    score += Math.min(memberCount * 2, 10);

    /**
     * ACTIVITY SIGNAL
     * Encourages active communities
     */
    score += Math.min(activityCount * 3, 10);

    /**
     * INACTIVE CLASSROOM PENALTY
     */
    if (isInactive) {
        score -= 20;
    }

    return score;
}