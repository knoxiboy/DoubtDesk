import { integer, pgTable, varchar, text, timestamp, boolean, index, uniqueIndex, foreignKey, unique } from "drizzle-orm/pg-core";

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
    emailNotificationsEnabled: boolean().default(true).notNull(),
    notificationPreference: varchar({ length: 50 }).default("instant").notNull(),
    themePreference: varchar({ length: 10 }).default("system").notNull(),
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
 *
 * Foreign keys:
 *   - memberships.userEmail   → users.email      (CASCADE: remove membership when user is deleted)
 *   - memberships.classroomId → classrooms.id    (CASCADE: remove membership when classroom is deleted)
 *
 * Unique: a user can only have one membership per classroom.
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
        /** Remove membership records when the referenced user is deleted. */
        userEmailFk: foreignKey({
            columns: [table.userEmail],
            foreignColumns: [usersTable.email],
        }).onDelete("cascade"),
        /** Remove membership records when the referenced classroom is deleted. */
        classroomIdFk: foreignKey({
            columns: [table.classroomId],
            foreignColumns: [classroomsTable.id],
        }).onDelete("cascade"),
        /** A user can only have one membership per classroom. */
        membershipUnique: unique("memberships_userEmail_classroomId_unique").on(table.userEmail, table.classroomId),
    };
});

/**
 * Chat history for persistent AI Tutor sessions.
 * Allows students to continue conversations with the AI.
 *
 * Foreign key: userEmail → users.email (CASCADE DELETE).
 */
export const chatHistoryTable = pgTable("chat_history", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    chatId: varchar({ length: 255 }).notNull(), // Unique ID for each session
    chatTitle: varchar({ length: 255 }), // Optional title for the block
    userEmail: varchar({ length: 255 }).notNull(),
    role: varchar({ length: 20 }).notNull(),
    content: text().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    chatIdIndex: index("chatHistory_chatId_idx").on(table.chatId),
    /** Remove chat history when the referenced user is deleted. */
    userIdFk: foreignKey({
        columns: [table.userEmail],
        foreignColumns: [usersTable.email],
    }).onDelete("cascade"),
}));

export const roadmapsTable = pgTable("roadmaps", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    targetField: varchar({ length: 255 }).notNull(),
    roadmapData: text().notNull(), // Store JSON as string
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    /** Remove roadmaps when the referenced user is deleted. */
    userIdFk: foreignKey({
        columns: [table.userEmail],
        foreignColumns: [usersTable.email],
    }).onDelete("cascade"),
}));

export const coverLettersTable = pgTable("cover_letters", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    jobDescription: text().notNull(),
    userDetails: text().notNull(),
    coverLetter: text().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    /** Remove cover letters when the referenced user is deleted. */
    userIdFk: foreignKey({
        columns: [table.userEmail],
        foreignColumns: [usersTable.email],
    }).onDelete("cascade"),
}));

export const resumeAnalysisTable = pgTable("resume_analysis", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    resumeText: text().notNull(),
    jobDescription: text(),
    analysisData: text().notNull(), // Store JSON string
    resumeName: varchar({ length: 255 }), // Name of the uploaded file
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    /** Remove resume analyses when the referenced user is deleted. */
    userIdFk: foreignKey({
        columns: [table.userEmail],
        foreignColumns: [usersTable.email],
    }).onDelete("cascade"),
}));

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
}, (table) => ({
    /** Remove resumes when the referenced user is deleted. */
    userIdFk: foreignKey({
        columns: [table.userEmail],
        foreignColumns: [usersTable.email],
    }).onDelete("cascade"),
    /** A user cannot upload two resumes with the same filename. */
    userEmailResumeNameUnique: unique("resumes_userEmail_resumeName_unique").on(table.userEmail, table.resumeName),
}));

/**
 * Core Doubts table.
 * Stores questions asked by students, their categorisation, and resolution status.
 * Can be public or linked to a specific classroom.
 *
 * Foreign keys (declared inline to avoid a circular type-cycle between `doubtsTable`
 * and `repliesTable` in strict-TS):
 *   - userEmail   → users.email     (SET NULL: anonymise author if their account is deleted)
 *   - classroomId → classrooms.id   (SET NULL: keep the doubt public when its classroom is deleted)
 *
 * Note: `solvedReplyId` → `replies.id` (SET NULL) is intentionally omitted from the
 * inline call-back because `repliesTable` is defined later in this same file.
 * TypeScript forbids a strict-mode `const` from being referenced in its own initializer.
 * This FK can be added safely in a future migration without touching application code.
 */
export const doubtsTable = pgTable("doubts", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userName: varchar({ length: 255 }).notNull(), // Randomly generated Student_XXX
    userEmail: varchar({ length: 255 }),           // Secure owner identification
    classroomId: integer(),                         // Null for public, or ID for classroom-specific
    subject: varchar({ length: 100 }).notNull(),    // Math, Physics, Programming, Others
    subTopic: varchar({ length: 255 }),             // Granular topic detected by AI
    content: text(),
    imageUrl: text(),
    likes: integer().default(0),
    isSolved: varchar({ length: 20 }).default("unsolved"), // unsolved | in-progress | solved : see lib/doubtStatus.ts
    solvedReplyId: integer(),                       // ID of the specific reply that solved it
    type: varchar({ length: 20 }).default("community"),    // 'ai', 'community', 'teacher'
    isPinned: boolean().default(false),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => {
    return {
        classroomIdIndex: index("doubt_classroomId_idx").on(table.classroomId),
        typeIndex: index("type_idx").on(table.type),
        subjectIndex: index("subject_idx").on(table.subject),
        /** Anonymise the doubt author if their account is deleted. */
        userEmailFk: foreignKey({
            columns: [table.userEmail],
            foreignColumns: [usersTable.email],
        }).onDelete("set null"),
        /** Keep the doubt public when its classroom is deleted. */
        classroomIdFk: foreignKey({
            columns: [table.classroomId],
            foreignColumns: [classroomsTable.id],
        }).onDelete("set null"),
    };
});

/**
 * Classroom-aware tags that can be attached to doubts.
 * Public tags have a null classroomId; classroom tags are scoped to one room.
 */
export const tagsTable = pgTable("tags", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 80 }).notNull(),
    normalizedName: varchar({ length: 80 }).notNull(),
    classroomId: integer(),
    createdByEmail: varchar({ length: 255 }),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    classroomIdIndex: index("tag_classroomId_idx").on(table.classroomId),
    normalizedNameIndex: uniqueIndex("tag_scope_name_idx").on(table.normalizedName, table.classroomId),
}));

/**
 * Many-to-many relationship between doubts and tags.
 */
export const doubtTagsTable = pgTable("doubt_tags", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    doubtId: integer().notNull(),
    tagId: integer().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    doubtIdIndex: index("doubt_tag_doubtId_idx").on(table.doubtId),
    tagIdIndex: index("doubt_tag_tagId_idx").on(table.tagId),
    uniqueDoubtTag: uniqueIndex("doubt_tag_unique_idx").on(table.doubtId, table.tagId),
}));


/**
 * Replies to doubts.
 * Can be community comments or verified AI/Teacher solutions.
 *
 * Foreign key: doubtId → doubts.id (CASCADE DELETE).
 */
export const repliesTable = pgTable("replies", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    doubtId: integer().notNull(),
    userName: varchar({ length: 255 }).notNull(),
    userEmail: varchar({ length: 255 }), // Stable identifier for the reply author
    type: varchar({ length: 20 }).notNull(), // 'comment' or 'solution'
    content: text(),
    imageUrl: text(),
    upvotes: integer().default(0).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    doubtIdIndex: index("doubtId_idx").on(table.doubtId),
    /** Remove replies when the referenced doubt is deleted. */
    doubtIdFk: foreignKey({
        columns: [table.doubtId],
        foreignColumns: [doubtsTable.id],
    }).onDelete("cascade"),
}));

export const likesTable = pgTable("likes", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userName: varchar({ length: 255 }).notNull(),
    doubtId: integer().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    /** Remove like records when the referenced doubt is deleted. */
    doubtIdFk: foreignKey({
        columns: [table.doubtId],
        foreignColumns: [doubtsTable.id],
    }).onDelete("cascade"),
    /** A user may only like a given doubt once. */
    userNameDoubtUnique: unique("likes_userName_doubtId_unique").on(table.userName, table.doubtId),
}));

export const replyLikesTable = pgTable("reply_likes", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userName: varchar({ length: 255 }).notNull(),
    replyId: integer().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    /** Remove reply-like records when the referenced reply is deleted. */
    replyIdFk: foreignKey({
        columns: [table.replyId],
        foreignColumns: [repliesTable.id],
    }).onDelete("cascade"),
    /** A user may only upvote a given reply once. */
    userNameReplyUnique: unique("reply_likes_userName_replyId_unique").on(table.userName, table.replyId),
}));

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

/**
 * In-app notifications for users.
 */
export const notificationsTable = pgTable("notifications", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    message: text().notNull(),
    link: text(), // Optional URL to navigate to when clicked
    type: varchar({ length: 50 }).notNull(), // e.g., 'reply', 'doubt_solved', 'new_member'
    isRead: boolean().default(false).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    userEmailIndex: index("notification_userEmail_idx").on(table.userEmail),
    /** Remove notifications when the referenced user is deleted. */
    userEmailFk: foreignKey({
        columns: [table.userEmail],
        foreignColumns: [usersTable.email],
    }).onDelete("cascade"),
}));
export const pendingNotificationsTable = pgTable("pending_notifications", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    doubtId: integer().notNull(),
    replyId: integer().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => {
    return {
        userEmailIdx: index("pending_notifications_user_email_idx").on(table.userEmail),
        /** Remove pending notifications when user, doubt, or reply is deleted. */
        userEmailFk: foreignKey({
            columns: [table.userEmail],
            foreignColumns: [usersTable.email],
        }).onDelete("cascade"),
        doubtIdFk: foreignKey({
            columns: [table.doubtId],
            foreignColumns: [doubtsTable.id],
        }).onDelete("cascade"),
        replyIdFk: foreignKey({
            columns: [table.replyId],
            foreignColumns: [repliesTable.id],
        }).onDelete("cascade"),
    };
});
