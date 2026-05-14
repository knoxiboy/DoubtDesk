"use client";

import { useState } from "react";
import { MessageSquare, Plus, SlidersHorizontal } from "lucide-react";
import AskDoubt from "@/components/AskDoubt";
import InfiniteDoubtFeed from "@/components/InfiniteDoubtFeed";
import { useSWRConfig } from "swr";

export default function PublicRoomsPage() {
    const [isAskModalOpen, setIsAskModalOpen] = useState(false);
    const [filter, setFilter] = useState("All");
    const [customFilter, setCustomFilter] = useState("");
    const { mutate } = useSWRConfig();

    const handleFilterChange = (f: string) => {
        setFilter(f);
        if (f !== "Others") {
            setCustomFilter("");
        }
    };

    const refreshDoubts = () => {
        mutate((key) => typeof key === 'string' && key.startsWith('/api/doubts'), undefined, { revalidate: true });
    };

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
                        onClick={() => handleFilterChange(f)}
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
                                if (e.key === 'Enter') refreshDoubts();
                            }}
                            className="bg-slate-900 border border-blue-500/30 rounded-xl px-4 py-2 text-[10px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-all w-40"
                        />
                        <button 
                            onClick={refreshDoubts}
                            className="px-4 py-2 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all"
                        >
                            Apply
                        </button>
                    </div>
                )}
            </div>

            <InfiniteDoubtFeed 
                subject={filter === "Others" ? customFilter : filter === "All" ? undefined : filter}
                emptyMessage={filter === "All" 
                    ? "Be the first one to post a doubt and kickstart the community discussion." 
                    : `No doubts found in ${filter}. Try switching filters or ask one yourself!`}
                emptyAction={() => setIsAskModalOpen(true)}
                emptyActionLabel="Post the first doubt"
            />

            {isAskModalOpen && (
                <AskDoubt 
                    defaultSubject={filter !== "All" && filter !== "Others" ? filter : "Math"}
                    isOpen={isAskModalOpen} 
                    onClose={() => setIsAskModalOpen(false)} 
                    onSuccess={() => {
                        setIsAskModalOpen(false);
                        refreshDoubts();
                    }}
                />
            )}
        </div>
    );
}
