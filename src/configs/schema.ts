// configs/schema.ts
import { integer, pgTable, varchar, text, timestamp, boolean, index, uniqueIndex, foreignKey, unique } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
    university: varchar({ length: 255 }),
    year: varchar({ length: 50 }),
    collegeEmail: varchar({ length: 255 }),
    role: varchar({ length: 20 }),
    onboarded: boolean().default(false),
    violationCount: integer().default(0).notNull(),
    isBlocked: boolean().default(false).notNull(),
    blockedUntil: timestamp(),
    blockCount: integer().default(0).notNull(),
    emailNotificationsEnabled: boolean().default(true).notNull(),
    notificationPreference: varchar({ length: 50 }).default("instant").notNull(),
    themePreference: varchar({ length: 10 }).default("system").notNull(),
    // ── Karma System ──────────────────────────────────────────────────────────
    karmaScore: integer().default(0).notNull(),         // total reputation points
    karmaLevel: integer().default(1).notNull(),          // 1 = Newbie … 5 = Legend
    lastActiveDate: timestamp(),                         // Keep for general login tracking if needed
    lastContributionAt: timestamp(),                     // FIX: For genuine streak tracking (real user actions)
    currentStreak: integer().default(0).notNull(),       // consecutive active days
    // ─────────────────────────────────────────────────────────────────────────
    createdAt: timestamp().defaultNow().notNull(),
});

export const classroomsTable = pgTable("classrooms", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar({ length: 255 }).notNull(),
    university: varchar({ length: 255 }).notNull(),
    year: varchar({ length: 50 }).notNull(),
    teacherEmail: varchar({ length: 255 }).notNull(),
    inviteCode: varchar({ length: 10 }).notNull().unique(),
    createdAt: timestamp().defaultNow().notNull(),
});

export const membershipsTable = pgTable("memberships", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    classroomId: integer().notNull(),
    role: varchar({ length: 20 }).notNull(),
    joinedAt: timestamp().defaultNow().notNull(),
}, (table) => {
    return {
        userEmailIndex: index("userEmail_idx").on(table.userEmail),
        classroomIdIndex: index("classroomId_idx").on(table.classroomId),
        userEmailFk: foreignKey({
            columns: [table.userEmail],
            foreignColumns: [usersTable.email],
        }).onDelete("cascade"),
        classroomIdFk: foreignKey({
            columns: [table.classroomId],
            foreignColumns: [classroomsTable.id],
        }).onDelete("cascade"),
        membershipUnique: unique("memberships_userEmail_classroomId_unique").on(table.userEmail, table.classroomId),
    };
});

export const chatHistoryTable = pgTable("chat_history", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    chatId: varchar({ length: 255 }).notNull(),
    chatTitle: varchar({ length: 255 }),
    userEmail: varchar({ length: 255 }).notNull(),
    role: varchar({ length: 20 }).notNull(),
    content: text().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    chatIdIndex: index("chatHistory_chatId_idx").on(table.chatId),
    userIdFk: foreignKey({
        columns: [table.userEmail],
        foreignColumns: [usersTable.email],
    }).onDelete("cascade"),
}));

export const roadmapsTable = pgTable("roadmaps", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    targetField: varchar({ length: 255 }).notNull(),
    roadmapData: text().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
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
    analysisData: text().notNull(),
    resumeName: varchar({ length: 255 }),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
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
    resumeData: text().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    userIdFk: foreignKey({
        columns: [table.userEmail],
        foreignColumns: [usersTable.email],
    }).onDelete("cascade"),
    userEmailResumeNameUnique: unique("resumes_userEmail_resumeName_unique").on(table.userEmail, table.resumeName),
}));

export const doubtsTable = pgTable("doubts", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userName: varchar({ length: 255 }).notNull(),
    userEmail: varchar({ length: 255 }),
    classroomId: integer(),
    subject: varchar({ length: 100 }).notNull(),
    subTopic: varchar({ length: 255 }),
    content: text(),
    imageUrl: text(),
    likes: integer().default(0),
    isSolved: varchar({ length: 20 }).default("unsolved"),
    solvedReplyId: integer(),
    type: varchar({ length: 20 }).default("community"),
    isPinned: boolean().default(false),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => {
    return {
        classroomIdIndex: index("doubt_classroomId_idx").on(table.classroomId),
        typeIndex: index("type_idx").on(table.type),
        subjectIndex: index("subject_idx").on(table.subject),
        userEmailFk: foreignKey({
            columns: [table.userEmail],
            foreignColumns: [usersTable.email],
        }).onDelete("set null"),
        classroomIdFk: foreignKey({
            columns: [table.classroomId],
            foreignColumns: [classroomsTable.id],
        }).onDelete("set null"),
    };
});

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

export const repliesTable = pgTable("replies", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    doubtId: integer("doubt_id").notNull(),
    userName: varchar("user_name", { length: 255 }).notNull(),
    userEmail: varchar("user_email", { length: 255 }),
    type: varchar("type", { length: 20 }).notNull(),
    content: text("content"),
    imageUrl: text("image_url"),
    upvotes: integer("upvotes").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
    doubtIdIndex: index("doubtId_idx").on(table.doubtId),
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
    doubtIdFk: foreignKey({
        columns: [table.doubtId],
        foreignColumns: [doubtsTable.id],
    }).onDelete("cascade"),
    userNameDoubtUnique: unique("likes_userName_doubtId_unique").on(table.userName, table.doubtId),
}));

export const replyLikesTable = pgTable("reply_likes", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userName: varchar({ length: 255 }).notNull(),
    replyId: integer().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    replyIdFk: foreignKey({
        columns: [table.replyId],
        foreignColumns: [repliesTable.id],
        }).onDelete("cascade"),
    userNameReplyUnique: unique("reply_likes_userName_replyId_unique").on(table.userName, table.replyId),
}));

export const moderationLogsTable = pgTable("moderation_logs", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    reason: text().notNull(),
    violationType: varchar({ length: 50 }).notNull(),
    contentSnippet: text(),
    status: varchar({ length: 20 }).default("pending").notNull(),
    createdAt: timestamp().defaultNow().notNull(),
});

export const bookmarksTable = pgTable(
    "bookmarks",
    {
        id: integer().primaryKey().generatedAlwaysAsIdentity(),
        userEmail: varchar({ length: 255 }).notNull(),
        doubtId: integer().notNull(),
        createdAt: timestamp().defaultNow().notNull(),
    },
    (table) => ({
        userEmailIndex: index("bookmark_userEmail_idx").on(table.userEmail),
        doubtIdIndex: index("bookmark_doubtId_idx").on(table.doubtId),
        userEmailFk: foreignKey({
            columns: [table.userEmail],
            foreignColumns: [usersTable.email],
        }).onDelete("cascade"),
        doubtIdFk: foreignKey({
            columns: [table.doubtId],
            foreignColumns: [doubtsTable.id],
        }).onDelete("cascade"),
        uniqueBookmark: unique("bookmarks_userEmail_doubtId_unique").on(table.userEmail, table.doubtId),
    })
);

export const notificationsTable = pgTable("notifications", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    message: text().notNull(),
    link: text(),
    type: varchar({ length: 50 }).notNull(),
    isRead: boolean().default(false).notNull(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    userEmailIndex: index("notification_userEmail_idx").on(table.userEmail),
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

// ═══════════════════════════════════════════════════════════════════
//  KARMA SYSTEM TABLES
// ═══════════════════════════════════════════════════════════════════

export const karmaTransactionsTable = pgTable("karma_transactions", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    points: integer().notNull(),
    eventType: varchar({ length: 50 }).notNull(),
    replyId: integer(),
    doubtId: integer(),
    note: text(),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    userEmailIndex: index("karma_tx_userEmail_idx").on(table.userEmail),
    eventTypeIndex: index("karma_tx_eventType_idx").on(table.eventType),
    userEmailFk: foreignKey({
        columns: [table.userEmail],
        foreignColumns: [usersTable.email],
    }).onDelete("cascade"),
    replyIdFk: foreignKey({
        columns: [table.replyId],
        foreignColumns: [repliesTable.id],
    }).onDelete("set null"),
    doubtIdFk: foreignKey({
        columns: [table.doubtId],
        foreignColumns: [doubtsTable.id],
    }).onDelete("set null"),
}));

export const badgeDefinitionsTable = pgTable("badge_definitions", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    slug: varchar({ length: 80 }).notNull().unique(),
    name: varchar({ length: 120 }).notNull(),
    description: text().notNull(),
    icon: varchar({ length: 10 }).notNull(),
    condition: text().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
});

export const userBadgesTable = pgTable("user_badges", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userEmail: varchar({ length: 255 }).notNull(),
    badgeId: integer().notNull(),
    awardedAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    userEmailIndex: index("user_badge_userEmail_idx").on(table.userEmail),
    badgeIdIndex: index("user_badge_badgeId_idx").on(table.badgeId),
    userEmailFk: foreignKey({
        columns: [table.userEmail],
        foreignColumns: [usersTable.email],
    }).onDelete("cascade"),
    badgeIdFk: foreignKey({
        columns: [table.badgeId],
        foreignColumns: [badgeDefinitionsTable.id],
    }).onDelete("cascade"),
    uniqueUserBadge: unique("user_badges_userEmail_badgeId_unique").on(table.userEmail, table.badgeId),
}));