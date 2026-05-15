import { integer, pgTable, varchar, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

/**
 * Users table storing core user profiles.
 * Includes moderation states (violationCount, blockedUntil) for safety enforcement.
 */
export const usersTable = pgTable("users", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
    university: varchar({ length: 255 }),
    year: varchar({ length: 50 }),
    collegeEmail: varchar({ length: 255 }),
    role: varchar({ length: 20 }), // 'student', 'teacher', 'admin'
    onboarded: boolean().default(false),
    violationCount: integer().default(0).notNull(),
    isBlocked: boolean().default(false).notNull(),
    blockedUntil: timestamp(),
    blockCount: integer().default(0).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
});

/**
 * Classrooms created by teachers to group students and doubts.
 */
export const classroomsTable = pgTable("classrooms", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    university: varchar({ length: 255 }).notNull(),
    year: varchar({ length: 50 }).notNull(),
    teacherEmail: varchar({ length: 255 }).notNull(),
    inviteCode: varchar({ length: 10 }).notNull().unique(),
    createdAt: timestamp().defaultNow().notNull(),
});

/**
 * Junction table for Many-to-Many relationship between Users and Classrooms.
 */
export const membershipsTable = pgTable("memberships", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    classroomId: integer().notNull(),
    role: varchar({ length: 20 }).notNull(), // 'student', 'teacher', 'admin'
    joinedAt: timestamp().defaultNow().notNull(),
}, (table) => {
    return {
        userEmailIndex: index("userEmail_idx").on(table.userEmail),
        classroomIdIndex: index("classroomId_idx").on(table.classroomId),
    };
});

/**
 * Chat history for persistent AI Tutor sessions.
 * Allows students to continue conversations with the AI.
 */
export const chatHistoryTable = pgTable("chat_history", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    chatId: varchar({ length: 255 }).notNull(), // Unique ID for each session
    chatTitle: varchar({ length: 255 }), // Optional title for the block
    userEmail: varchar({ length: 255 }).notNull(),
    role: varchar({ length: 20 }).notNull(),
    content: text().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
});

export const roadmapsTable = pgTable("roadmaps", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    targetField: varchar({ length: 255 }).notNull(),
    roadmapData: text().notNull(), // Store JSON as string
    createdAt: timestamp().defaultNow().notNull(),
});

export const coverLettersTable = pgTable("cover_letters", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    jobDescription: text().notNull(),
    userDetails: text().notNull(),
    coverLetter: text().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
});

export const resumeAnalysisTable = pgTable("resume_analysis", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    resumeText: text().notNull(),
    jobDescription: text(),
    analysisData: text().notNull(), // Store JSON string
    resumeName: varchar({ length: 255 }), // Name of the uploaded file
    createdAt: timestamp().defaultNow().notNull(),
});

export const sharedChatsTable = pgTable("shared_chats", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    chatId: varchar({ length: 255 }).notNull().unique(),
    createdAt: timestamp().defaultNow().notNull(),
});

export const resumesTable = pgTable("resumes", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    resumeName: varchar({ length: 255 }).notNull(),
    resumeData: text().notNull(), // Store full JSON data
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().notNull(),
});

/**
 * Core Doubts table.
 * Stores questions asked by students, their categorization, and resolution status.
 * Can be public or linked to a specific classroom.
 */
export const doubtsTable = pgTable("doubts", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userName: varchar({ length: 255 }).notNull(), // Randomly generated Student_XXX
    userEmail: varchar({ length: 255 }), // Secure owner identification
    classroomId: integer(), // Null for public, or ID for classroom-specific
    subject: varchar({ length: 100 }).notNull(), // Math, Physics, Programming, Others
    subTopic: varchar({ length: 255 }), // Granular topic detected by AI
    content: text(),
    imageUrl: text(),
    likes: integer().default(0),
    isSolved: varchar({ length: 20 }).default("unsolved"), // unsolved, solved
    solvedReplyId: integer(), // ID of the specific reply that solved it
    type: varchar({ length: 20 }).default("community"), // 'ai', 'community', 'teacher'
    isPinned: boolean().default(false),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => {
    return {
        classroomIdIndex: index("doubt_classroomId_idx").on(table.classroomId),
        typeIndex: index("type_idx").on(table.type),
        subjectIndex: index("subject_idx").on(table.subject),
    };
});

export const likesTable = pgTable("likes", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userName: varchar({ length: 255 }).notNull(),
    doubtId: integer().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
});

/**
 * Replies to doubts.
 * Can be community comments or verified AI/Teacher solutions.
 */
export const repliesTable = pgTable("replies", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    doubtId: integer().notNull(),
    userName: varchar({ length: 255 }).notNull(),
    type: varchar({ length: 20 }).notNull(), // 'comment' or 'solution'
    content: text(),
    imageUrl: text(),
    upvotes: integer().default(0).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    doubtIdIndex: index("doubtId_idx").on(table.doubtId),
}));

export const replyLikesTable = pgTable("reply_likes", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userName: varchar({ length: 255 }).notNull(),
    replyId: integer().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
});

/**
 * Audit log for AI moderation actions.
 * Tracks flagged content snippets and reasons for future review by admins.
 */
export const moderationLogsTable = pgTable("moderation_logs", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    reason: text().notNull(),
    violationType: varchar({ length: 50 }).notNull(), // 'abusive', 'off-topic', etc.
    contentSnippet: text(),
    createdAt: timestamp().defaultNow().notNull(),
});

export const bookmarksTable = pgTable("bookmarks", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    doubtId: integer().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    userEmailIndex: index("bookmark_userEmail_idx").on(table.userEmail),
    doubtIdIndex: index("bookmark_doubtId_idx").on(table.doubtId),
}));
