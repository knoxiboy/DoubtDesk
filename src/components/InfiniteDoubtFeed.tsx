"use client";

import { MessageSquare, Loader2, ChevronDown } from "lucide-react";
import DoubtCard from "@/components/DoubtCard";
import useSWRInfinite from "swr/infinite";
import { Doubt } from "@/types";

const fetcher = async (url: string) => {
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`Failed to load doubts: ${res.status}`);
    }

    return res.json();
};

interface InfiniteDoubtFeedProps {
    classroomId?: number;
    subject?: string;
    type?: string;
    tag?: string;
    isSolved?: string;
    role?: string;
    onViewAISolution?: (doubt: Doubt) => void;
    emptyMessage?: string;
    emptyAction?: () => void;
    emptyActionLabel?: string;
}

const PAGE_SIZE = 10;
const FAILED_LOAD_TEXT = "Failed to load doubts.";
const RETRY_TEXT = "Retry";
const SYNCING_TEXT = "Syncing Data...";
const LOAD_MORE_TEXT = "Load More Doubts";
const LOADING_MORE_ARIA_LABEL = "Loading more doubts";
const LOAD_MORE_ARIA_LABEL = "Load more doubts";
const VAULT_SYNCED_TEXT = "Vault Fully Synchronized";

/**
 * Normalizes either the current raw array response from /api/doubts or a
 * paginated { doubts, pagination, error } response into one page shape.
 */
const normalizePage = (page: any) => {
    if (Array.isArray(page)) {
        return {
            doubts: page,
            hasMore: page.length === PAGE_SIZE,
            error: undefined,
        };
    }

    return {
        doubts: page?.doubts ?? [],
        hasMore: page?.hasMore ?? Boolean(page?.pagination?.hasMore),
        error: page?.error,
    };
};

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
        if (previousPageData && !normalizePage(previousPageData).hasMore) return null;


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

    const { data, error, size, setSize, isLoading, isValidating, mutate } = useSWRInfinite(getKey, fetcher, {
        revalidateFirstPage: false
    });

    const pages = data?.map(normalizePage);
    const doubts = pages ? pages.flatMap((page) => page.doubts) : [];
    const isPageError = pages?.[0]?.error !== undefined;
    const isEmpty = !error && !isPageError && pages?.[0]?.doubts.length === 0;
    const isReachingEnd = isEmpty || (pages && !pages[pages.length - 1]?.hasMore);
    const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
    const hasLoadError = Boolean(error || isPageError);

    if (hasLoadError) {
        return (
            <div className="py-24 text-center space-y-4 bg-red-50 dark:bg-red-900/10 border border-dashed border-red-200 dark:border-red-800/30 rounded-[2.5rem]">
                <MessageSquare className="w-12 h-12 text-red-600 dark:text-red-400 mx-auto" />
                <p className="text-red-600 dark:text-red-400 font-bold uppercase tracking-widest text-xs">{FAILED_LOAD_TEXT}</p>
                <button
                    onClick={() => mutate()}
                    className="text-red-600 dark:text-red-400 font-black uppercase tracking-widest text-[10px] hover:underline underline-offset-4"
                >
                    {RETRY_TEXT}
                </button>
            </div>
        );
    }

    if (isLoading && doubts.length === 0) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (isEmpty) {
        return (
            <div className="py-24 text-center space-y-4 bg-slate-100 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 rounded-[2.5rem]">
                <MessageSquare className="w-12 h-12 text-slate-700 mx-auto" />
                <p className="text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest text-xs">{emptyMessage}</p>
                {emptyAction && (
                    <button
                        onClick={emptyAction}
                        className="text-blue-500 font-black uppercase tracking-widest text-[10px] hover:underline underline-offset-4"
                     aria-label="Interactive button">
                        {emptyActionLabel}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {doubts.map((doubt: Doubt, index: number) => (
                    <DoubtCard
                        key={`${doubt.id}-${index}`}
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
                        aria-label={isLoadingMore || isValidating ? LOADING_MORE_ARIA_LABEL : LOAD_MORE_ARIA_LABEL}
                        className="group flex items-center gap-3 px-8 py-3.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 hover:border-blue-500/30 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoadingMore || isValidating ? (
                            <>
                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                <span>{SYNCING_TEXT}</span>
                            </>
                        ) : (
                            <>
                                <ChevronDown className="w-4 h-4 text-blue-500 group-hover:translate-y-0.5 transition-transform" />
                                <span>{LOAD_MORE_TEXT}</span>
                            </>
                        )}
                    </button>
                ) : (
                    doubts.length > 0 && (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-[1px] bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-2"></div>
                            <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.4em]">{VAULT_SYNCED_TEXT}</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
