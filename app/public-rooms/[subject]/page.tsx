"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Zap, MessageSquare, Plus, Loader2 } from "lucide-react";
import AskDoubt from "@/components/AskDoubt";
import DoubtCard from "@/components/DoubtCard";
import useSWRInfinite from "swr/infinite";
import { useInView } from "react-intersection-observer";

export default function PublicRoomPage() {
    const params = useParams();
    const subject = params.subject as string;
    const [isAskModalOpen, setIsAskModalOpen] = useState(false);

    const fetcher = (url: string) => fetch(url).then(res => res.json());
    const getKey = (pageIndex: number, previousPageData: any[]) => {
        if (previousPageData && !previousPageData.length) return null;
        return `/api/doubts?subject=${subject}&page=${pageIndex + 1}&limit=20`;
    };

    const { data, isLoading, size, setSize, mutate } = useSWRInfinite(getKey, fetcher, {
        revalidateFirstPage: false
    });

    const doubts = data ? [].concat(...data) : [];
    const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
    const isReachingEnd = data && data[data.length - 1]?.length < 20;

    const { ref: loadMoreRef, inView } = useInView();

    useEffect(() => {
        if (inView && !isReachingEnd && !isLoadingMore) {
            setSize(size + 1);
        }
    }, [inView, isReachingEnd, isLoadingMore]);

    return (
        <div className="p-6 md:p-12 space-y-8 max-w-7xl mx-auto pb-24">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
                <div className="space-y-1">
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">
                        {subject}<span className="text-blue-500"> Room</span>
                    </h1>
                    <p className="text-slate-400 text-lg font-medium tracking-tight">
                        Ask and answer doubts anonymously in the <span className="text-blue-400/80 font-bold capitalize">{subject}</span> community.
                    </p>
                </div>
                <button 
                    onClick={() => setIsAskModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Ask a Doubt
                </button>
            </header>

            {isLoading && doubts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Doubts...</p>
                </div>
            ) : doubts.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {doubts.map((doubt: any) => (
                            <DoubtCard key={doubt.id} doubt={doubt} onUpdate={() => mutate()} />
                        ))}
                    </div>
                    <div ref={loadMoreRef} className="py-8 flex justify-center">
                        {isLoadingMore && <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.02] text-center px-6">
                    <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mb-6">
                        <MessageSquare className="w-10 h-10 text-blue-500/50" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">No doubts yet!</h2>
                    <p className="text-slate-500 max-w-sm mx-auto mb-8">
                        Be the first to start a conversation in the {subject} room. All posts are anonymous.
                    </p>
                    <button 
                        onClick={() => setIsAskModalOpen(true)}
                        className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold transition-all"
                    >
                        Post the first doubt
                    </button>
                </div>
            )}

            {isAskModalOpen && (
                <AskDoubt 
                    defaultSubject={subject} 
                    isOpen={isAskModalOpen} 
                    onClose={() => setIsAskModalOpen(false)} 
                    onSuccess={() => {
                        setIsAskModalOpen(false);
                        mutate();
                    }}
                />
            )}
        </div>
    );
}
