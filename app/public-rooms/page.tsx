"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, SlidersHorizontal, Loader2 } from "lucide-react";
import AskDoubt from "@/components/AskDoubt";
import DoubtCard from "@/components/DoubtCard";
import useSWRInfinite from "swr/infinite";
import { useInView } from "react-intersection-observer";

export default function PublicRoomsPage() {
    const [isAskModalOpen, setIsAskModalOpen] = useState(false);
    const [filter, setFilter] = useState("All");
    const [customFilter, setCustomFilter] = useState("");
    const [isOthersActive, setIsOthersActive] = useState(false);
    const [appliedCustomFilter, setAppliedCustomFilter] = useState("");

    const fetcher = (url: string) => fetch(url).then(res => res.json());

    const getKey = (pageIndex: number, previousPageData: any[]) => {
        if (previousPageData && !previousPageData.length) return null;
        
        const userName = typeof window !== 'undefined' ? localStorage.getItem("anonymous_user") : "";
        const params = new URLSearchParams();
        
        if (filter !== "All") {
            const subjectFilter = filter === "Others" ? appliedCustomFilter : filter;
            if (subjectFilter) params.append("subject", subjectFilter);
        }
        if (userName) params.append("userName", userName);
        params.append("page", (pageIndex + 1).toString());
        params.append("limit", "20");
        
        return `/api/doubts?${params.toString()}`;
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
        <div className="p-4 md:p-8 space-y-6 max-w-[1000px] mx-auto pb-24">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
                <div className="space-y-1">
                    <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic">
                        Public<span className="text-blue-500"> Doubts</span>
                    </h1>
                    <p className="text-slate-400 text-lg font-medium tracking-tight">
                        Collaborate with student community. <span className="text-blue-400/80 font-bold">Ask, Solve, Learn anonymously.</span>
                    </p>
                </div>
                <button 
                    onClick={() => setIsAskModalOpen(true)}
                    className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Ask a Doubt
                </button>
            </header>

            {/* Filter Section */}
            <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-500">
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Filter:</span>
                </div>
                {["All", "Math", "Physics", "Programming", "Others"].map((f) => (
                    <button
                        key={f}
                        onClick={() => {
                            setFilter(f);
                            if (f !== "Others") {
                                setCustomFilter("");
                                setIsOthersActive(false);
                            } else {
                                setIsOthersActive(true);
                            }
                        }}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${
                            filter === f 
                            ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" 
                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                        {f}
                    </button>
                ))}

                {/* Custom Filter Input */}
                {filter === "Others" && (
                    <div className="flex items-center gap-2 animate-in slide-in-from-left-4 duration-300">
                        <input 
                            type="text"
                            placeholder="Type filter..."
                            value={customFilter}
                            onChange={(e) => setCustomFilter(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') setAppliedCustomFilter(customFilter);
                            }}
                            className="bg-slate-900 border border-blue-500/30 rounded-xl px-4 py-2 text-[10px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-all w-40"
                        />
                        <button 
                            onClick={() => setAppliedCustomFilter(customFilter)}
                            className="px-4 py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                        >
                            Apply
                        </button>
                    </div>
                )}
            </div>

            {isLoading && doubts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing with community...</p>
                </div>
            ) : doubts.length > 0 ? (
                <>
                    <div className="flex flex-col gap-6 lg:gap-8">
                        {doubts.map((doubt: any) => (
                            <DoubtCard key={doubt.id} doubt={doubt} onUpdate={() => mutate()} />
                        ))}
                    </div>
                    <div ref={loadMoreRef} className="py-8 flex justify-center">
                        {isLoadingMore && <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.02] text-center px-6">
                    <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mb-6">
                        <MessageSquare className="w-10 h-10 text-blue-500/50" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">The board is clean!</h2>
                    <p className="text-slate-500 max-w-sm mx-auto mb-8 font-medium">
                        {filter === "All" 
                            ? "Be the first one to post a doubt and kickstart the community discussion." 
                            : `No doubts found in ${filter}. Try switching filters or ask one yourself!`}
                    </p>
                    <button 
                        onClick={() => setIsAskModalOpen(true)}
                        className="px-10 py-5 bg-white/5 hover:bg-white text-slate-400 hover:text-slate-950 border border-white/10 rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] transition-all"
                    >
                        Post the first doubt
                    </button>
                </div>
            )}

            {isAskModalOpen && (
                <AskDoubt 
                    defaultSubject={filter !== "All" ? filter : "Math"}
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
