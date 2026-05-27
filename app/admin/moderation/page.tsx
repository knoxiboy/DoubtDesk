"use client";

import { useEffect, useState } from "react";
import ModerationAnalytics from "@/components/admin/ModerationAnalytics";
import ModerationTable from "@/components/admin/ModerationTable";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck } from "lucide-react";

export default function AdminModerationPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/moderation?page=${page}&limit=20`);
            
            if (res.redirected && res.url.includes('/403')) {
                window.location.href = '/403';
                return;
            }
            if (!res.ok) {
                if (res.status === 403) {
                    window.location.href = '/403';
                    return;
                }
                throw new Error("Failed to fetch moderation data");
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
                <p className="text-lg font-semibold">Error loading dashboard</p>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <ShieldCheck className="w-8 h-8 text-primary" />
                    Moderation Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                    Review flagged content, monitor community health, and manage user violations.
                </p>
            </div>

            {loading && !data ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Skeleton className="h-[120px] w-full" />
                        <Skeleton className="h-[120px] w-full" />
                        <Skeleton className="h-[120px] w-full" />
                        <Skeleton className="h-[120px] w-full" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-[300px] w-full" />
                        <Skeleton className="h-[300px] w-full" />
                    </div>
                    <Skeleton className="h-[400px] w-full" />
                </div>
            ) : data && (
                <>
                    <ModerationAnalytics stats={data.stats} />
                    <div className="bg-card text-card-foreground shadow-sm rounded-lg border">
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-4">Recent Flags</h2>
                            <ModerationTable logs={data.logs} onActionSuccess={fetchData} />
                            
                            {data.pagination.total > data.pagination.limit && (
                                <div className="flex items-center justify-end space-x-2 py-4">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
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
