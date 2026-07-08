"use client";

import { format } from "date-fns";
import { AlertCircle, FileText, User, Shield } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface AuditLog {
    id: number;
    actorEmail: string;
    targetEmail: string | null;
    action: string;
    resourceType: string;
    resourceId: string | null;
    metadata: string | null;
    createdAt: Date | string;
    actorName: string | null;
}

interface AuditLogTableProps {
    logs: AuditLog[];
}

export default function AuditLogTable({ logs }: AuditLogTableProps) {
    const getActionBadge = (action: string) => {
        const styles: Record<string, string> = {
            MODERATION_DISMISSED: "bg-blue-500/10 text-blue-600",
            USER_WARNED: "bg-yellow-500/10 text-yellow-600",
            USER_BLOCKED: "bg-red-500/10 text-red-600",
            DOUBT_DELETED: "bg-red-500/10 text-red-600",
            DOUBT_EDITED: "bg-blue-500/10 text-blue-600",
            DOUBT_SOLVED: "bg-green-500/10 text-green-600",
            DOUBT_PINNED: "bg-purple-500/10 text-purple-600",
            DOUBT_UNPINNED: "bg-gray-500/10 text-gray-600",
            REPLY_DELETED: "bg-red-500/10 text-red-600",
            REPLY_EDITED: "bg-blue-500/10 text-blue-600",
            CLASSROOM_ROLE_CHANGED: "bg-indigo-500/10 text-indigo-600",
        };
        return styles[action] || "bg-gray-500/10 text-gray-600";
    };

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-card text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No audit logs found</h3>
                <p className="text-sm text-muted-foreground">No actions have been logged yet.</p>
            </div>
        );
    }

    return (
        <div className="border rounded-md overflow-x-auto w-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Actor</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Metadata</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.map((log) => (
                        <TableRow key={log.id}>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <div className="font-medium">{log.actorName || log.actorEmail}</div>
                                        <div className="text-xs text-muted-foreground">{log.actorEmail}</div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${getActionBadge(log.action)}`}>
                                    {log.action.replace(/_/g, " ")}
                                </span>
                            </TableCell>
                            <TableCell>
                                <div className="text-sm">
                                    <div>{log.resourceType}</div>
                                    {log.resourceId && <div className="text-muted-foreground">ID: {log.resourceId}</div>}
                                </div>
                            </TableCell>
                            <TableCell>
                                {log.targetEmail ? (
                                    <div className="flex items-center gap-1 text-sm">
                                        <User className="h-3 w-3" />
                                        {log.targetEmail}
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground">-</span>
                                )}
                            </TableCell>
                            <TableCell>
                                {log.metadata ? (
                                    <pre className="text-xs bg-muted p-2 rounded max-w-xs overflow-x-auto">
                                        {JSON.stringify(JSON.parse(log.metadata), null, 2)}
                                    </pre>
                                ) : (
                                    <span className="text-muted-foreground">-</span>
                                )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                                {format(new Date(log.createdAt), "MMM d, yyyy HH:mm")}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}