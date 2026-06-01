// Roadmap Types
export interface Milestone {
    week: string;
    goal: string;
    topics: string[];
    resources: string[];
    detailedSteps: string[];
}

export interface RoadmapResult {
    id?: number;
    title: string;
    description: string;
    milestones: Milestone[];
    tips: string[];
    createdAt?: string;
    targetField?: string;
}

export interface RoadmapItem {
    id: number;
    targetField: string;
    createdAt: string;
    roadmapData: RoadmapResult;
}

// Resume Analysis Types
export interface AnalysisResult {
    score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    improvementPoints: string[];
    missingKeywords: string[];
    sectionwiseAnalysis?: Record<string, string>;
    scoreBreakdown?: {
        skills: number;
        projects: number;
        experience: number;
        ats: number;
        impact: number;
        industryFit: number;
    };

}

export interface ResumeAnalysisItem {
    id: number;
    resumeText: string;
    jobDescription: string | null;
    analysisData: AnalysisResult;
    resumeName: string | null;
    createdAt: string;
}

// Cover Letter Types
export interface CoverLetterItem {
    id: number;
    jobDescription: string;
    userDetails: string;
    coverLetter: string;
    createdAt: string;
}

// Chat Types
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

export interface ChatItem {
    chatId: string;
    chatTitle: string;
    createdAt: string;
}

// Resume Builder Types
export interface PersonalInfo {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    linkedin?: string;
    github?: string;
    leetcode?: string;
    portfolio?: string;
    summary: string;
}

export interface Education {
    institution: string;
    degree: string;
    location: string;
    startDate: string;
    endDate: string;
    cgpa?: string;
    description?: string;
}

export interface Experience {
    company: string;
    role: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
}

export interface Skill {
    category: string;
    skills: string[];
}

export interface Project {
    title: string;
    link?: string;
    description: string;
    technologies: string[];
}

export interface CustomSubItem {
    title?: string;
    subtitle?: string;
    date?: string;
    location?: string;
    description: string;
}

export interface CustomSection {
    id: string;
    title: string;
    items: CustomSubItem[];
}

export interface ResumeData {
    personalInfo: PersonalInfo;
    education: Education[];
    experience: Experience[];
    skills: Skill[];
    projects: Project[];
    honors?: string[];
    customSections?: CustomSection[];
    template: string;
}

export interface ResumeItem {
    id: number;
    userEmail: string;
    resumeName: string;
    resumeData: ResumeData;
    createdAt: string;
    updatedAt: string;
}

// Core Database Entity Types

/** User profile entity as stored in the database */
export interface User {
    id: number;
    name: string;
    email: string;
    university?: string | null;
    year?: string | null;
    collegeEmail?: string | null;
    role?: "student" | "teacher" | "admin" | null;
    onboarded: boolean;
    violationCount: number;
    isBlocked: boolean;
    blockedUntil?: Date | null;
    blockCount: number;
    emailNotificationsEnabled: boolean;
    notificationPreference: "instant" | "daily" | "weekly" | "none";
    themePreference: "light" | "dark" | "system";
    createdAt: Date | string;
}

/** Classroom entity as stored in the database */
export interface Classroom {
    id: number;
    name: string;
    university: string;
    year: string;
    teacherEmail: string;
    inviteCode: string;
    createdAt: Date | string;
}

/** Classroom membership entity */
export interface Membership {
    id: number;
    userEmail: string;
    classroomId: number;
    role: "student" | "teacher" | "admin";
    joinedAt: Date | string;
}

/** Doubt (question) entity as stored in the database */
export interface Doubt {
    id: number;
    userName: string;
    userEmail?: string | null;
    classroomId?: number | null;
    subject: string;
    subTopic?: string | null;
    content?: string | null;
    imageUrl?: string | null;
    likes: number | null;
    isSolved: "unsolved" | "in-progress" | "solved";
    solvedReplyId?: number | null;
    type: "ai" | "community" | "teacher";
    isPinned: boolean | null;
    isPendingSync?: boolean;
    createdAt: Date | string;
}

/** Type for a doubt record with simplified fields */
export type DoubtRecord = {
    isSolved: string | null;
    type: string | null;
} & Omit<Doubt, "isSolved" | "type">;


/** Reply to a doubt entity */
export interface Reply {
    id: number;
    doubtId: number;
    userName: string;
    userEmail?: string | null;
    type: "comment" | "solution";
    content?: string | null;
    imageUrl?: string | null;
    upvotes: number | null;
    createdAt: Date | string;
}

export type ReplyRecord = {
    type: string | null;
} & Omit<Reply, "type">;

/** Like on a doubt entity */
export interface Like {
    id: number;
    userName: string;
    doubtId: number;
    createdAt: Date | string;
}

/** Like on a reply entity */
export interface ReplyLike {
    id: number;
    userName: string;
    replyId: number;
    createdAt: Date | string;
}

/** Bookmark entity for saving doubts */
export interface Bookmark {
    id: number;
    userEmail: string;
    doubtId: number;
    createdAt: Date | string;
}

/** Tag for categorizing doubts */
export interface Tag {
    id: number;
    name: string;
    normalizedName: string;
    classroomId?: number | null;
    createdByEmail?: string | null;
    createdAt: Date | string;
}

/** In-app notification entity */
export interface Notification {
    id: number;
    userEmail: string;
    title: string;
    message: string;
    link?: string | null;
    type: string;
    isRead: boolean;
    createdAt: Date | string;
}

/** Moderation log entry for content safety */
export interface ModerationLog {
    id: number;
    userEmail: string;
    reason: string;
    violationType: "abusive" | "off-topic" | "spam" | "other";
    contentSnippet?: string | null;
    status: "pending" | "reviewed" | "dismissed" | "blocked" | "warned";
    createdAt: Date | string;
}

// Analytics Types

/** Single trending doubt item in analytics */
export interface TrendingDoubt {
    id: number;
    subject: string;
    content?: string | null;
    likes: number;
    replies: number;
}

/** Most asked topic in analytics */
export interface MostAskedTopic {
    topic?: string;
    subject?: string;
    count: number;
    severity?: "Low" | "Medium" | "High";
    suggestion?: string;
}

/** Weak topics that need improvement */
export interface WeakTopic {
    topic?: string;
    subject?: string;
    severity?: string;
    unsolvedCount: number;
    confidence?: string;
    reason?: string;
}

/** Solved/unsolved statistics */
export interface SolvedStat {
    status: "solved" | "in-progress" | "unsolved";
    count: number;
}

/** Peak activity time data */
export interface PeakTime {
    hour: number | string;
    count: number;
}

/** Top contributor to a classroom */
export interface TopContributor {
    userName: string;
    name?: string;
    userEmail?: string | null;
    replyCount: number;
}

/** Engagement metrics for dashboard */
export interface EngagementMetrics {
    totalStudents: number;
    totalDoubts: number;
    totalReplies: number;
}

/** Complete analytics data for dashboard */
export interface AnalyticsData {
    trendingDoubts: TrendingDoubt[];
    mostAskedTopics: MostAskedTopic[];
    weakTopics: WeakTopic[];
    solvedStats: SolvedStat[];
    peakTime: PeakTime[];
    engagement: EngagementMetrics;
    topContributors: TopContributor[];
    driftOverTime?: { date: string; gradeLevel: number }[];
}

/** Personal learning recommendations */
export interface PersonalRecommendations {
    conceptExplainer: string;
    practiceQuestions: string[];
}

/** Personal analytics data for individual student */
export interface PersonalAnalytics {
    isEngaged: boolean;
    message?: string;
    insight: string;
    weakTopics: WeakTopic[];
    recommendations: PersonalRecommendations;
}

// AI Chat Types

/** Message in AI chat conversation */
export interface AskAIMessage {
    role: "user" | "assistant";
    content: string;
    type?: "standard" | "stepwise" | "video";
}

/** AI response types */
export type SolveType = "standard" | "stepwise" | "video";

/** Request body for /api/ask-ai endpoint */
export interface AskAIRequest {
    prompt: string;
    type: SolveType;
    imageBase64?: string | null;
    history?: AskAIMessage[];
}

/** Response from /api/ask-ai endpoint */
export interface AskAIResponse {
    reply: string;
    videoUrl?: string | null;
    error?: string;
    code?: string;
}

// GitHub & External Types

/** GitHub API contributor object */
export interface GitHubContributor {
    id: number;
    login: string;
    avatar_url: string;
    html_url: string;
    contributions: number;
    type: string;
}

/** Teacher dashboard analytics - status distribution item */
export interface StatusDistribution {
    status: "solved" | "in-progress" | "unsolved";
    count: number;
}

/** Teacher dashboard analytics - subject volume item */
export interface SubjectVolume {
    subject: string;
    count: number;
}

/** Teacher dashboard analytics - topic trend */
export interface TopicTrend {
    topic: string;
    count: number;
}

/** Teacher dashboard complete analytics data */
export interface TeacherAnalyticsData {
    topTopics: TopicTrend[];
    subjectVolume: SubjectVolume[];
    statusDistribution: StatusDistribution[];
}

/** Trend data point */
export interface TrendDataPoint {
    date: string;
    count: number;
}

/** Subject analytics data */
export interface SubjectAnalytics {
    subject: string;
    count: number;
}

/** Analytics dashboard summary */
export interface AnalyticsSummary {
    totalDoubts: number;
    solvedDoubts: number;
    unsolvedDoubts: number;
    resolutionRate: number;
    activeStudents: number;
    averageResponseTime: number;
}

/** Complete analytics dashboard data */
export interface AnalyticsDashboardData {
    isDemoData: boolean;
    summary: AnalyticsSummary;
    trends: TrendDataPoint[];
    subjects: SubjectAnalytics[];
    peakHours: PeakTime[];
    classroomsList?: Classroom[];
    solvedStats?: StatusDistribution[];
}

// Other Types
export interface ModerationActionLog {
    id: number;
    userEmail: string;
    userName: string | null;
    violationCount: number | null;
    isBlocked: boolean | null;
    reason: string;
    violationType: string;
    contentSnippet: string | null;
    status: string;
    createdAt: Date | string;
}

export interface ModerationAnalyticsStats {
    totalFlags: number;
    pendingReviews: number;
    blockedUsers: number;
    flagsToday: number;

    violationCategories: {
        name: string;
        value: number | string;
    }[];

    flagsPerDay: {
        date: string;
        count: number | string;
    }[];
};
