"use client";

import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useAppUser } from "../../provider";
import {
    Brain,
    MessageSquare,
    TrendingUp,
    Users,
    Plus,
    Loader2,
    Sparkles,
    ChevronLeft,
    School,
    Copy,
    Check,
    Calendar,
    ArrowRight,
    Clock,
    Activity,
    Lightbulb,
    Layers,
    PieChart,
    Zap,
    AlertTriangle,
    Target,
    Search,
    Trophy,
    Medal,
    GraduationCap
} from "lucide-react";
import AskDoubt from "@/components/AskDoubt";
import DoubtCard from "@/components/DoubtCard";
import AskAIView from "../../../components/AskAIView";
import ExportButton from "@/components/ExportButton";
import DoubtSortSelect, { DoubtSortValue } from "@/components/DoubtSortSelect";
import { toast } from "sonner";
import useSWRInfinite from "swr/infinite";
import { useInView } from "react-intersection-observer";

interface Classroom {
    id: number;
    name: string;
    university: string;
    year: string;
    teacherEmail: string;
    inviteCode: string;
    role: string;
}

export default function ClassroomPage() {
    const { id } = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { appUser } = useAppUser();

    const [classroom, setClassroom] = useState<Classroom | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("ask-ai");
    const [activeAIDoubt, setActiveAIDoubt] = useState<any>(null);
    const [isAskModalOpen, setIsAskModalOpen] = useState(false);
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [doubtFilter, setDoubtFilter] = useState<'unsolved' | 'in-progress' | 'solved'>('unsolved');
    const [searchVal, setSearchVal] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [subjectFilter, setSubjectFilter] = useState("All");
    const [tagFilter, setTagFilter] = useState("");
    const sort = (searchParams.get("sort") as DoubtSortValue) || "newest";

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(searchVal);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchVal]);

    const type = activeTab === 'teacher-doubts' ? 'teacher' : activeTab === 'community' ? 'community' : 'ai';
    const userName = typeof window !== 'undefined' ? localStorage.getItem("anonymous_user") : "";

    const fetcher = (url: string) => fetch(url).then(res => res.json());
    const updateSort = (nextSort: DoubtSortValue) => {
        const nextParams = new URLSearchParams(searchParams.toString());
        if (nextSort === "newest") {
            nextParams.delete("sort");
        } else {
            nextParams.set("sort", nextSort);
        }

        const query = nextParams.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
        setSize(1);
    };

    const getKey = (pageIndex: number, previousPageData: any[]) => {
        if (previousPageData && !previousPageData.length) return null;
        if (activeTab === 'insights') return null;
        const params = new URLSearchParams({
            classroomId: String(id),
            userName: userName || "",
            type: String(type),
            page: String(pageIndex + 1),
            limit: "20"
        });
        if (tagFilter.trim()) params.append("tag", tagFilter.trim());
        if (searchQuery) params.append("search", searchQuery);
        if (subjectFilter !== "All") params.append("subject", subjectFilter);
        if (sort !== "newest") params.append("sort", sort);
        return `/api/doubts?${params.toString()}`;
    };

    const { data, isLoading: doubtsLoading, size, setSize, mutate } = useSWRInfinite(getKey, fetcher, {
        revalidateFirstPage: false
    });

    const doubts = data ? [].concat(...data) : [];
    const isLoadingMore = doubtsLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
    const isReachingEnd = data && data[data.length - 1]?.length < 20;

    const { ref: loadMoreRef, inView } = useInView();

    useEffect(() => {
        if (inView && !isReachingEnd && !isLoadingMore) {
            setSize(size + 1);
        }
    }, [inView, isReachingEnd, isLoadingMore]);

    useHotkeys("n", (e) => {
        e.preventDefault();
        setIsAskModalOpen(true);
    }, {
        enableOnFormTags: false,
    });

    useEffect(() => {
        initialFetch();
    }, [id]);

    const initialFetch = async () => {
        setLoading(true);
        try {
            const roomRes = await fetch(`/api/rooms/${id}`);
            const roomData = await roomRes.json();
            if (roomRes.ok) {
                setClassroom(roomData);
            } else {
                toast.error(roomData.error || "Error loading classroom");
                router.push("/rooms");
            }
        } catch (err) {
            toast.error("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        mutate();
    }, [activeTab, tagFilter, searchQuery, subjectFilter]);

    const copyCode = async () => {
        if (classroom?.inviteCode) {
            try {
                await navigator.clipboard.writeText(classroom.inviteCode);
                setCopied(true);
                toast.success("Invite code copied!", { id: `copy-invite-${classroom.inviteCode}` });
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                toast.error("Failed to copy invite code", { id: `copy-invite-error-${classroom.inviteCode}` });
            }
        }
    };

    if (loading) {
        return (
            <div className="h-[calc(100vh-80px)] flex items-center justify-center bg-white dark:bg-black transition-colors duration-500">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    if (!classroom) return null;

    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-zinc-100 transition-colors duration-500 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 dark:from-blue-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />

            <div className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-100 dark:border-zinc-900/60 pt-4 sm:pt-6 pb-4 sm:pb-6 px-4 sm:px-6 md:px-12">
                <div className="max-w-7xl mx-auto relative z-10 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <button
                            onClick={() => router.push("/rooms")}
                            className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors text-xs font-bold uppercase tracking-wider w-fit shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back to Campus
                        </button>

                        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
                            <ExportButton 
                                classroomId={String(id)} 
                                classroomName={classroom?.name || ""} 
                                isTeacher={classroom?.role === "teacher"} 
                            />
                            <button
                                onClick={() => setIsCodeModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-900 dark:hover:text-white transition-all duration-300 shadow-sm shrink-0"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Class Code
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 min-w-0">
                        <div className="space-y-4 min-w-0">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl flex items-center justify-center text-xl sm:text-2xl font-black shrink-0 shadow-md shadow-blue-500/10">
                                    {classroom.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                                        {classroom.name}
                                    </h1>
                                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap text-slate-400 dark:text-zinc-500 text-[11px] font-bold uppercase tracking-wider mt-1">
                                        <span className="flex items-center gap-1.5"><School className="w-3.5 h-3.5 shrink-0" /> {classroom.university}</span>
                                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0" /> {classroom.year}</span>
                                        <span className="flex items-center gap-1.5 bg-slate-50 dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400">{classroom.role}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1 scrollbar-hide w-full xl:w-auto max-w-full">
                            {[
                                { id: "ask-ai", label: "Ask AI", icon: Brain },
                                { id: "community", label: "Community", icon: MessageSquare },
                                { id: "teacher-doubts", label: classroom?.role === 'teacher' ? "Students Doubt" : "Ask Teacher", icon: GraduationCap },
                                { id: "insights", label: "Insights", icon: TrendingUp }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 border shrink-0 whitespace-nowrap ${ activeTab === tab.id ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/10" : "bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/40" }`}
                                >
                                    <tab.icon className="w-4 h-4 shrink-0" /> {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-12 pb-2 flex justify-end relative z-10 mt-6">
                {activeTab !== "ask-ai" && activeTab !== "insights" && (
                    <DoubtSortSelect value={sort} onValueChange={updateSort} />
                )}
            </div>

            <div className="max-w-7xl mx-auto p-4 md:py-6 md:px-12 relative z-10">
                {activeTab === "ask-ai" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold tracking-tight text-center">ASK <span className="text-blue-600 dark:text-blue-400">AI Teacher</span></h2>
                            <div className="max-w-3xl mx-auto">
                                <AskAIView 
                                    classroomId={Number(id)} 
                                    onSuccess={() => mutate()} 
                                    initialDoubt={activeAIDoubt}
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-zinc-800 to-transparent"></div>
                                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-zinc-900 px-4 py-1.5 rounded-full border border-slate-200 dark:border-zinc-800">Neural Resolve History</h3>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-zinc-800 to-transparent"></div>
                            </div>

                            {doubtsLoading ? (
                                <div className="flex justify-center p-12"><Loader2 className="w-5 h-5 text-purple-500 animate-spin" /></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {Array.isArray(doubts) && doubts.filter((d: any) => d.type === 'ai').map((doubt: any) => (
                                        <DoubtCard
                                            key={doubt.id}
                                            doubt={doubt}
                                            role={classroom?.role}
                                            onUpdate={() => mutate()}
                                            onViewAISolution={(d) => {
                                                setActiveAIDoubt(d);
                                                setActiveTab("ask-ai");
                                            }}
                                        />
                                    ))}
                                    {Array.isArray(doubts) && doubts.filter((d: any) => d.type === 'ai').length === 0 && (
                                        <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600 text-xs font-semibold uppercase tracking-wider">
                                            No resolved AI queries in this classroom yet.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "community" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-900 p-4 rounded-xl shadow-sm">
                            <h2 className="text-lg font-bold tracking-tight px-2">Classroom Board</h2>

                            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                                <button
                                    onClick={() => setDoubtFilter('unsolved')}
                                    className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${ doubtFilter === 'unsolved' ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" : "text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200" }`}
                                >
                                    Unsolved
                                </button>
                                <button
                                    onClick={() => setDoubtFilter('in-progress')}
                                    className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${ doubtFilter === 'in-progress' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" : "text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200" }`}
                                >
                                    In Progress
                                </button>
                                <button
                                    onClick={() => setDoubtFilter('solved')}
                                    className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${ doubtFilter === 'solved' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200" }`}
                                >
                                    Resolved
                                </button>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <input
                                    type="text"
                                    value={tagFilter}
                                    onChange={(e) => setTagFilter(e.target.value)}
                                    placeholder="Filter tag"
                                    className="w-full sm:w-32 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                                />
                                {tagFilter && (
                                    <button
                                        onClick={() => setTagFilter("")}
                                        className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsAskModalOpen(true)}
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-md shadow-blue-600/10 flex items-center gap-2 shrink-0"
                                >
                                    <Plus className="w-4 h-4" /> New Post
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="relative flex-1 w-full group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                                <input 
                                    type="text"
                                    placeholder="Search classroom board..."
                                    value={searchVal}
                                    onChange={(e) => setSearchVal(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide w-full md:w-auto">
                                {["All", "Math", "Science", "Physics", "Chemistry", "Programming"].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setSubjectFilter(s)}
                                        className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                                            subjectFilter === s 
                                            ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400" 
                                            : "bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {doubtsLoading ? (
                            <div className="h-[300px] flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                            </div>
                        ) : doubts.length === 0 ? (
                            <div className="py-20 text-center space-y-4 bg-slate-50/30 dark:bg-zinc-950/10 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
                                <div className="w-16 h-16 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                                    <MessageSquare className="w-7 h-7 text-slate-400 dark:text-zinc-600" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                        {searchQuery ? "No matching doubts" : "No community posts yet."}
                                    </h3>
                                    <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium max-w-sm mx-auto leading-relaxed">
                                        {searchQuery 
                                            ? `We couldn't find anything for "${searchQuery}" in this classroom.` 
                                            : "Be the first to start a discussion or ask a question to your classmates."}
                                    </p>
                                </div>
                                {searchQuery ? (
                                    <button 
                                        onClick={() => setSearchVal("")}
                                        className="px-5 py-2 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 mx-auto block shadow-sm"
                                    >
                                        Clear Search
                                    </button>
                                ) : (
                                    <button onClick={() => setIsAskModalOpen(true)} className="text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-xs hover:underline underline-offset-4 mx-auto block transition-all">Be the first to ask</button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {doubtFilter === 'unsolved' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-zinc-900 to-transparent"></div>
                                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-500/5 px-4 py-1.5 rounded-full border border-red-500/10">Unsolved Queries</h3>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-zinc-900 to-transparent"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {Array.isArray(doubts) && doubts.filter((d: any) => d.isSolved === "unsolved" || (!d.isSolved)).map((doubt: any) => (
                                                <DoubtCard key={doubt.id} doubt={doubt} role={classroom?.role} onUpdate={() => mutate()} />
                                            ))}
                                            {(!Array.isArray(doubts) || doubts.filter((d: any) => d.isSolved === "unsolved" || (!d.isSolved)).length === 0) && (
                                                <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600 text-xs font-semibold uppercase tracking-wider opacity-60">
                                                    No unsolved queries in this category.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {doubtFilter === 'in-progress' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-zinc-900 to-transparent"></div>
                                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/5 px-4 py-1.5 rounded-full border border-amber-500/10">In Progress</h3>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-zinc-900 to-transparent"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {Array.isArray(doubts) && doubts.filter((d: any) => d.isSolved === "in-progress").map((doubt: any) => (
                                                <DoubtCard key={doubt.id} doubt={doubt} role={classroom?.role} onUpdate={() => mutate()} />
                                            ))}
                                            {(!Array.isArray(doubts) || doubts.filter((d: any) => d.isSolved === "in-progress").length === 0) && (
                                                <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600 text-xs font-semibold uppercase tracking-wider opacity-60">
                                                    No doubts in progress right now.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {doubtFilter === 'solved' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-zinc-900 to-transparent"></div>
                                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-4 py-1.5 rounded-full border border-emerald-500/10">Resolved & Validated</h3>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-zinc-900 to-transparent"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {Array.isArray(doubts) && doubts.filter((d: any) => d.isSolved === "solved").map((doubt: any) => (
                                                <DoubtCard key={doubt.id} doubt={doubt} role={classroom?.role} onUpdate={() => mutate()} />
                                            ))}
                                            {(!Array.isArray(doubts) || doubts.filter((d: any) => d.isSolved === "solved").length === 0) && (
                                                <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600 text-xs font-semibold uppercase tracking-wider opacity-60">
                                                    No resolved queries yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "teacher-doubts" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-900 p-4 rounded-xl shadow-sm">
                            <h2 className="text-lg font-bold tracking-tight px-2">
                                {classroom?.role === 'teacher' ? <>Students Doubts</> : <>Direct Teacher Doubts</>}
                            </h2>

                            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                                <button
                                    onClick={() => setDoubtFilter('unsolved')}
                                    className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${ doubtFilter === 'unsolved' ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" : "text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200" }`}
                                >
                                    Unsolved
                                </button>
                                <button
                                    onClick={() => setDoubtFilter('in-progress')}
                                    className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${ doubtFilter === 'in-progress' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" : "text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200" }`}
                                >
                                    In Progress
                                </button>
                                <button
                                    onClick={() => setDoubtFilter('solved')}
                                    className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${ doubtFilter === 'solved' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" : "text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200" }`}
                                >
                                    Resolved
                                </button>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <input
                                    type="text"
                                    value={tagFilter}
                                    onChange={(e) => setTagFilter(e.target.value)}
                                    placeholder="Filter tag"
                                    className="w-full sm:w-32 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50"
                                />
                                {tagFilter && (
                                    <button
                                        onClick={() => setTagFilter("")}
                                        className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                    >
                                        Clear
                                    </button>
                                )}
                                {classroom?.role !== 'teacher' && (
                                    <button
                                        onClick={() => setIsAskModalOpen(true)}
                                        className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-md shadow-purple-600/10 flex items-center gap-2 shrink-0"
                                    >
                                        <Plus className="w-4 h-4" /> Ask Teacher
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="relative flex-1 w-full group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-600 group-focus-within:text-purple-500 transition-colors" />
                                <input 
                                    type="text"
                                    placeholder="Search teacher queries..."
                                    value={searchVal}
                                    onChange={(e) => setSearchVal(e.target.value)}
                                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl py-3 pl-11 pr-4 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 transition-all"
                                />
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide w-full md:w-auto">
                                {["All", "Math", "Science", "Physics", "Chemistry", "Programming"].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setSubjectFilter(s)}
                                        className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                                            subjectFilter === s 
                                            ? "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400" 
                                            : "bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                                        }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {doubtsLoading ? (
                            <div className="h-[300px] flex items-center justify-center">
                                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {doubtFilter === 'unsolved' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-zinc-900 to-transparent"></div>
                                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400 bg-red-500/5 px-4 py-1.5 rounded-full border border-red-500/10">Unsolved Doubts</h3>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-slate-200 dark:via-zinc-900 to-transparent"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {Array.isArray(doubts) && doubts.filter((d: any) => d.isSolved === "unsolved" || (!d.isSolved)).map((doubt: any) => (
                                                <DoubtCard key={doubt.id} doubt={doubt} role={classroom?.role} onUpdate={() => mutate()} />
                                            ))}
                                            {(!Array.isArray(doubts) || doubts.filter((d: any) => d.isSolved === "unsolved" || (!d.isSolved)).length === 0) && (
                                                <div className="col-span-full py-20 text-center space-y-4 bg-slate-50/30 dark:bg-zinc-950/10 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm">
                                                    <GraduationCap className="w-12 h-12 text-slate-400 dark:text-zinc-600 mx-auto" />
                                                    <p className="text-slate-500 dark:text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                                                        {classroom?.role === 'teacher' ? "No unsolved doubts from students." : "No unsolved teacher doubts."}
                                                    </p>
                                                    {classroom?.role !== 'teacher' && (
                                                        <button onClick={() => setIsAskModalOpen(true)} className="text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider text-xs hover:underline underline-offset-4">Send the first query</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {doubtFilter === 'in-progress' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r vom-transparent via-slate-200 dark:via-zinc-900 to-transparent"></div>
                                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/5 px-4 py-1.5 rounded-full border border-amber-500/10">In Progress</h3>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r vom-transparent via-slate-200 dark:via-zinc-900 to-transparent"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {Array.isArray(doubts) && doubts.filter((d: any) => d.isSolved === "in-progress").map((doubt: any) => (
                                                <DoubtCard key={doubt.id} doubt={doubt} role={classroom?.role} onUpdate={() => mutate()} />
                                            ))}
                                            {(!Array.isArray(doubts) || doubts.filter((d: any) => d.isSolved === "in-progress").length === 0) && (
                                                <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600 text-xs font-semibold uppercase tracking-wider opacity-60">
                                                    No teacher doubts in progress right now.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {doubtFilter === 'solved' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r vom-transparent via-slate-200 dark:via-zinc-900 to-transparent"></div>
                                            <h3 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-4 py-1.5 rounded-full border border-emerald-500/10">Teacher Resolved</h3>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r vom-transparent via-slate-200 dark:via-zinc-900 to-transparent"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {Array.isArray(doubts) && doubts.filter((d: any) => d.isSolved === "solved").map((doubt: any) => (
                                                <DoubtCard key={doubt.id} doubt={doubt} role={classroom?.role} onUpdate={() => mutate()} />
                                            ))}
                                            {(!Array.isArray(doubts) || doubts.filter((d: any) => d.isSolved === "solved").length === 0) && (
                                                <div className="col-span-full py-12 text-center text-slate-400 dark:text-zinc-600 text-xs font-semibold uppercase tracking-wider opacity-60">
                                                    No resolved queries yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "insights" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                         <ClassroomInsightsView classroomId={Number(id)} role={classroom?.role} />
                    </div>
                )}

                {activeTab !== 'insights' && (
                    <div ref={loadMoreRef} className="py-8 flex justify-center">
                        {isLoadingMore && <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />}
                    </div>
                )}
            </div>

            {isAskModalOpen && (
                <AskDoubt
                    isOpen={isAskModalOpen}
                    onClose={() => setIsAskModalOpen(false)}
                    onSuccess={() => {
                        setIsAskModalOpen(false);
                        mutate();
                    }}
                    classroomId={Number(id)}
                    type={activeTab === 'teacher-doubts' ? 'teacher' : activeTab === 'ask-ai' ? 'ai' : 'community'}
                    defaultSubject={classroom?.name || "General"}
                />
            )}

            {/* CLASS CODE MODAL */}
            {isCodeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xl bg-white/60 dark:bg-black/60 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 w-full max-w-sm rounded-2xl p-6 md:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300 text-slate-900 dark:text-zinc-100">
                         <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <h2 className="text-xl font-bold tracking-tight">Access Key</h2>
                                <p className="text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Invite your students</p>
                            </div>
                            <button
                                onClick={() => setIsCodeModalOpen(false)}
                                className="p-1.5 text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                                aria-label="Close modal"
                            >
                                <Plus className="w-5 h-5 rotate-45" />
                            </button>
                        </div>

                        <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4 relative group overflow-hidden shadow-inner">
                            <code className="text-3xl font-black text-blue-600 dark:text-blue-400 tracking-wider relative z-10">{classroom?.inviteCode}</code>

                            <button
                                onClick={copyCode}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all duration-300 shadow-md shadow-blue-600/10 active:scale-[0.98] relative z-10"
                            >
                                {copied ? (
                                    <><Check className="w-3.5 h-3.5" /> Copied!</>
                                ) : (
                                    <><Copy className="w-3.5 h-3.5" /> Copy Key</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ClassroomInsightsView({ classroomId, role }: { classroomId: number, role?: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const isTeacher = role === 'teacher';

    const fetchData = () => {
        setLoading(true);
        fetch(`/api/analytics?classroomId={classroomId}`)
            .then(res => res.json())
            .then(d => {
                setData(d);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData();
    }, [classroomId]);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-6 h-6 text-purple-500 animate-spin" /></div>;

    const solvedCount = data?.solvedStats?.find((s: any) => s.status === 'solved')?.count || 0;
    const unsolvedCount = data?.solvedStats?.find((s: any) => s.status !== 'solved')?.count || 0;
    const totalDoubtStats = Number(solvedCount) + Number(unsolvedCount);
    const solvedPercentage = totalDoubtStats > 0 ? (Number(solvedCount) / totalDoubtStats) * 100 : 0;

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {!isTeacher && (
                <PersonalMentorView classroomId={classroomId} />
            )}

            <div className="flex items-center justify-between px-2">
                <div className="space-y-0.5">
                    <h2 className="text-xl font-bold tracking-tight">Live Classroom Pulse</h2>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">Real-time pedagogical analytics & student engagement</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    <Activity className={`w-3.5 h-3.5 ${loading ? 'animate-pulse text-purple-500' : ''}`} />
                    {loading ? 'Analyzing...' : 'Refresh Data'}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Active Students", value: data?.engagement?.totalStudents || 0, icon: Users, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10", border: "border-slate-200 dark:border-zinc-900" },
                    { label: "Total Queries", value: data?.engagement?.totalDoubts || 0, icon: MessageSquare, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", border: "border-slate-200 dark:border-zinc-900" },
                    { label: "Community Wisdom", value: data?.engagement?.totalReplies || 0, icon: Activity, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-slate-200 dark:border-zinc-900" },
                ].map((stat, i) => (
                    <div key={i} className={`bg-white/50 dark:bg-zinc-950/30 border ${stat.border} rounded-2xl p-6 backdrop-blur-md flex items-center justify-between hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-slate-200/5 dark:shadow-none group`}>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-0.5">{stat.label}</p>
                            <h4 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{stat.value}</h4>
                        </div>
                        <div className={`p-3.5 ${stat.bg} rounded-xl`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 md:p-8 backdrop-blur-xl flex flex-col justify-between shadow-xl shadow-slate-200/5 dark:shadow-none">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                            <Layers className="w-4 h-4 text-orange-500" /> Topic Difficulty Heatmap
                        </h3>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">By Doubt Volume</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {data?.mostAskedTopics?.map((topic: any, i: number) => {
                            const intensity = Math.min(Number(topic.count) * 10, 100);
                            return (
                                <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative overflow-hidden shadow-sm">
                                    <div
                                        className="absolute inset-0 bg-red-500 pointer-events-none"
                                        style={{ opacity: intensity / 300 }}
                                    />
                                    <div className="relative z-10 space-y-1">
                                        <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{topic.subject}</p>
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500">{topic.count} Doubts</span>
                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${ topic.severity === 'High' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : topic.severity === 'Medium' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' }`}>
                                                {topic.severity}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 md:p-8 backdrop-blur-xl flex flex-col justify-between shadow-xl shadow-slate-200/5 dark:shadow-none">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2 mb-4">
                        <PieChart className="w-4 h-4 text-emerald-500" /> Resolution Pulse
                    </h3>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-2">
                        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-100 dark:text-zinc-900" />
                                <circle
                                    cx="72"
                                    cy="72"
                                    r="64"
                                    stroke="currentColor"
                                    strokeWidth="10"
                                    fill="transparent"
                                    strokeDasharray={2 * Math.PI * 64}
                                    strokeDashoffset={2 * Math.PI * 64 * (1 - solvedPercentage / 100)}
                                    strokeLinecap="round"
                                    className="text-emerald-500 transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black tracking-tight">{Math.round(solvedPercentage)}%</span>
                                <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Resolved</span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4 font-semibold text-sm w-full sm:w-auto">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Solved Doubts</p>
                                    <p className="text-slate-400 dark:text-zinc-500 text-[11px] mt-0.5">{solvedCount} queries</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <div>
                                    <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">Unsolved Doubts</p>
                                    <p className="text-slate-400 dark:text-zinc-500 text-[11px] mt-0.5">{unsolvedCount} queries</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-2xl p-6 space-y-6 shadow-sm backdrop-blur-sm">
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 dark:border-zinc-900 pb-4">
                    <Trophy className="w-4 h-4 text-amber-500" /> Top Contributors
                </h3>
                {data?.topContributors && data.topContributors.length > 0 ? (
                    <div className="grid gap-3">
                        {(() => {
                            const rankStyles = [
                                { bg: 'bg-purple-500/[0.04] dark:bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-600 dark:text-purple-400', icon: <Trophy className="w-4 h-4 text-amber-500" /> },
                                { bg: 'bg-slate-50/50 dark:bg-zinc-900/40', border: 'border-slate-200/60 dark:border-zinc-800/60', text: 'text-slate-500 dark:text-zinc-400', icon: <Medal className="w-4 h-4 text-slate-400 dark:text-zinc-400" /> },
                                { bg: 'bg-slate-50/50 dark:bg-zinc-900/40', border: 'border-slate-200/60 dark:border-zinc-800/60', text: 'text-slate-500 dark:text-zinc-400', icon: <Medal className="w-4 h-4 text-orange-600 dark:text-orange-400" /> },
                            ];
                            return data.topContributors.map((contributor: any, i: number) => {
                                const style = rankStyles[i] || { bg: 'bg-slate-50/30 dark:bg-zinc-900/20', border: 'border-slate-100 dark:border-zinc-900', text: 'text-slate-400 dark:text-zinc-500', icon: null };
                                return (
                                    <div
                                        key={`${contributor.name}-${i}`}
                                        className={`flex items-center gap-4 ${style.bg} border ${style.border} rounded-xl p-4 hover:scale-[1.005] transition-all duration-300 shadow-sm`}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center shrink-0">
                                            {style.icon || <span className="text-xs font-bold text-slate-400">{i + 1}</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate text-slate-900 dark:text-white uppercase tracking-wider">
                                                {contributor.name}
                                            </p>
                                            <p className="text-[10px] font-semibold text-slate-400 dark:text-zinc-500 mt-0.5">
                                                {i === 0 ? '👑 Top Helper' : i === 1 ? '🥈 Rising Star' : i === 2 ? '🥉 Consistent' : `Rank #${i + 1}`}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-lg font-black text-purple-600 dark:text-purple-400 tracking-tight">{contributor.replyCount}</p>
                                            <p className="text-[9px] font-bold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Replies</p>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                ) : (
                    <div className="py-8 text-center space-y-2">
                        <Trophy className="w-8 h-8 text-slate-300 dark:text-zinc-700 mx-auto" />
                        <p className="text-slate-400 dark:text-zinc-500 font-semibold text-xs uppercase tracking-wider">No community replies yet. Be the first to help!</p>
                    </div>
                )}
            </div>

            <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl shadow-slate-200/5 dark:shadow-none space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-500" /> Peak Activity Timeline
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Student Activity Hours</span>
                    </div>
                </div>
                <div className="grid grid-cols-24 gap-1 h-24 items-end pt-2">
                    {Array.from({ length: 24 }).map((_, hour) => {
                        const activity = data?.peakTime?.find((p: any) => p.hour === hour)?.count || 0;
                        const heightPercentage = Math.min((activity / 10) * 100, 100);
                        return (
                            <div key={hour} className="group relative flex flex-col items-center h-full justify-end gap-1.5">
                                <div
                                    className="w-full bg-purple-500/80 dark:bg-purple-500/60 rounded-t-sm group-hover:bg-purple-600 transition-all duration-300"
                                    style={{ height: `${Math.max(heightPercentage, 4)}%` }}
                                />
                                <span className="text-[8px] font-bold text-slate-400 dark:text-zinc-600">
                                    {hour}
                                </span>
                                <div className="absolute bottom-full mb-1 bg-zinc-900 text-white px-2 py-1 rounded text-[9px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                                    {activity} Doubts @ {hour}:00
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-2 px-2 mt-8">
                    <Zap className="w-4 h-4 text-yellow-500" /> AI Pedagogical Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {data?.mostAskedTopics?.filter((t: any) => t.severity !== 'Low').length > 0 ? (
                        data?.mostAskedTopics?.filter((t: any) => t.severity !== 'Low').map((topic: any, i: number) => (
                            <div key={i} className="bg-purple-500/[0.02] border border-slate-200 dark:border-zinc-900 rounded-2xl p-6 flex items-start gap-4 relative overflow-hidden shadow-sm backdrop-blur-sm">
                                <div className="absolute top-0 right-0 p-3 bg-slate-50 dark:bg-zinc-900 border-l border-b border-slate-100 dark:border-zinc-800 rounded-bl-xl shadow-inner">
                                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                                </div>
                                <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${ topic.severity === 'High' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-orange-500/10 text-orange-600 dark:text-orange-400' }`}>
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div className="space-y-2 flex-1 pr-4">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{topic.subject} struggle detected</h4>
                                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-medium">
                                        {topic.suggestion}
                                    </p>
                                    <div className="pt-1">
                                        <button className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:gap-2 transition-all duration-300">
                                            Prepare Revision Materials <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-12 text-center bg-slate-50/30 dark:bg-zinc-950/10 border border-dashed border-slate-200 dark:border-zinc-900 rounded-2xl space-y-2">
                            <Sparkles className="w-8 h-8 text-emerald-500 mx-auto" />
                            <p className="text-slate-400 dark:text-zinc-500 font-semibold text-xs uppercase tracking-wider">Curriculum looks healthy. No major Concept blockers detected.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function PersonalMentorView({ classroomId }: { classroomId: number }) {
    const [personalData, setPersonalData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/analytics/personal?classroomId=${classroomId}`)
            .then(res => res.json())
            .then(d => {
                setPersonalData(d);
                setLoading(false);
            });
    }, [classroomId]);

    if (loading) return (
        <div className="bg-slate-50/50 dark:bg-zinc-950/10 border border-slate-200 dark:border-zinc-900 rounded-2xl p-8 text-center shadow-inner">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin mx-auto mb-2" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Consulting AI Learning Mentor...</p>
        </div>
    );

    if (!personalData?.isEngaged) return (
        <div className="bg-purple-500/[0.01] border border-dashed border-slate-200 dark:border-zinc-900 rounded-2xl p-8 text-center space-y-2 shadow-sm backdrop-blur-sm">
            <Sparkles className="w-8 h-8 text-purple-500/30 mx-auto animate-pulse" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-300 tracking-tight">Unlock Your AI Mentor</h3>
            <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm mx-auto leading-relaxed font-medium">
                {personalData?.message || "Ask more doubts to unlock personalized AI Weak Topic Detection!"}
            </p>
        </div>
    );

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-1000">
            <div className="bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 p-[1px] rounded-2xl shadow-xl shadow-slate-100/50 dark:shadow-none">
                <div className="bg-white/80 dark:bg-zinc-950/40 backdrop-blur-xl rounded-[15px] p-6 flex flex-col sm:flex-row items-center gap-6 overflow-hidden relative">
                    <div className="relative shrink-0">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg relative z-10">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <div className="space-y-2 flex-1 text-center sm:text-left relative z-10 w-full min-w-0">
                        <div className="inline-flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full mb-1">
                            <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Personalized Strategy</span>
                        </div>
                        <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Your Learning Mentor Insight</h3>
                        <p className="text-sm text-slate-600 dark:text-zinc-300 font-medium leading-relaxed italic border-l-2 border-purple-500/30 pl-4 py-1 text-left">
                            &ldquo;{personalData.insight}&nbsp;&rdquo;
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-2">
                            <Target className="w-4 h-4 text-red-500" /> Improvement Targets
                        </h4>
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">High Priority</span>
                    </div>
                    <div className="grid gap-4">
                        {personalData.weakTopics.map((topic: any, i: number) => (
                            <div key={i} className="bg-white dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-900 rounded-2xl p-5 hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-all duration-300 group shadow-sm flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-base font-bold text-slate-900 dark:text-white tracking-tight">{topic.topic}</span>
                                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 shrink-0">
                                        {topic.confidence} Signal
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium leading-relaxed">
                                    {topic.reason}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-2 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-500" /> Actionable Recommendations
                    </h4>
                    <div className="bg-emerald-500/[0.01] border border-slate-200 dark:border-zinc-900 rounded-2xl p-6 space-y-6 shadow-sm backdrop-blur-sm">
                        <div className="space-y-2 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-sm">
                                    <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Quick Concept Refresh</p>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed font-bold italic">&ldquo;{personalData.recommendations.conceptExplainer}&nbsp;&rdquo;</p>
                        </div>

                        <div className="h-[1px] bg-slate-100 dark:bg-zinc-900 w-full relative z-10" />

                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-sm">
                                    <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Recommended Challenges</p>
                            </div>
                            <div className="grid gap-3">
                                {personalData.recommendations.practiceQuestions.map((q: string, i: number) => (
                                    <div key={i} className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-emerald-500/30 transition-all duration-300 shadow-sm">
                                        <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{i+1}</span>
                                        </div>
                                        <p className="text-xs font-semibold text-slate-700 dark:text-zinc-300 tracking-tight">{q}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}