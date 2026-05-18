"use client";

import { MessageSquare, Loader2, ChevronDown } from "lucide-react";
import DoubtCard from "@/components/DoubtCard";
import useSWRInfinite from "swr/infinite";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface InfiniteDoubtFeedProps {
    classroomId?: number;
    subject?: string;
    type?: string;
    tag?: string;
    isSolved?: string;
    role?: string;
    onViewAISolution?: (doubt: any) => void;
    emptyMessage?: string;
    emptyAction?: () => void;
    emptyActionLabel?: string;
}

const PAGE_SIZE = 10;

export default function InfiniteDoubtFeed({
    classroomId,
    subject,
    type = 'community',
    tag,
    isSolved,
    role,
    onViewAISolution,
    emptyMessage = "No doubts found.",
    emptyAction,
    emptyActionLabel
}: InfiniteDoubtFeedProps) {
    const getKey = (pageIndex: number, previousPageData: any) => {
        if (previousPageData && !previousPageData.pagination?.hasMore) return null;


        const params = new URLSearchParams();
        const userName = typeof window !== 'undefined' ? localStorage.getItem("anonymous_user") : null;


        if (classroomId) params.append("classroomId", classroomId.toString());
        if (subject && subject !== "All") params.append("subject", subject);
        if (type) params.append("type", type);
        if (tag && tag !== "All") params.append("tag", tag);
        if (isSolved) params.append("isSolved", isSolved);
        if (userName) params.append("userName", userName);

        params.append("limit", PAGE_SIZE.toString());
        params.append("offset", (pageIndex * PAGE_SIZE).toString());

        return `/api/doubts?${params.toString()}`;
    };

    const { data, size, setSize, isLoading, isValidating, mutate } = useSWRInfinite(getKey, fetcher, {
        revalidateFirstPage: false
    });

    const doubts = data ? data.flatMap((page) => page?.doubts ?? []) : [];
    const isEmpty = data?.[0]?.doubts?.length === 0 || data?.[0]?.error !== undefined;
    const isReachingEnd = isEmpty || (data && !data[data.length - 1]?.pagination?.hasMore);
    const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");

    if (isLoading && doubts.length === 0) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (isEmpty) {
        return (
            <div className="py-24 text-center space-y-4 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem]">
                <MessageSquare className="w-12 h-12 text-slate-700 mx-auto" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">{emptyMessage}</p>
                {emptyAction && (
                    <button
                        onClick={emptyAction}
                        className="text-blue-500 font-black uppercase tracking-widest text-[10px] hover:underline underline-offset-4"
                    >
                        {emptyActionLabel}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {doubts.map((doubt: any) => (
                    <DoubtCard
                        key={doubt.id}
                        doubt={doubt}
                        role={role}
                        onUpdate={() => mutate()}
                        onViewAISolution={onViewAISolution}
                    />
                ))}
            </div>

            {/* Pagination Control */}
            <div className="py-10 flex flex-col items-center gap-4">
                {!isReachingEnd ? (
                    <button
                        onClick={() => setSize(size + 1)}
                        disabled={isLoadingMore || isValidating}
                        className="group flex items-center gap-3 px-8 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-blue-500/30 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoadingMore || isValidating ? (
                            <>
                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                <span>Syncing Data...</span>
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4 text-blue-500 group-hover:translate-y-0.5 transition-transform" />
                                <span>Load More Doubts</span>
                            </>
                        )}
                    </button>
                ) : (
                    doubts.length > 0 && (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-2"></div>
                            <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.4em]">Vault Fully Synchronized</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
