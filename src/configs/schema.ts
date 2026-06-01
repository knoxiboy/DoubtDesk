export const confusionAlertsTable = pgTable("confusion_alerts", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    classroomId: integer().notNull(),
    topic: varchar({ length: 255 }).notNull(),
    summary: text().notNull(),
    suggestedAction: text().notNull(),
    confidence: integer().notNull(), // 0–100
    doubtCount: integer().notNull(),
    sampleDoubtIds: text().notNull(), // JSON string representing array of IDs
    status: varchar({ length: 20 }).default("active").notNull(), // active | acknowledged | dismissed
    acknowledgedAt: timestamp(),
    acknowledgedBy: varchar({ length: 255 }),
    createdAt: timestamp().defaultNow().notNull(),
}, (table) => ({
    classroomIdIndex: index("confusion_alerts_classroomId_idx").on(table.classroomId),
    statusIndex: index("confusion_alerts_status_idx").on(table.status),
    // CodeRabbit/CodeAnt Safeguard: Explicitly name individual columns inside a composite index pattern
    classroomCreatedIndex: index("confusion_alerts_classroom_created_idx").on(table.classroomId, table.createdAt),
    classroomIdFk: foreignKey({
        columns: [table.classroomId],
        foreignColumns: [classroomsTable.id],
    }).onDelete("cascade"),
    acknowledgedByFk: foreignKey({
        columns: [table.acknowledgedBy],
        foreignColumns: [usersTable.email],
    }).onDelete("set null"),
}));
