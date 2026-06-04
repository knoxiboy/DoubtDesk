"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, SlidersHorizontal, Loader2, Bookmark } from "lucide-react";
import AskDoubt from "@/components/AskDoubt";
import DoubtCard from "@/components/DoubtCard";
import DoubtSortSelect, { DoubtSortValue } from "@/components/DoubtSortSelect";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWRInfinite from "swr/infinite";
import { useInView } from "react-intersection-observer";
import { Doubt } from "@/types";
import { useUser } from "@clerk/nextjs";

export default function PublicRoomsPage() {
    const { isSignedIn } = useUser();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isAskModalOpen, setIsAskModalOpen] = useState(false);
    const [filter, setFilter] = useState("All");
    const [tagFilter, setTagFilter] = useState("");
    const [customFilter, setCustomFilter] = useState("");
    const [isOthersActive, setIsOthersActive] = useState(false);
    const [appliedCustomFilter, setAppliedCustomFilter] = useState("");
    const [appliedTagFilter, setAppliedTagFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState<'all' | 'unsolved' | 'in-progress' | 'solved'>('all');

    const [searchVal, setSearchVal] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [pendingDoubts, setPendingDoubts] = useState<any[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(searchVal);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchVal]);

    useEffect(() => {
        const loadPendingDoubts = async () => {
            try {
                const { getPendingDoubts } = await import("@/lib/offline/syncQueue");
                const pending = await getPendingDoubts();
                setPendingDoubts(pending);
            } catch (err) {
                console.error("Failed to load pending doubts:", err);
            }
        };

        loadPendingDoubts();

        window.addEventListener("sync-queue-updated", loadPendingDoubts);
        window.addEventListener("online", loadPendingDoubts);
        return () => {
            window.removeEventListener("sync-queue-updated", loadPendingDoubts);
            window.removeEventListener("online", loadPendingDoubts);
        };
    }, []);

    const sort = (searchParams.get("sort") as DoubtSortValue) || "newest";

    const fetcher = (url: string) => fetch(url).then(res => res.json());

    const updateSort = (nextSort: DoubtSortValue) => {
        const params = new URLSearchParams(searchParams.toString());
        if (nextSort === "newest") {
            params.delete("sort");
        } else {
            params.set("sort", nextSort);
        }

        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        setSize(1);
    };

    const getKey = (pageIndex: number, previousPageData: Doubt[] | null | undefined) => {
        if (previousPageData && !previousPageData.length) return null;
        
        const userName = typeof window !== 'undefined' ? localStorage.getItem("anonymous_user") : "";
        const params = new URLSearchParams();
        
        if (filter !== "All") {
            if (filter === "Bookmarked") {
                params.append("bookmarked", "true");
            } else {
                const subjectFilter = filter === "Others" ? appliedCustomFilter : filter;
                if (subjectFilter) params.append("subject", subjectFilter);
            }
        }

        if (searchQuery) {
            params.append("search", searchQuery);
        }

        if (appliedTagFilter.trim()) {
            params.append("tag", appliedTagFilter.trim());
        }

        if (sort !== "newest") {
            params.append("sort", sort);
        }

        if (userName) params.append("userName", userName);
        params.append("page", (pageIndex + 1).toString());
        params.append("limit", "20");
        
        return `/api/doubts?${params.toString()}`;
    };

    const fetchDoubts = async () => {
        setAppliedTagFilter(tagFilter);
        mutate();
    };

    const { data, isLoading, size, setSize, mutate } = useSWRInfinite(getKey, fetcher, {
        revalidateFirstPage: false
    });

    const doubts = (data ? [].concat(...data) : []) as Doubt[];
    
    // Apply local filters to pending doubts so they match the active view
    const matchingPendingDoubts = pendingDoubts.filter((d) => {
        // 1. Subject filter
        if (filter !== "All") {
            if (filter === "Bookmarked") {
                // Pending doubts are not synced yet, so they cannot be bookmarked
                return false;
            } else if (filter === "Others") {
                const knownSubjects = ["Math", "Science", "Physics", "Chemistry", "Programming"];
                const isOtherSubject = !knownSubjects.includes(d.subject);
                if (appliedCustomFilter) {
                    return d.subject?.toLowerCase() === appliedCustomFilter.toLowerCase();
                }
                return isOtherSubject;
            } else {
                return d.subject?.toLowerCase() === filter.toLowerCase();
            }
        }
        
        // 2. Search query filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const contentMatch = d.content?.toLowerCase().includes(query);
            const subjectMatch = d.subject?.toLowerCase().includes(query);
            const userNameMatch = d.userName?.toLowerCase().includes(query);
            if (!contentMatch && !subjectMatch && !userNameMatch) {
                return false;
            }
        }
        
        // 3. Tag filter
        if (appliedTagFilter.trim()) {
            const normalizedTag = appliedTagFilter.trim().toLowerCase();
            const hasMatchingTag = d.tags?.some((t: any) => t.name?.toLowerCase() === normalizedTag);
            if (!hasMatchingTag) {
                return false;
            }
        }
        
        return true;
    });

    const allDoubts = [...matchingPendingDoubts, ...doubts];
    const filteredDoubts = (allDoubts as any[]).filter((d) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'unsolved') return d.isSolved === 'unsolved' || !d.isSolved;
        if (statusFilter === 'in-progress') return d.isSolved === 'in-progress';
        return d.isSolved === 'solved';
    });
    const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
    const isReachingEnd = data && data[data.length - 1]?.length < 20;

    const { ref: loadMoreRef, inView } = useInView();

    useEffect(() => {
        if (inView && !isReachingEnd && !isLoadingMore) {
            setSize(size + 1);
        }
    }, [inView, isReachingEnd, isLoadingMore]);

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

    useEffect(() => {
        mutate();
    }, [filter, appliedCustomFilter]);

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto pb-24 text-slate-900 dark:text-zinc-100 bg-white dark:bg-black min-h-screen transition-colors duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 dark:from-blue-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100 dark:border-zinc-900/60 relative z-10">
                <div className="space-y-2">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
                        Public Doubts
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium leading-relaxed max-w-2xl">
                        Collaborate with student community. <span className="text-blue-600 dark:text-blue-400 font-bold">Ask, Solve, Learn anonymously.</span>
                    </p>
                </div>
                <button
                    onClick={() => setIsAskModalOpen(true)}
                    className="flex items-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-lg shadow-blue-600/10 active:scale-[0.98] shrink-0"
                >
                    <Plus className="w-5 h-5" />
                    Ask a Doubt
                </button>
            </header>

            <div className="space-y-4 relative z-10">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <MessageSquare className="w-5 h-5 text-slate-400 dark:text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input 
                        type="text"
                        placeholder="Search for doubts, subjects, or keywords..."
                        value={searchVal}
                        onChange={(e) => setSearchVal(e.target.value)}
                        className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl py-4 pl-12 pr-6 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-all shadow-sm"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-400 dark:text-zinc-500">
                        <SlidersHorizontal className="w-4 h-4" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Filter:</span>
                    </div>
                    {(() => {
                        const filtersList = ["All", "Math", "Science", "Physics", "Chemistry", "Programming", "Others"];
                        if (isSignedIn) {
                            filtersList.push("Bookmarked");
                        }
                        return filtersList;
                    })().map((f) => (
                        <button
                            key={f}
                            onClick={() => {
                                setFilter(f);
                                if (f !== "Others") {
                                    setCustomFilter("");
                                    setAppliedCustomFilter("");
                                    setIsOthersActive(false);
                                } else {
                                    setIsOthersActive(true);
                                }
                            }}
                            className={`px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 border shrink-0 flex items-center gap-1.5 ${
                                filter === f 
                                ? f === "Bookmarked"
                                    ? "bg-blue-500/20 border-blue-500/30 text-blue-500 dark:text-blue-400 shadow-lg shadow-blue-500/5"
                                    : "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/10" 
                                : "bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                            }`}
                        >
                            {f === "Bookmarked" && (
                                <Bookmark className={`w-3.5 h-3.5 ${filter === "Bookmarked" ? "fill-blue-500 text-blue-500 dark:fill-blue-400 dark:text-blue-400" : "text-slate-400 dark:text-zinc-500"}`} />
                            )}
                            {f}
                        </button>
                    ))}

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
                                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[11px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-all w-36"
                            />
                            <button 
                                onClick={() => setAppliedCustomFilter(customFilter)}
                                className="px-3 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                            >
                                Apply
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-2 sm:ml-auto">
                        <input
                            type="text"
                            placeholder="Filter by tag..."
                            value={tagFilter}
                            onChange={(e) => setTagFilter(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") fetchDoubts();
                            }}
                            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-[11px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-all w-36"
                        />
                        <button
                            onClick={fetchDoubts}
                            className="px-3 py-2 bg-slate-50 dark:bg-zinc-900/40 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all"
                         aria-label="Interactive button">
                            Tag
                        </button>

                        <DoubtSortSelect value={sort} onValueChange={updateSort} className="ml-auto" />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-400 dark:text-zinc-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider">Status:</span>
                    </div>
                    {([
                        { key: 'all',        label: 'All',         active: "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/10" },
                        { key: 'unsolved',    label: 'Unsolved',    active: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400" },
                        { key: 'in-progress', label: 'In Progress', active: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400" },
                        { key: 'solved',      label: 'Solved',      active: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
                    ] as const).map((s) => (
                        <button
                            key={s.key}
                            onClick={() => setStatusFilter(s.key)}
                            className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 border shrink-0 ${
                                statusFilter === s.key
                                    ? s.active
                                    : "bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && doubts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4 relative z-10">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-xs">Syncing with community...</p>
                </div>
            ) : filteredDoubts.length > 0 ? (
                <div className="relative z-10">
                    <div className="flex flex-col gap-6 lg:gap-8">
                        {filteredDoubts.map((doubt: any, index: number) => (
                            <DoubtCard key={`${doubt.id}-${index}`} doubt={doubt} onUpdate={() => mutate()} />
                        ))}
                    </div>
                    <div ref={loadMoreRef} className="py-8 flex justify-center">
                        {isLoadingMore && <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />}
                    </div>
                </div>
            ) : doubts.length > 0 ? (
                <div className="py-20 text-center space-y-4 bg-slate-50/30 dark:bg-zinc-950/10 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl relative z-10">
                    <p className="text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-xs">
                        No doubts matching this status filter.
                    </p>
                    <button
                        onClick={() => setStatusFilter('all')}
                        className="px-5 py-2 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-blue-600 hover:text-white border border-slate-200 dark:border-zinc-800 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 shadow-sm"
                    >
                        Show all
                    </button>
                </div>
            ) : (
                <div className="relative flex flex-col items-center justify-center py-20 rounded-2xl text-center px-6 overflow-hidden border border-slate-200 dark:border-zinc-900 bg-slate-50/30 dark:bg-zinc-950/10 shadow-inner z-10">
                    <div className="absolute top-8 left-12 w-32 h-32 bg-blue-600/5 rounded-full blur-2xl" />
                    <div className="absolute bottom-8 right-12 w-40 h-40 bg-indigo-600/5 rounded-full blur-2xl" />

                    <div className="relative mb-6">
                        {searchQuery ? (
                            <div className="w-20 h-20 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20 shadow-sm">
                                <MessageSquare className="w-10 h-10 text-blue-500" />
                            </div>
                        ) : (
                            <svg width="120" height="100" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <ellipse cx="70" cy="110" rx="45" ry="6" fill="rgba(59,130,246,0.1)" />
                                <rect x="48" y="22" width="68" height="46" rx="12" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)" strokeWidth="1"/>
                                <polygon points="100,62 112,72 104,62" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.25)" strokeWidth="1"/>
                                <rect x="18" y="10" width="76" height="52" rx="14" fill="rgba(59,130,246,0.12)" stroke="rgba(59,130,246,0.3)" strokeWidth="1.2"/>
                                <polygon points="30,57 18,72 38,57" fill="rgba(59,130,246,0.12)" stroke="rgba(59,130,246,0.3)" strokeWidth="1.2"/>
                                <rect x="30" y="24" width="40" height="4" rx="2" fill="rgba(59,130,246,0.4)"/>
                                <rect x="30" y="34" width="52" height="4" rx="2" fill="rgba(59,130,246,0.2)"/>
                                <rect x="30" y="44" width="30" height="4" rx="2" fill="rgba(59,130,246,0.15)"/>
                                <g opacity="0.6">
                                    <line x1="118" y1="14" x2="118" y2="22" stroke="rgba(139,92,246,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
                                    <line x1="114" y1="18" x2="122" y2="18" stroke="rgba(139,92,246,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
                                </g>
                                <circle cx="12" cy="35" r="2" fill="rgba(59,130,246,0.2)"/>
                                <circle cx="130" cy="55" r="2" fill="rgba(59,130,246,0.2)"/>
                            </svg>
                        )}
                    </div>

                    <div className="relative space-y-2 mb-6">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {searchQuery 
                                ? "No matching doubts" 
                                : filter === "Bookmarked"
                                    ? "No bookmarked doubts yet"
                                    : randomMessage.headline}{" "}
                            <span className="text-blue-600 dark:text-blue-400">
                                {searchQuery ? "" : filter === "Bookmarked" ? "" : randomMessage.accent}
                            </span>
                        </h2>
                        <p className="text-slate-500 dark:text-zinc-400 max-w-sm mx-auto text-xs font-medium leading-relaxed">
                            {searchQuery 
                                ? `We couldn't find any doubts matching "${searchQuery}". Try a different keyword or subject.`
                                : filter === "Bookmarked"
                                    ? "Save important doubts by clicking the bookmark icon on any doubt card to view them here later."
                                    : filter === "All"
                                        ? randomMessage.sub
                                        : `${filter} is wide open. Drop a doubt, and watch your classmates rally around it.`}
                        </p>
                    </div>

                    <div className="relative flex flex-col items-center gap-3">
                        {searchQuery ? (
                            <button
                                onClick={() => setSearchVal("")}
                                className="flex items-center gap-3 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-md shadow-blue-600/10 active:scale-[0.98]"
                            >
                                Clear Search
                            </button>
                        ) : filter === "Bookmarked" ? (
                            <button
                                onClick={() => setFilter("All")}
                                className="group flex items-center gap-3 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-md shadow-blue-600/10 active:scale-[0.98]"
                            >
                                Explore public doubts
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsAskModalOpen(true)}
                                className="group flex items-center gap-3 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-md shadow-blue-600/10 active:scale-[0.98]"
                            >
                                <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                                Be the first to ask
                            </button>
                        )}
                        <p className="text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Anonymous · No login needed</p>
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