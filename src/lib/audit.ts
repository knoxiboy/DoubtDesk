import { db } from "@/configs/db";
import { auditLogsTable } from "@/configs/schema";

export const AUDIT_ACTIONS = {
    // Moderation actions
    MODERATION_DISMISSED: "MODERATION_DISMISSED",
    USER_WARNED: "USER_WARNED",
    USER_BLOCKED: "USER_BLOCKED",
    // Content actions
    DOUBT_DELETED: "DOUBT_DELETED",
    DOUBT_EDITED: "DOUBT_EDITED",
    DOUBT_SOLVED: "DOUBT_SOLVED",
    DOUBT_PINNED: "DOUBT_PINNED",
    DOUBT_UNPINNED: "DOUBT_UNPINNED",
    REPLY_DELETED: "REPLY_DELETED",
    REPLY_EDITED: "REPLY_EDITED",
    // Classroom actions
    CLASSROOM_ROLE_CHANGED: "CLASSROOM_ROLE_CHANGED",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditLogPayload = {
    actorEmail: string;
    targetEmail?: string | null;
    action: AuditAction;
    resourceType: string;
    resourceId?: string | number | null;
    metadata?: Record<string, unknown>;
};

export async function auditLog(payload: AuditLogPayload): Promise<void> {
    try {
        await db.insert(auditLogsTable).values({
            actorEmail: payload.actorEmail,
            targetEmail: payload.targetEmail,
            action: payload.action,
            resourceType: payload.resourceType,
            resourceId: payload.resourceId != null ? String(payload.resourceId) : null,
            metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
        });
    } catch (error) {
        console.error("Audit log failed:", error);
    }
}