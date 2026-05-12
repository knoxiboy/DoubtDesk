"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, SlidersHorizontal } from "lucide-react";
import AskDoubt from "@/components/AskDoubt";
import DoubtCard from "@/components/DoubtCard";

export default function PublicRoomsPage() {
    const [isAskModalOpen, setIsAskModalOpen] = useState(false);
    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("All");
    const [customFilter, setCustomFilter] = useState("");
    const [isOthersActive, setIsOthersActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchDoubts = async () => {
        setLoading(true);
        try {
            const userName = localStorage.getItem("anonymous_user");
            const params = new URLSearchParams();
            
            if (filter !== "All") {
                const subjectFilter = filter === "Others" ? customFilter : filter;
                if (subjectFilter) params.append("subject", subjectFilter);
            }
            if (searchQuery) {
                params.append("search", searchQuery);
            }
            if (userName) params.append("userName", userName);
            
            const res = await fetch(`/api/doubts?${params.toString()}`);
            const data = await res.json();
            setDoubts(data);
        } catch (error) {
            console.error("Failed to fetch doubts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchDoubts();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [filter, searchQuery]);

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

            {/* Controls Section: Search & Filters */}
            <div className="space-y-4">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                        <MessageSquare className="w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input 
                        type="text"
                        placeholder="Search for doubts, subjects, or keywords..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-[1.5rem] py-5 pl-14 pr-6 text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all shadow-inner"
                    />
                </div>

                <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-500">
                        <SlidersHorizontal className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Filter:</span>
                    </div>
                    {["All", "Math", "Science", "Physics", "Chemistry", "Programming", "Others"].map((f) => (
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
                                    if (e.key === 'Enter') fetchDoubts();
                                }}
                                className="bg-slate-900 border border-blue-500/30 rounded-xl px-4 py-2 text-[10px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-all w-40"
                            />
                            <button 
                                onClick={fetchDoubts}
                                className="px-4 py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                            >
                                Apply
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing with community...</p>
                </div>
            ) : doubts.length > 0 ? (
                <div className="flex flex-col gap-6 lg:gap-8">
                    {doubts.map((doubt: any) => (
                        <DoubtCard key={doubt.id} doubt={doubt} onUpdate={fetchDoubts} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.02] text-center px-6 animate-in fade-in duration-500">
                    <div className="w-24 h-24 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center mb-8 border border-blue-500/10 shadow-2xl shadow-blue-600/5">
                        {searchQuery ? (
                             <MessageSquare className="w-12 h-12 text-slate-700" />
                        ) : (
                             <Plus className="w-12 h-12 text-blue-500/50" />
                        )}
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic mb-2">
                        {searchQuery ? "No results found" : "The board is clean!"}
                    </h2>
                    <p className="text-slate-500 max-w-sm mx-auto mb-10 font-medium leading-relaxed">
                        {searchQuery 
                            ? `We couldn't find any doubts matching "${searchQuery}". Try a different keyword or filter.`
                            : filter === "All" 
                                ? "Be the first one to post a doubt and kickstart the community discussion." 
                                : `No doubts found in ${filter}. Try switching filters or ask one yourself!`}
                    </p>
                    {searchQuery ? (
                        <button 
                            onClick={() => setSearchQuery("")}
                            className="px-10 py-5 bg-white text-slate-950 border border-white/10 rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/10"
                        >
                            Clear Search
                        </button>
                    ) : (
                        <button 
                            onClick={() => setIsAskModalOpen(true)}
                            className="px-10 py-5 bg-white/5 hover:bg-white text-slate-400 hover:text-slate-950 border border-white/10 rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] transition-all active:scale-95"
                        >
                            Post the first doubt
                        </button>
                    )}
                </div>
            )}

            {isAskModalOpen && (
                <AskDoubt 
                    defaultSubject={filter !== "All" ? filter : "Math"}
                    isOpen={isAskModalOpen} 
                    onClose={() => setIsAskModalOpen(false)} 
                    onSuccess={() => {
                        setIsAskModalOpen(false);
                        fetchDoubts();
                    }}
                />
            )}
        </div>
    );
}
