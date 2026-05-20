"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useHotkeys } from "react-hotkeys-hook";
import { useAppUser } from "../../provider";
import {
    Brain,
    MessageSquare,
    TrendingUp,
    Users,
    Settings,
    Plus,
    Loader2,
    Sparkles,
    ChevronLeft,
    School,
    GraduationCap,
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
    Trophy,
    Medal
} from "lucide-react";
import AskDoubt from "@/components/AskDoubt";
import DoubtCard from "@/components/DoubtCard";
import Dashboard from "@/app/dashboard/page"; // We can reuse or adapt the Analytics view
import AskAIView from "../../../components/AskAIView";
import ExportButton from "@/components/ExportButton";
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
    const { appUser } = useAppUser();

    const [classroom, setClassroom] = useState<Classroom | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("ask-ai");
    const [activeAIDoubt, setActiveAIDoubt] = useState<any>(null);
    const [isAskModalOpen, setIsAskModalOpen] = useState(false);
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [doubtFilter, setDoubtFilter] = useState<'pending' | 'solved'>('pending');

    const type = activeTab === 'teacher-doubts' ? 'teacher' : activeTab === 'community' ? 'community' : 'ai';
    const userName = typeof window !== 'undefined' ? localStorage.getItem("anonymous_user") : "";

    const fetcher = (url: string) => fetch(url).then(res => res.json());
    const getKey = (pageIndex: number, previousPageData: any[]) => {
        if (previousPageData && !previousPageData.length) return null; // reached the end
        if (activeTab === 'insights') return null;
        const params = new URLSearchParams({
            classroomId: String(id),
            userName: userName || "",
            type: String(type),
            page: String(pageIndex + 1),
            limit: "20"
        });
        if (tagFilter.trim()) params.append("tag", tagFilter.trim());
        return `/api/doubts?${params.toString()}`;
    };

    const { data, error, isLoading: doubtsLoading, size, setSize, mutate } = useSWRInfinite(getKey, fetcher, {
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
    const [tagFilter, setTagFilter] = useState("");

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

    const fetchClassroom = async () => {
        // This is now handled by initialFetch, but keeping a simplified version for refresh if needed
        try {
            const res = await fetch(`/api/rooms/${id}`);
            const data = await res.json();
            if (res.ok) setClassroom(data);
        } catch (err) {
            console.error("Error refreshing classroom:", err);
        }
    };

    const fetchScopedDoubts = async (type: string = 'community') => {
        mutate();
    };

    useEffect(() => {
        // SWR will handle refetching automatically when the key (which includes activeTab and tagFilter) changes.
        // We can still call mutate() if we want to force a refresh.
    }, [activeTab, tagFilter]);

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
            <div className="h-[calc(100vh-80px)] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!classroom) return null;

    return (
        <div className="relative overflow-hidden">
            {/* Header / Banner */}
            <div className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 pt-4 sm:pt-6 pb-4 sm:pb-6 px-4 sm:px-6 md:px-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <button
                            onClick={() => router.push("/rooms")}
                            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest w-fit shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4" /> Back to Campus
                        </button>

                        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto justify-start sm:justify-end">
                            <ExportButton 
                                classroomId={String(id)} 
                                classroomName={classroom?.name || ""} 
                                isTeacher={classroom?.role === "teacher"} 
                            />
                            <button
                                onClick={() => setIsCodeModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 hover:text-white transition-all shadow-inner shrink-0"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Class Code
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mt-4 min-w-0">
                        <div className="space-y-4 min-w-0">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl font-black italic shrink-0">
                                    {classroom.name.charAt(0)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tighter truncate sm:overflow-visible sm:whitespace-normal">
                                        {classroom.name}
                                    </h1>
                                    <div className="flex items-center gap-2 sm:gap-4 flex-wrap text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                                        <span className="flex items-center gap-1.5"><School className="w-3.5 h-3.5 shrink-0" /> {classroom.university}</span>
                                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0" /> {classroom.year}</span>
                                        <span className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">{classroom.role}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap scroll-smooth pb-2 scrollbar-hide w-full xl:w-auto max-w-full">
                            {[
                                { id: "ask-ai", label: "Ask AI", icon: Brain },
                                { id: "community", label: "Community", icon: MessageSquare },
                                { id: "teacher-doubts", label: classroom?.role === 'teacher' ? "Students Doubt" : "Ask Teacher", icon: GraduationCap },
                                { id: "insights", label: "Insights", icon: TrendingUp }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 whitespace-nowrap ${
                                        activeTab === tab.id 
                                        ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" 
                                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                                    }`}
                                >
                                    <tab.icon className="w-4 h-4 shrink-0" /> {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto p-4 md:py-8 md:px-12">
                {activeTab === "ask-ai" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                        <div className="space-y-8">
                            <h2 className="text-2xl font-black uppercase italic tracking-tight text-center">ASK <span className="text-blue-500">AI Teacher</span></h2>
                            <div className="max-w-3xl mx-auto">
                                <AskAIView 
                                    classroomId={Number(id)} 
                                    onSuccess={() => mutate()} 
                                    initialDoubt={activeAIDoubt}
                                />
                            </div>
                        </div>

                        {/* Recent AI Queries List */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-6">
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                                <div className="flex flex-col items-center">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/60 bg-blue-500/5 px-6 py-2 rounded-full border border-blue-500/10">Neural Resolve History</h3>
                                </div>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                            </div>

                            {doubtsLoading ? (
                                <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 text-blue-500 animate-spin" /></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {Array.isArray(doubts) && doubts.filter((d: any) => d.type === 'ai').map((doubt: any) => (
                                        <DoubtCard
                                            key={doubt.id}
                                            doubt={doubt}
                                            role={classroom?.role}
                                            onUpdate={() => fetchScopedDoubts('ai')}
                                            onViewAISolution={(d) => {
                                                setActiveAIDoubt(d);
                                                setActiveTab("ask-ai");
                                            }}
                                        />
                                    ))}
                                    {Array.isArray(doubts) && doubts.filter((d: any) => d.type === 'ai').length === 0 && (
                                        <div className="col-span-full py-12 text-center text-slate-500 text-xs font-bold uppercase tracking-widest opacity-30">
                                            No resolved AI queries in this classroom yet.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "community" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/[0.02] border border-white/5 p-4 rounded-[2rem]">
                            <h2 className="text-2xl font-black uppercase italic tracking-tight px-4">Classroom <span className="text-blue-500">Board</span></h2>

                            <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-2xl border border-white/5">
                                <button
                                    onClick={() => setDoubtFilter('pending')}
                                    className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                        doubtFilter === 'pending'
                                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                        : "text-slate-500 hover:text-white"
                                    }`}
                                >
                                    Pending
                                </button>
                                <button
                                    onClick={() => setDoubtFilter('solved')}
                                    className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                        doubtFilter === 'solved'
                                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                        : "text-slate-500 hover:text-white"
                                    }`}
                                >
                                    Resolved
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={tagFilter}
                                    onChange={(e) => setTagFilter(e.target.value)}
                                    placeholder="Filter tag"
                                    className="w-32 bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                                />
                                {tagFilter && (
                                    <button
                                        onClick={() => setTagFilter("")}
                                        className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <button
                                onClick={() => setIsAskModalOpen(true)}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 shrink-0"
                            >
                                <Plus className="w-4 h-4" /> New Post
                            </button>
                        </div>

                        {doubtsLoading ? (
                            <div className="h-[300px] flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            </div>
                        ) : doubts.length === 0 ? (
                            <div className="py-24 text-center space-y-4 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem]">
                                <MessageSquare className="w-12 h-12 text-slate-700 mx-auto" />
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No community posts yet.</p>
                                <button onClick={() => setIsAskModalOpen(true)} className="text-blue-500 font-black uppercase tracking-widest text-[10px] hover:underline underline-offset-4">Be the first to ask</button>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {doubtFilter === 'pending' ? (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent"></div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500/60 bg-red-500/5 px-4 py-1.5 rounded-full border border-red-500/10">Unsolved Queries</h3>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {Array.isArray(doubts) && doubts.filter((d: any) => d.isSolved !== "solved").map((doubt: any) => (
                                                <DoubtCard key={doubt.id} doubt={doubt} role={classroom?.role} onUpdate={() => mutate()} />
                                             ))}
                                            {(!Array.isArray(doubts) || doubts.filter((d: any) => d.isSolved !== "solved").length === 0) && (
                                                <div className="col-span-full py-12 text-center text-slate-500 text-[10px] uppercase font-black tracking-widest opacity-40">
                                                    No pending queries in this category.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/60 bg-emerald-500/5 px-4 py-1.5 rounded-full border border-emerald-500/10">Resolved & Validated</h3>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {Array.isArray(doubts) && doubts.filter((d: any) => d.isSolved === "solved").map((doubt: any) => (
                                                <DoubtCard key={doubt.id} doubt={doubt} role={classroom?.role} onUpdate={() => mutate()} />
                                            ))}
                                            {(!Array.isArray(doubts) || doubts.filter((d: any) => d.isSolved === "solved").length === 0) && (
                                                <div className="col-span-full py-12 text-center text-slate-500 text-[10px] uppercase font-black tracking-widest opacity-40">
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
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/[0.02] border border-white/5 p-4 rounded-[2rem]">
                            <h2 className="text-2xl font-black uppercase italic tracking-tight px-4">
                                {classroom?.role === 'teacher' ? <><span className="text-purple-500">Students</span> Doubts</> : <>Direct <span className="text-purple-500">Teacher Doubts</span></>}
                            </h2>

                            <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-2xl border border-white/5">
                                <button
                                    onClick={() => setDoubtFilter('pending')}
                                    className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                        doubtFilter === 'pending'
                                        ? "bg-red-500/10 text-red-500 border border-red-500/20"
                                        : "text-slate-500 hover:text-white"
                                    }`}
                                >
                                    Pending
                                </button>
                                <button
                                    onClick={() => setDoubtFilter('solved')}
                                    className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                        doubtFilter === 'solved'
                                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                        : "text-slate-500 hover:text-white"
                                    }`}
                                >
                                    Resolved
                                </button>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={tagFilter}
                                    onChange={(e) => setTagFilter(e.target.value)}
                                    placeholder="Filter tag"
                                    className="w-32 bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
                                />
                                {tagFilter && (
                                    <button
                                        onClick={() => setTagFilter("")}
                                        className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {classroom?.role !== 'teacher' && (
                                <button
                                    onClick={() => setIsAskModalOpen(true)}
                                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 shrink-0"
                                >
                                    <Plus className="w-4 h-4" /> Ask Teacher
                                </button>
                            )}
                        </div>

                        {doubtsLoading ? (
                            <div className="h-[300px] flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                {doubtFilter === 'pending' ? (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent"></div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500/60 bg-red-500/5 px-4 py-1.5 rounded-full border border-red-500/10">Pending Doubts</h3>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-red-500/20 to-transparent"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {Array.isArray(doubts) && doubts.filter((d: any) => d.isSolved !== "solved").map((doubt: any) => (
                                                <DoubtCard key={doubt.id} doubt={doubt} role={classroom?.role} onUpdate={() => mutate()} />
                                            ))}
                                            {(!Array.isArray(doubts) || doubts.filter((d: any) => d.isSolved !== "solved").length === 0) && (
                                                <div className="col-span-full py-24 text-center space-y-4 bg-white/5 border border-dashed border-white/10 rounded-[2.5rem]">
                                                    <GraduationCap className="w-12 h-12 text-slate-700 mx-auto" />
                                                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                                                        {classroom?.role === 'teacher' ? "No doubts from students yet." : "No teacher doubts yet."}
                                                    </p>
                                                    {classroom?.role !== 'teacher' && (
                                                        <button onClick={() => setIsAskModalOpen(true)} className="text-purple-500 font-black uppercase tracking-widest text-[10px] hover:underline underline-offset-4">Send the first query</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="flex items-center gap-4">
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/60 bg-emerald-500/5 px-4 py-1.5 rounded-full border border-emerald-500/10">Teacher Resolved</h3>
                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {Array.isArray(doubts) && doubts.filter((d: any) => d.isSolved === "solved").map((doubt: any) => (
                                                <DoubtCard key={doubt.id} doubt={doubt} role={classroom?.role} onUpdate={() => mutate()} />
                                            ))}
                                            {(!Array.isArray(doubts) || doubts.filter((d: any) => d.isSolved === "solved").length === 0) && (
                                                <div className="col-span-full py-12 text-center text-slate-500 text-[10px] uppercase font-black tracking-widest opacity-40">
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
                         {/* We can pass classroomId to the dashboard view */}
                         <ClassroomInsightsView classroomId={Number(id)} role={classroom?.role} />
                    </div>
                )}

                {activeTab !== 'insights' && (
                    <div ref={loadMoreRef} className="py-8 flex justify-center">
                        {isLoadingMore && <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />}
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-[#020617]/80 animate-in fade-in duration-300">
                    <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
                         <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-black uppercase tracking-tighter">Access <span className="text-blue-500">Key</span></h2>
                                <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Invite your students</p>
                            </div>
                            <button
                                onClick={() => setIsCodeModalOpen(false)}
                                className="p-2 text-slate-500 hover:text-white transition-colors"
                                aria-label="Close modal"
                            >
                                <Plus className="w-5 h-5 rotate-45" />
                            </button>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between gap-6 relative group overflow-hidden">
                            <div className="absolute inset-0 bg-blue-600/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <code className="text-4xl font-black text-blue-400 tracking-[0.2em] relative z-10">{classroom?.inviteCode}</code>

                            <button
                                onClick={copyCode}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] relative z-10"
                            >
                                {copied ? (
                                    <><Check className="w-4 h-4 text-white" /> Copied!</>
                                ) : (
                                    <><Copy className="w-4 h-4 text-white" /> Copy Code</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple implementations for sub-views or we can extract them later
function ClassroomInsightsView({ classroomId, role }: { classroomId: number, role?: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const isTeacher = role === 'teacher';

    const fetchData = () => {
        setLoading(true);
        fetch(`/api/analytics?classroomId=${classroomId}`)
            .then(res => res.json())
            .then(d => {
                setData(d);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData();
    }, [classroomId]);

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;

    const solvedCount = data?.solvedStats.find((s: any) => s.status === 'solved')?.count || 0;
    const unsolvedCount = data?.solvedStats.find((s: any) => s.status !== 'solved')?.count || 0;
    const totalDoubtStats = Number(solvedCount) + Number(unsolvedCount);
    const solvedPercentage = totalDoubtStats > 0 ? (Number(solvedCount) / totalDoubtStats) * 100 : 0;

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* AI Learning Mentor for Students */}
            {!isTeacher && (
                <PersonalMentorView classroomId={classroomId} />
            )}

            {/* Header with Refresh */}
            <div className="flex items-center justify-between px-2">
                <div className="space-y-1">
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter">Live Classroom <span className="text-blue-500">Pulse</span></h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Real-time pedagogical analytics & student engagement</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-blue-400 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Activity className={`w-3.5 h-3.5 ${loading ? 'animate-pulse text-blue-500' : 'group-hover:rotate-12'} transition-all`} />
                    {loading ? 'Analyzing...' : 'Refresh Data'}
                </button>
            </div>

            {/* 1. Executive Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Active Students", value: data?.engagement?.totalStudents || 0, icon: Users, color: "blue" },
                    { label: "Total Queries", value: data?.engagement?.totalDoubts || 0, icon: MessageSquare, color: "purple" },
                    { label: "Community Wisdom", value: data?.engagement?.totalReplies || 0, icon: Activity, color: "emerald" },
                ].map((stat, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 flex items-center justify-between group hover:bg-white/[0.07] transition-all">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">{stat.label}</p>
                            <h4 className="text-4xl font-black italic tracking-tighter">{stat.value}</h4>
                        </div>
                        <div className={`w-14 h-14 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center border border-${stat.color}-500/20 group-hover:scale-110 transition-transform`}>
                            <stat.icon className={`w-6 h-6 text-${stat.color}-500`} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* 2. Difficulty Heatmap / Most Confusing Topics */}
                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
                            <Layers className="w-5 h-5 text-orange-500" /> Topic Difficulty Heatmap
                        </h3>
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">By Doubt Volume</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {data?.mostAskedTopics.map((topic: any, i: number) => {
                            const intensity = Math.min(Number(topic.count) * 10, 100);
                            return (
                                <div key={i} className="p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
                                    <div
                                        className="absolute inset-0 bg-red-500 transition-opacity duration-500 pointer-events-none"
                                        style={{ opacity: intensity / 300 }}
                                    />
                                    <div className="relative z-10 space-y-2">
                                        <p className="text-sm font-bold text-white uppercase tracking-tight">{topic.subject}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{topic.count} Doubts</span>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                                topic.severity === 'High' ? 'bg-red-500/20 text-red-500' :
                                                topic.severity === 'Medium' ? 'bg-orange-500/20 text-orange-500' :
                                                'bg-emerald-500/20 text-emerald-500'
                                            }`}>
                                                {topic.severity}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Resolved vs Unresolved Doubts */}
                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 space-y-10">
                    <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
                        <PieChart className="w-5 h-5 text-emerald-500" /> Resolution Pulse
                    </h3>
                    <div className="flex flex-col items-center justify-center py-4 space-y-8">
                        <div className="relative w-48 h-48 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                                <circle
                                    cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent"
                                    strokeDasharray={2 * Math.PI * 80}
                                    strokeDashoffset={2 * Math.PI * 80 * (1 - solvedPercentage / 100)}
                                    strokeLinecap="round"
                                    className="text-emerald-500 transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-4xl font-black italic tracking-tighter">{Math.round(solvedPercentage)}%</span>
                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Resolved</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-12 w-full max-w-xs">
                           <div className="text-center">
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Solved</p>
                                <p className="text-2xl font-black italic">{solvedCount}</p>
                           </div>
                           <div className="text-center">
                                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Unsolved</p>
                                <p className="text-2xl font-black italic">{unsolvedCount}</p>
                           </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Contributors Leaderboard */}
            <div className="bg-gradient-to-br from-amber-500/5 via-white/5 to-yellow-500/5 border border-white/10 rounded-[3rem] p-10 space-y-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3 group-hover:bg-amber-500/10 transition-all duration-700" />
                <div className="flex items-center justify-between relative z-10">
                    <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
                        <Trophy className="w-5 h-5 text-amber-400" /> Top Contributors
                    </h3>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Community Heroes</span>
                </div>
                {data?.topContributors && data.topContributors.length > 0 ? (
                    <div className="space-y-3 relative z-10">
                        {(() => {
                            const rankStyles = [
                                { bg: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20', border: 'border-amber-500/30', text: 'text-amber-400', icon: <Trophy className="w-5 h-5 text-amber-400" />, glow: 'shadow-lg shadow-amber-500/10' },
                                { bg: 'bg-gradient-to-r from-slate-300/10 to-slate-400/10', border: 'border-slate-400/20', text: 'text-slate-300', icon: <Medal className="w-5 h-5 text-slate-300" />, glow: '' },
                                { bg: 'bg-gradient-to-r from-orange-700/10 to-orange-600/10', border: 'border-orange-700/20', text: 'text-orange-400', icon: <Medal className="w-5 h-5 text-orange-400" />, glow: '' },
                            ];
                            return data.topContributors.map((contributor: any, i: number) => {
                                const style = rankStyles[i] || { bg: 'bg-white/5', border: 'border-white/10', text: 'text-slate-400', icon: null, glow: '' };
                                return (
                                    <div
                                        key={`${contributor.name}-${i}`}
                                        className={`flex items-center gap-5 ${style.bg} border ${style.border} rounded-2xl p-5 hover:scale-[1.01] transition-all duration-300 ${style.glow}`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${i < 3 ? style.bg : 'bg-white/10'} border ${style.border}`}>
                                            {style.icon || <span className={`text-sm font-black ${style.text}`}>{i + 1}</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-black uppercase tracking-tight truncate ${i === 0 ? 'text-amber-300' : 'text-white'}`}>
                                                {contributor.name}
                                            </p>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">
                                                {i === 0 ? '👑 Top Helper' : i === 1 ? '🥈 Rising Star' : i === 2 ? '🥉 Consistent' : `Rank #${i + 1}`}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`text-2xl font-black italic tracking-tighter ${style.text}`}>{contributor.replyCount}</p>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Replies</p>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                ) : (
                    <div className="py-12 text-center space-y-3 relative z-10">
                        <Trophy className="w-10 h-10 text-slate-700 mx-auto" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No community replies yet. Be the first to help!</p>
                    </div>
                )}
            </div>

            {/* 4. Peak Doubt Time Heatmap */}
            <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
                        <Clock className="w-5 h-5 text-purple-500" /> Peak Activity Timeline
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Student Activity Hours</span>
                    </div>
                </div>
                <div className="grid grid-cols-24 gap-1 h-32 items-end pt-4">
                    {Array.from({ length: 24 }).map((_, hour) => {
                        const activity = data?.peakTime.find((p: any) => p.hour === hour)?.count || 0;
                        const heightPercentage = Math.min((activity / 10) * 100, 100);
                        return (
                            <div key={hour} className="group relative flex flex-col items-center gap-2">
                                <div
                                    className="w-full bg-gradient-to-t from-purple-600 to-blue-400 rounded-t-md hover:from-white hover:to-white transition-all duration-500"
                                    style={{ height: `${Math.max(heightPercentage, 2)}%` }}
                                />
                                <span className="text-[7px] font-black text-slate-600 uppercase group-hover:text-white transition-colors">
                                    {hour}h
                                </span>
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 bg-white text-[#020617] p-2 rounded-lg text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                    {activity} Doubts @ {hour}:00
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 5. AI Teaching Suggestions */}
            <div className="space-y-8">
                <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3 px-2 mt-12 pb-4">
                    <Zap className="w-5 h-5 text-yellow-400" /> AI Pedagogical Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {data?.mostAskedTopics.filter((t: any) => t.severity !== 'Low').length > 0 ? (
                        data?.mostAskedTopics.filter((t: any) => t.severity !== 'Low').map((topic: any, i: number) => (
                            <div key={i} className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/10 rounded-[2.5rem] p-8 flex items-start gap-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 border-l border-b border-white/5 bg-white/5 rounded-bl-3xl">
                                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                                </div>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                    topic.severity === 'High' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'
                                }`}>
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-lg font-black uppercase italic tracking-tight">{topic.subject} struggle detected</h4>
                                    <p className="text-sm text-slate-400 leading-relaxed font-medium">
                                        {topic.suggestion}
                                    </p>
                                    <div className="pt-2">
                                        <button className="text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2 hover:gap-3 transition-all">
                                            Prepare Revision Materials <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-16 text-center bg-white/5 border border-dashed border-white/10 rounded-[3rem] space-y-4">
                            <Sparkles className="w-10 h-10 text-emerald-500 mx-auto" />
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Curriculum looks healthy. No major Concept blockers detected.</p>
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
        <div className="bg-white/5 border border-white/10 rounded-[3rem] p-12 text-center">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Consulting AI Learning Mentor...</p>
        </div>
    );

    if (!personalData?.isEngaged) return (
        <div className="bg-gradient-to-br from-blue-600/5 to-purple-600/5 border border-dashed border-white/10 rounded-[3rem] p-12 text-center space-y-4">
            <Sparkles className="w-12 h-12 text-blue-500/30 mx-auto" />
            <h3 className="text-xl font-black uppercase italic tracking-tight text-white/80">Unlock Your <span className="text-blue-500">AI Mentor</span></h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
                {personalData?.message || "Ask more doubts to unlock personalized AI Weak Topic Detection!"}
            </p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-1000">
            {/* AI Learning Mentor Header */}
            <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 p-[1px] rounded-[3rem] shadow-2xl">
                <div className="bg-slate-950/40 backdrop-blur-xl rounded-[2.9rem] p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 blur-[100px] rounded-full -ml-32 -mb-32"></div>

                    <div className="relative shrink-0">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2rem] flex items-center justify-center shadow-2xl relative z-10 group">
                            <Brain className="w-12 h-12 text-white group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div className="absolute -top-4 -right-4 bg-emerald-500 text-white text-[8px] font-black uppercase px-3 py-1.5 rounded-full border-4 border-slate-950 shadow-xl z-20 animate-bounce">Live Mentor</div>
                    </div>
                    <div className="space-y-4 flex-1 text-center md:text-left relative z-10">
                        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full mb-2">
                            <Sparkles className="w-3 h-3 text-blue-400" />
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Personalized Strategy</span>
                        </div>
                        <h3 className="text-3xl font-black uppercase italic tracking-tighter">Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Learning Mentor</span> Insight</h3>
                        <p className="text-lg text-slate-300 font-medium leading-relaxed italic border-l-2 border-blue-500/30 pl-6 py-2">
                           "{personalData.insight}"
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Weak Topics */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3">
                            <Target className="w-4 h-4 text-red-500" /> Improvement Targets
                        </h4>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">High Priority</span>
                    </div>
                    <div className="grid gap-4">
                        {personalData.weakTopics.map((topic: any, i: number) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 hover:bg-white/[0.08] transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <span className="text-xl font-black text-white italic tracking-tight">{topic.topic}</span>
                                    <div className="flex flex-col items-end">
                                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20`}>
                                            {topic.confidence} Strength Signal
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed relative z-10">
                                    {topic.reason}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-2 flex items-center gap-3">
                        <Zap className="w-4 h-4 text-emerald-500" /> Actionable Recommendations
                    </h4>
                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[3rem] p-8 space-y-8 relative overflow-hidden group">
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/20 transition-all"></div>

                        <div className="space-y-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                                    <Zap className="w-4 h-4 text-emerald-500" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Quick Concept Refresh</p>
                            </div>
                            <p className="text-base text-slate-300 leading-relaxed font-bold italic">"{personalData.recommendations.conceptExplainer}"</p>
                        </div>

                        <div className="h-[1px] bg-emerald-500/10 w-full relative z-10" />

                        <div className="space-y-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/20">
                                    <Activity className="w-4 h-4 text-blue-500" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Recommended Challenges</p>
                            </div>
                            <div className="grid gap-3">
                                {personalData.recommendations.practiceQuestions.map((q: string, i: number) => (
                                    <div key={i} className="flex items-center gap-4 bg-slate-950/50 p-5 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all cursor-default">
                                        <div className="w-6 h-6 rounded-lg bg-emerald-600/20 flex items-center justify-center shrink-0">
                                            <span className="text-[10px] font-black text-emerald-500">{i+1}</span>
                                        </div>
                                        <p className="text-sm text-slate-300 font-black tracking-tight">{q}</p>
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
