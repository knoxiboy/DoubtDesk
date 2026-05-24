/**
 * TypeScript interfaces for the Profile feature.
 * Derived from the database schema (configs/schema.ts) and the /api/profile response.
 */

// ─── Database Row Types ─────────────────────────────────────────────────────

/** A doubt posted by the user. Maps to the `doubts` table. */
export interface ProfileDoubt {
    id: number;
    userName: string;
    userEmail: string | null;
    classroomId: number | null;
    subject: string;
    subTopic: string | null;
    content: string | null;
    imageUrl: string | null;
    likes: number | null;
    isSolved: string | null;
    solvedReplyId: number | null;
    type: string | null;
    createdAt: string;
}

/** A reply authored by the user. Maps to the `replies` table. */
export interface ProfileReply {
    id: number;
    doubtId: number;
    userName: string;
    userEmail: string | null;
    type: string;
    content: string | null;
    imageUrl: string | null;
    createdAt: string;
}

/** A classroom the user belongs to. Maps to the `classrooms` table. */
export interface ProfileClassroom {
    id: number;
    name: string;
    university: string;
    year: string;
    teacherEmail: string;
    inviteCode: string;
    createdAt: Date | string;
}

/** User info returned by the profile API (merged from Clerk + DB). */
export interface ProfileUser {
    id: number;
    name: string;
    email: string;
    university: string | null;
    year: string | null;
    collegeEmail: string | null;
    role: string | null;
    onboarded: boolean | null;
    imageUrl: string;
    joinDate: string;
    emailNotificationsEnabled?: boolean;
    notificationPreference?: "instant" | "daily" | "weekly" | "none";
    createdAt: string;
}

/** Aggregated stats shown on the profile page. */
export interface ProfileStats {
    totalDoubts: number;
    totalReplies: number;
    helpfulVotes: number;
    classroomsCount: number;
}

/** The user's recent activity, grouped by type. */
export interface ProfileActivities {
    doubts: ProfileDoubt[];
    replies: ProfileReply[];
    classrooms: ProfileClassroom[];
}

/** Top-level response shape from GET /api/profile. */
export interface ProfileData {
    user: ProfileUser;
    stats: ProfileStats;
    activities: ProfileActivities;
}
