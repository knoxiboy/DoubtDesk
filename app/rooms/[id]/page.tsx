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
import Dashboard from "@/app/dashboard/page"; 
import AskAIView from "../../../components/AskAIView"; 
import InfiniteDoubtFeed from "@/components/InfiniteDoubtFeed";
import ExportButton from "@/components/ExportButton";
import { toast } from "sonner";
import { useSWRConfig } from "swr";

interface Classroom {
    id: number;
    name: string;
    university: string;
    year: string;
    teacherEmail: string;
    inviteCode: string;
    role: "teacher" | "student";
}

export default function ClassroomPage() {
    const { id } = useParams();
    const router = useRouter();
    const { appUser } = useAppUser();
    const { mutate } = useSWRConfig();
    
    const [classroom, setClassroom] = useState<Classroom | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("community");
    const [activeAIDoubt, setActiveAIDoubt] = useState<any>(null);
    const [isAskModalOpen, setIsAskModalOpen] = useState(false);
    const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [doubtFilter, setDoubtFilter] = useState<'pending' | 'solved' | 'All'>('All');
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
            const res = await fetch(`/api/rooms/${id}`);
            const data = await res.json();

            if (res.ok) {
                setClassroom(data);
            } else {
                toast.error(data.error || "Error loading classroom");
                router.push("/rooms");
            }
        } catch (err) {
            toast.error("Error connecting to server");
        } finally {
            setLoading(false);
        }
    };

    const refreshDoubts = () => {
        mutate((key) => typeof key === 'string' && key.startsWith('/api/doubts'), undefined, { revalidate: true });
    };

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
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (!classroom) return null;

    return (
        <div className="min-h-screen bg-[#020617] text-white">
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
                                    onSuccess={refreshDoubts} 
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

                            <InfiniteDoubtFeed 
                                classroomId={Number(id)}
                                type="ai"
                                role={classroom?.role}
                                onViewAISolution={(d) => {
                                    setActiveAIDoubt(d);
                                    setActiveTab("ask-ai");
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                emptyMessage="No AI doubts history yet. Start by asking a question above."
                            />
                        </div>
                    </div>
                )}

                {activeTab === "community" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/[0.02] border border-white/5 p-4 rounded-[2rem]">
                            <h2 className="text-2xl font-black uppercase italic tracking-tight px-4">Classroom <span className="text-blue-500">Board</span></h2>
                            
                            <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-2xl border border-white/5">
                                {['All', 'pending', 'solved'].map((f) => (
                                    <button 
                                        key={f}
                                        onClick={() => setDoubtFilter(f as any)}
                                        className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                            doubtFilter === f 
                                            ? (f === 'pending' ? "bg-red-500/10 text-red-500 border border-red-500/20" : f === 'solved' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-blue-600 border-blue-500 text-white")
                                            : "text-slate-500 hover:text-white"
                                        }`}
                                    >
                                        {f === 'All' ? 'All Doubts' : f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={tagFilter}
                                    onChange={(e) => setTagFilter(e.target.value)}
                                    placeholder="Filter tag"
                                    className="w-32 bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2.5 text-[10px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                                />
                            </div>

                            <button 
                                onClick={() => setIsAskModalOpen(true)}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-2 shrink-0"
                            >
                                <Plus className="w-4 h-4" /> Ask Community
                            </button>
                        </div>

                        <InfiniteDoubtFeed 
                            classroomId={Number(id)}
                            type="community"
                            isSolved={doubtFilter === 'All' ? undefined : doubtFilter}
                            tag={tagFilter}
                            role={classroom?.role}
                            emptyMessage={`No ${doubtFilter !== 'All' ? doubtFilter : ''} doubts found. Be the first to ask!`}
                        />
                    </div>
                )}

                {activeTab === "teacher-doubts" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-12">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/[0.02] border border-white/5 p-4 rounded-[2rem]">
                            <h2 className="text-2xl font-black uppercase italic tracking-tight px-4">
                                {classroom?.role === 'teacher' ? 'Your ' : 'Teacher '}
                                <span className="text-purple-500">Noticeboard</span>
                            </h2>

                            <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-2xl border border-white/5">
                                {['All', 'pending', 'solved'].map((f) => (
                                    <button 
                                        key={f}
                                        onClick={() => setDoubtFilter(f as any)}
                                        className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                            doubtFilter === f 
                                            ? (f === 'pending' ? "bg-red-500/10 text-red-500 border border-red-500/20" : f === 'solved' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-purple-600 border-purple-500 text-white")
                                            : "text-slate-500 hover:text-white"
                                        }`}
                                    >
                                        {f === 'All' ? 'All Notice' : f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
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

                        <InfiniteDoubtFeed 
                            classroomId={Number(id)}
                            type="teacher"
                            isSolved={doubtFilter === 'All' ? undefined : doubtFilter}
                            role={classroom?.role}
                            emptyMessage={classroom?.role === 'teacher' ? "No doubts from students yet." : "No teacher doubts yet."}
                            emptyAction={classroom?.role !== 'teacher' ? () => setIsAskModalOpen(true) : undefined}
                            emptyActionLabel="Send the first query"
                        />
                    </div>
                )}

                {activeTab === "insights" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                         <ClassroomInsightsView classroomId={Number(id)} role={classroom?.role} />
                    </div>
                )}
            </div>

            {isAskModalOpen && (
                <AskDoubt 
                    isOpen={isAskModalOpen}
                    onClose={() => setIsAskModalOpen(false)}
                    onSuccess={() => {
                        setIsAskModalOpen(false);
                        refreshDoubts();
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
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-blue-400 transition-all group"
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
                {/* 2. Topic Difficulty Heatmap */}
                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
                            <Layers className="w-5 h-5 text-orange-500" /> Topic Difficulty Heatmap
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {data?.mostAskedTopics.map((topic: any, i: number) => {
                            const intensity = Math.min(Number(topic.count) * 10, 100);
                            return (
                                <div key={i} className="p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-red-500 transition-opacity duration-500 pointer-events-none" style={{ opacity: intensity / 300 }} />
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

                {/* 3. Resolution Pulse */}
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
                    </div>
                </div>
            </div>

            {/* 4. Top Contributors */}
            <div className="bg-gradient-to-br from-amber-500/5 via-white/5 to-yellow-500/5 border border-white/10 rounded-[3rem] p-10 space-y-8 relative overflow-hidden group">
                <div className="flex items-center justify-between relative z-10">
                    <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
                        <Trophy className="w-5 h-5 text-amber-400" /> Top Contributors
                    </h3>
                </div>
                {data?.topContributors && data.topContributors.length > 0 ? (
                    <div className="space-y-3 relative z-10">
                        {data.topContributors.map((contributor: any, i: number) => (
                            <div key={i} className="flex items-center gap-5 bg-white/5 border border-white/10 rounded-2xl p-5 hover:scale-[1.01] transition-all">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/10 border border-white/10">
                                    {i === 0 ? <Trophy className="w-5 h-5 text-amber-400" /> : <span className="text-sm font-black text-slate-400">{i + 1}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-black uppercase tracking-tight truncate text-white">{contributor.name}</p>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{i === 0 ? '👑 Top Helper' : 'Community Member'}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-2xl font-black italic tracking-tighter text-amber-400">{contributor.replyCount}</p>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-600">Replies</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center text-slate-500 font-bold uppercase tracking-widest text-xs opacity-30">No community replies yet.</div>
                )}
            </div>

            {/* 5. Activity Timeline */}
            <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 space-y-8">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
                        <Clock className="w-5 h-5 text-purple-500" /> Peak Activity Timeline
                    </h3>
                </div>
                <div className="grid grid-cols-24 gap-1 h-32 items-end pt-4">
                    {Array.from({ length: 24 }).map((_, hour) => {
                        const activity = data?.peakTime.find((p: any) => p.hour === hour)?.count || 0;
                        const heightPercentage = Math.min((activity / 10) * 100, 100);
                        return (
                            <div key={hour} className="group relative flex flex-col items-center gap-2 h-full justify-end">
                                <div className="w-full bg-gradient-to-t from-purple-600 to-blue-400 rounded-t-md group-hover:from-white group-hover:to-white transition-all duration-500" style={{ height: `${Math.max(heightPercentage, 4)}%` }} />
                                <span className="text-[7px] font-black text-slate-600 uppercase group-hover:text-white transition-colors">{hour}h</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function PersonalMentorView({ classroomId }: { classroomId: number }) {
    // This can be expanded into a full component later
    return (
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-[3rem] p-10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shrink-0 shadow-2xl shadow-blue-600/40">
                <Brain className="w-10 h-10 text-white" />
            </div>
            <div className="relative z-10 flex-1 text-center md:text-left space-y-2">
                <h3 className="text-2xl font-black uppercase italic tracking-tight">Meet Your <span className="text-blue-400">Personal AI Mentor</span></h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl">
                    Stuck on a concept? Our AI analyzes classroom activity to provide personalized hints and resources tailored to your learning pace.
                </p>
            </div>
            <button className="relative z-10 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center gap-3">
                Start Session <Sparkles className="w-4 h-4" />
            </button>
        </div>
    );
}
