"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, SlidersHorizontal, Search } from "lucide-react";
import AskDoubt from "@/components/AskDoubt";
import InfiniteDoubtFeed from "@/components/InfiniteDoubtFeed";
import { useSWRConfig } from "swr";

export default function PublicRoomsPage() {
    const [isAskModalOpen, setIsAskModalOpen] = useState(false);
    const [filter, setFilter] = useState("All");
    const [tagFilter, setTagFilter] = useState("");
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

    // Randomized empty-state messages (from upstream)
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
    }, [filter, customFilter, tagFilter]);

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
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
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
                        </div>
                    )}
                </div>

                {/* Tag Search (Upstream Feature) */}
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 focus-within:border-blue-500/50 transition-all">
                    <Search className="w-4 h-4 text-slate-500" />
                    <input 
                        type="text"
                        placeholder="Search by tag..."
                        value={tagFilter}
                        onChange={(e) => setTagFilter(e.target.value)}
                        className="bg-transparent border-none text-[11px] font-bold text-white placeholder:text-slate-600 focus:outline-none w-40"
                    />
                </div>
            </div>

            <InfiniteDoubtFeed 
                subject={filter === "Others" ? customFilter : filter === "All" ? undefined : filter}
                tag={tagFilter}
                emptyMessage={randomMessage.headline + " " + randomMessage.accent}
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
