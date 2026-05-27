"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { MoreHorizontal, ShieldAlert, CheckCircle, AlertOctagon, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Log {
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

interface ModerationTableProps {
    logs: Log[];
    onActionSuccess: () => void;
}

export default function ModerationTable({ logs, onActionSuccess }: ModerationTableProps) {
    const [actionLog, setActionLog] = useState<{ log: Log, action: "warn" | "block" } | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleAction = async (logId: number, userEmail: string, action: string) => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/moderation/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ logId, userEmail, action }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Action failed");

            toast.success(data.message);
            onActionSuccess();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
            setActionLog(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "pending": return <Badge variant="secondary">Pending</Badge>;
            case "reviewed": return <Badge variant="outline">Reviewed</Badge>;
            case "dismissed": return <Badge variant="outline" className="text-muted-foreground">Dismissed</Badge>;
            case "warned": return <Badge variant="destructive" className="bg-yellow-500 hover:bg-yellow-600">Warned</Badge>;
            case "blocked": return <Badge variant="destructive">Blocked</Badge>;
            default: return <Badge variant="outline" className="capitalize">{status}</Badge>;
        }
    };

    if (logs.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 border rounded-lg bg-card text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No flagged content found</h3>
                <p className="text-sm text-muted-foreground">The community is currently safe and clean.</p>
            </div>
        );
    }

    return (
        <div className="border rounded-md overflow-x-auto w-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Snippet</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.map((log) => (
                        <TableRow key={log.id}>
                            <TableCell>
                                <div className="font-medium">{log.userName || "Unknown"}</div>
                                <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                                {log.isBlocked && <Badge variant="destructive" className="text-[10px] px-1 py-0 mt-1">Blocked</Badge>}
                                {log.violationCount && log.violationCount > 0 ? (
                                    <div className="text-xs text-yellow-600 mt-1">{log.violationCount} Strikes</div>
                                ) : null}
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize">{log.violationType}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate" title={log.reason}>
                                {log.reason}
                            </TableCell>
                            <TableCell className="max-w-[250px]">
                                <div className="text-sm text-muted-foreground line-clamp-2" title={log.contentSnippet || ""}>
                                    {log.contentSnippet || "No snippet"}
                                </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                                {format(new Date(log.createdAt), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                                {getStatusBadge(log.status)}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={() => handleAction(log.id, log.userEmail, "dismiss")}
                                            disabled={log.status === "dismissed" || isLoading}
                                        >
                                            <Info className="mr-2 h-4 w-4 text-muted-foreground" />
                                            Dismiss Flag
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem 
                                            className="text-yellow-600 focus:text-yellow-600"
                                            disabled={log.status === "warned" || log.isBlocked || isLoading}
                                            onClick={() => setActionLog({ log, action: "warn" })}
                                        >
                                            <AlertOctagon className="mr-2 h-4 w-4" />
                                            Warn User
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                            className="text-destructive focus:text-destructive"
                                            disabled={log.status === "blocked" || log.isBlocked || isLoading}
                                            onClick={() => setActionLog({ log, action: "block" })}
                                        >
                                            <ShieldAlert className="mr-2 h-4 w-4" />
                                            Block User
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <AlertDialog open={!!actionLog} onOpenChange={() => setActionLog(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {actionLog?.action === "warn" 
                                ? `This will send a warning email to ${actionLog.log.userEmail} and increment their violation count. Strike ${((actionLog.log.violationCount || 0) + 1)}/3.`
                                : `This will block ${actionLog?.log.userEmail} from accessing the platform. The duration depends on their previous blocks.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={(e) => {
                                e.preventDefault();
                                if (actionLog) {
                                    handleAction(actionLog.log.id, actionLog.log.userEmail, actionLog.action);
                                }
                            }}
                            className={actionLog?.action === "warn" ? "bg-yellow-600 hover:bg-yellow-700" : "bg-destructive hover:bg-destructive/90"}
                            disabled={isLoading}
                        >
                            {isLoading ? "Processing..." : actionLog?.action === "warn" ? "Send Warning" : "Block User"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
