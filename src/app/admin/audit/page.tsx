"use client";

import { useEffect, useState } from "react";
import AuditLogTable from "@/components/admin/AuditLogTable";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

export default function AdminAuditPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/audit?page=${page}&limit=20`);

            if (res.redirected && res.url.includes('/403')) {
                window.location.href = '/403';
                return;
            }
            if (!res.ok) {
                if (res.status === 403) {
                    window.location.href = '/403';
                    return;
                }
                throw new Error("Failed to fetch audit logs");
            }
            const json = await res.json();
            setData(json);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page]);

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-destructive">
                <p className="text-lg font-semibold">Error loading audit logs</p>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <FileText className="w-8 h-8 text-primary" />
                    Audit Logs
                </h1>
                <p className="text-muted-foreground mt-2">
                    Track administrative and moderation actions for accountability.
                </p>
            </div>

            {loading && !data ? (
                <div className="space-y-6">
                    <Skeleton className="h-[400px] w-full" />
                </div>
            ) : data && (
                <>
                    <div className="bg-card text-card-foreground shadow-sm rounded-lg border">
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-4">Recent Actions</h2>
                            <AuditLogTable logs={data.logs} />

                            {data.pagination.total > data.pagination.limit && (
                                <div className="flex items-center justify-end space-x-2 py-4">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        aria-label="Previous page"
                                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                                    >
                                        Previous
                                    </button>
                                    <div className="text-sm text-muted-foreground">
                                        Page {page} of {Math.ceil(data.pagination.total / data.pagination.limit)}
                                    </div>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page >= Math.ceil(data.pagination.total / data.pagination.limit)}
                                        aria-label="Next page"
                                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}