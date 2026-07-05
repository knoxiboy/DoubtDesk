import { requireAdmin } from "@/lib/auth/requireAdmin";
import { db } from "@/configs/db";
import { auditLogsTable, usersTable } from "@/configs/schema";
import { count, eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        await requireAdmin();

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = (page - 1) * limit;

        const [totalResult] = await db.select({ value: count() }).from(auditLogsTable);
        const total = totalResult.value;

        const logs = await db.select({
            id: auditLogsTable.id,
            actorEmail: auditLogsTable.actorEmail,
            targetEmail: auditLogsTable.targetEmail,
            action: auditLogsTable.action,
            resourceType: auditLogsTable.resourceType,
            resourceId: auditLogsTable.resourceId,
            metadata: auditLogsTable.metadata,
            createdAt: auditLogsTable.createdAt,
            actorName: usersTable.name,
        })
            .from(auditLogsTable)
            .leftJoin(usersTable, eq(auditLogsTable.actorEmail, usersTable.email))
            .orderBy(desc(auditLogsTable.createdAt))
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            logs,
            pagination: {
                page,
                limit,
                total,
            },
        });
    } catch (error: any) {
        console.error("Error fetching audit logs:", error);
        if (error.message === 'NEXT_REDIRECT') {
            throw error;
        }
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}