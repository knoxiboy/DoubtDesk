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
    const [tagFilter, setTagFilter] = useState("");
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

    const fetchDoubts = async () => {
        mutate(); // Trigger SWR re-validation
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

    // Randomized empty-state messages
    const emptyMessages = [
        { headline: "Every legendary thread", accent: "starts with one question.", sub: "That question could be yours. Post it before someone else does." },
        { headline: "Silence is just", accent: "an unanswered question.", sub: "Someone here knows exactly what you're stuck on. But they're waiting for you to ask." },
        { headline: "Your doubt could be", accent: "the spark this board needs.", sub: "The most upvoted posts were once just a nervous first question. Go for it." },
        { headline: "Nobody's been brave", accent: "enough to ask yet.", sub: "Asking isn't weakness, it's how the smartest people in the room got there." },
        { headline: "This space is waiting", accent: "for someone like you.", sub: "You showed up. That's already more than most. Now ask what brought you here." },
        { headline: "Zero doubts.", accent: "Infinite opportunity.", sub: "Clean slate. No noise. Just you, your question, and a community ready to answer." },
        { headline: "The best communities", accent: "start with one voice.", sub: "This board needs its first voice. Might as well be the one who actually showed up." },
        { headline: "Still reading this?", accent: "That's your sign to post.", sub: "You already know what you want to ask. Stop overthinking — just type it out." },
        { headline: "You're literally", accent: "the first one here.", sub: "Pioneer energy. The ones who post first always get the most answers." },
        { headline: "What's the one thing", accent: "you've been afraid to ask?", sub: "Anonymous means nobody knows it's you. So ask the thing you'd never ask in class." },
    ];
    const [randomMessage, setRandomMessage] = useState(emptyMessages[0]);

    useEffect(() => {
        setRandomMessage(
            emptyMessages[Math.floor(Math.random() * emptyMessages.length)]
        );
    }, [filter, customFilter]);


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

                <div className="flex items-center gap-2 ml-auto">
                    <input
                        type="text"
                        placeholder="Filter by tag..."
                        value={tagFilter}
                        onChange={(e) => setTagFilter(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") fetchDoubts();
                        }}
                        className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-all w-40"
                    />
                    <button
                        onClick={fetchDoubts}
                        className="px-4 py-2 bg-white/5 text-slate-300 hover:bg-blue-600 hover:text-white border border-white/10 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                    >
                        Tag
                    </button>
                </div>
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

                <div className="relative flex flex-col items-center justify-center py-20 rounded-[3rem] text-center px-6 overflow-hidden border border-white/5">
                {/* Layered gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-slate-900/20 to-indigo-950/30 rounded-[3rem]" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent rounded-[3rem]" />

                {/* Dot grid texture */}
                <div className="absolute inset-0 rounded-[3rem] opacity-25"
                    style={{
                        backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.4) 1px, transparent 1px)',
                        backgroundSize: '28px 28px'
                    }}
                />

                {/* Decorative floating orbs */}
                <div className="absolute top-8 left-12 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl" />
                <div className="absolute bottom-8 right-12 w-40 h-40 bg-indigo-600/10 rounded-full blur-2xl" />
                <div className="absolute top-1/2 left-6 w-20 h-20 bg-blue-400/5 rounded-full blur-xl" />

                {/* SVG Illustration */}
                <div className="relative mb-8 z-10">
                    <svg width="140" height="120" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <ellipse cx="70" cy="110" rx="45" ry="6" fill="rgba(59,130,246,0.15)" />
                        <rect x="48" y="22" width="68" height="46" rx="12" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.3)" strokeWidth="1"/>
                        <polygon points="100,62 112,72 104,62" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.3)" strokeWidth="1"/>
                        <rect x="18" y="10" width="76" height="52" rx="14" fill="rgba(59,130,246,0.18)" stroke="rgba(59,130,246,0.4)" strokeWidth="1.2"/>
                        <polygon points="30,57 18,72 38,57" fill="rgba(59,130,246,0.18)" stroke="rgba(59,130,246,0.4)" strokeWidth="1.2"/>
                        <rect x="30" y="24" width="40" height="4" rx="2" fill="rgba(147,197,253,0.6)"/>
                        <rect x="30" y="34" width="52" height="4" rx="2" fill="rgba(147,197,253,0.35)"/>
                        <rect x="30" y="44" width="30" height="4" rx="2" fill="rgba(147,197,253,0.25)"/>
                        <g opacity="0.7">
                            <line x1="118" y1="14" x2="118" y2="22" stroke="rgba(167,139,250,0.8)" strokeWidth="1.5" strokeLinecap="round"/>
                            <line x1="114" y1="18" x2="122" y2="18" stroke="rgba(167,139,250,0.8)" strokeWidth="1.5" strokeLinecap="round"/>
                        </g>
                        <g opacity="0.5">
                            <line x1="128" y1="30" x2="128" y2="35" stroke="rgba(167,139,250,0.6)" strokeWidth="1" strokeLinecap="round"/>
                            <line x1="125.5" y1="32.5" x2="130.5" y2="32.5" stroke="rgba(167,139,250,0.6)" strokeWidth="1" strokeLinecap="round"/>
                        </g>
                        <circle cx="12" cy="35" r="2.5" fill="rgba(59,130,246,0.3)"/>
                        <circle cx="8" cy="55" r="1.5" fill="rgba(99,102,241,0.25)"/>
                        <circle cx="130" cy="55" r="2" fill="rgba(59,130,246,0.25)"/>
                    </svg>
                </div>

                {/* Copy */}
                <div className="relative z-10 space-y-3 mb-8">
                    <h2 className="text-3xl font-black text-white tracking-tighter leading-tight">
                        {randomMessage.headline}{" "}
                        <span className="text-blue-400">{randomMessage.accent}</span>
                    </h2>
                    <p className="text-slate-400 max-w-sm mx-auto text-sm leading-relaxed">
                        {filter === "All"
                            ? randomMessage.sub
                            : `${filter} is wide open. Drop a doubt, and watch your classmates rally around it.`}
                    </p>
                </div>

                {/* CTA */}
                <div className="relative z-10 flex flex-col items-center gap-3">
                    <button
                        onClick={() => setIsAskModalOpen(true)}
                        className="group flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all duration-200 shadow-lg shadow-blue-600/30 active:scale-95"
                    >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                        Be the first to ask
                    </button>
                    <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest">Anonymous · No login needed</p>
                </div>
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
