"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { 
    TrendingUp, 
    Target, 
    AlertCircle, 
    Sparkles, 
    BookOpen, 
    Users, 
    MessageSquare, 
    HelpCircle, 
    CheckCircle2, 
    XCircle,
    Trophy
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import RecommendedClassrooms from "@/components/RecommendedClassrooms";

type TrendingDoubt = {
    id: number;
    subject: string;
    content: string;
}

type MostAskedTopic = {
    subject: string;
    count: number;
    severity: "High" | "Medium" | "Low";
    suggestion: string;
}

type WeakTopic = {
    subject: string;
    count: number;
    severity: "High" | "Medium" | "Low";
    suggestion: string;
}

type SolvedStat = {
    status: boolean;
    count: number;
}

type EngagementData = {
    totalStudents: number;
    totalDoubts: number;
    totalReplies: number;
}

type TopContributor = {
    name: string;
    replyCount: number;
}

type AnalyticsData = {
    trendingDoubts: TrendingDoubt[];
    mostAskedTopics: MostAskedTopic[];
    weakTopics: WeakTopic[];
    solvedStats: SolvedStat[];
    engagement: EngagementData;
    topContributors: TopContributor[];
}

function DashboardSkeleton() {
    return (
        <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto pb-24 text-slate-200">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
                <div className="space-y-4">
                    <Skeleton className="h-6 w-48 rounded-full" />
                    <Skeleton className="h-16 w-64 md:w-96" />
                </div>
            </header>

            {/* Engagement Stats Strip Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 rounded-2xl w-full" />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Skeleton className="h-12 w-48 rounded-xl" />
                    <div className="grid gap-4">
                        {[1, 2, 3].map((i) => (
                            <Skeleton key={i} className="h-28 rounded-2xl w-full" />
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <Skeleton className="h-12 w-48 rounded-xl" />
                    <Skeleton className="h-64 rounded-3xl w-full" />
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const classroomId = searchParams.get("classroomId");

    const fetchAnalytics = async () => {
        if (!classroomId) {
            setError("No Classroom Context Selected. Please provide a classroomId query parameter.");
            setLoading(false);
            return;
        }

        try {
            setError(null);
            const res = await fetch(`/api/analytics?classroomId=${classroomId}`);
            const result = await res.json();
            
            if (!res.ok) {
                throw new Error(result.error || "Failed to load dashboard metrics context.");
            }
            
            setData(result);
        } catch (err: any) {
            console.error("Error loading analytics:", err);
            setError(err.message || "An unhandled backend error occurred.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [classroomId]);

    if (loading) {
        return <DashboardSkeleton />;
    }

    if (error) {
        return (
            <div className="p-6 lg:p-10 max-w-7xl mx-auto text-slate-200 space-y-12">
                <div className="p-8 border border-red-500/20 bg-red-500/5 rounded-[2rem] flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-4">
                    <AlertCircle className="w-12 h-12 text-red-400" />
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Analytics Target Missing</h3>
                        <p className="text-sm text-slate-400 mt-2 font-medium leading-relaxed">{error}</p>
                    </div>
                </div>
                <div className="pt-6 border-t border-white/5">
                    <RecommendedClassrooms />
                </div>
            </div>
        );
    }

    // Process Solved Stats distribution arrays safely
    const solvedCount = data?.solvedStats?.find(s => s.status === true)?.count || 0;
    const unresolvedCount = data?.solvedStats?.find(s => s.status === false)?.count || 0;

    return (
        <div className="p-6 lg:p-10 space-y-12 max-w-7xl mx-auto pb-24 text-slate-200">
            {/* Dashboard Heading */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest">
                        <Sparkles className="w-3.5 h-3.5" /> Neural Insights Live
                    </div>
                    <h1 className="text-6xl font-black text-white tracking-tighter uppercase italic">
                        Dash<span className="text-blue-500">board</span>
                    </h1>
                    <p className="text-slate-400 text-lg font-medium tracking-tight">
                        Real-time intelligence on global doubt patterns.
                    </p>
                </div>
            </header>

            {/* Engagement Row Card Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-900/30 border border-white/5 rounded-2xl flex items-center gap-4 backdrop-blur-xl">
                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-black uppercase tracking-wider">Total Active Students</p>
                        <h4 className="text-3xl font-black text-white tracking-tight mt-0.5">{data?.engagement?.totalStudents || 0}</h4>
                    </div>
                </div>

                <div className="p-6 bg-slate-900/30 border border-white/5 rounded-2xl flex items-center gap-4 backdrop-blur-xl">
                    <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
                        <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-black uppercase tracking-wider">Total Doubts Logged</p>
                        <h4 className="text-3xl font-black text-white tracking-tight mt-0.5">{data?.engagement?.totalDoubts || 0}</h4>
                    </div>
                </div>

                <div className="p-6 bg-slate-900/30 border border-white/5 rounded-2xl flex items-center gap-4 backdrop-blur-xl">
                    <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 font-black uppercase tracking-wider">Total Replies Provided</p>
                        <h4 className="text-3xl font-black text-white tracking-tight mt-0.5">{data?.engagement?.totalReplies || 0}</h4>
                    </div>
                </div>
            </div>

            {/* Main Metrics Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Trending Doubts and Core Resolution Stats */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Trending Doubts Wrapper Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                                <TrendingUp className="w-5 h-5 text-cyan-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Trending Doubts</h2>
                        </div>
                        
                        <div className="grid gap-4">
                            {data?.trendingDoubts && data.trendingDoubts.length > 0 ? (
                                data.trendingDoubts.map((doubt) => (
                                    <div key={doubt.id} className="group p-5 bg-white/5 border border-white/5 hover:border-cyan-500/30 rounded-2xl transition-all hover:bg-white/[0.08] backdrop-blur-xl flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                                {doubt.subject}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-bold">Recently asked</span>
                                        </div>
                                        <p className="text-slate-200 font-medium line-clamp-2 leading-relaxed italic">
                                            "{doubt.content}"
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500 italic font-medium p-4 border border-white/5 rounded-2xl bg-white/[0.02]">
                                    No active doubts registered inside this classroom profile container.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Resolution Ratio Metrics Panels */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Resolution Status Overview</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    <span className="text-sm font-bold text-slate-300">Resolved Doubts</span>
                                </div>
                                <span className="text-xl font-black text-emerald-400">{solvedCount}</span>
                            </div>

                            <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <XCircle className="w-5 h-5 text-amber-400" />
                                    <span className="text-sm font-bold text-slate-300">Unresolved Doubts</span>
                                </div>
                                <span className="text-xl font-black text-amber-400">{unresolvedCount}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar Column: Global Topics, Weak Points, and Leaderboard */}
                <div className="space-y-8">
                    
                    {/* Global Subject Popularity Tracker */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <Target className="w-5 h-5 text-blue-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Global Topics</h2>
                        </div>

                        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 space-y-6 backdrop-blur-md">
                            {data?.mostAskedTopics && data.mostAskedTopics.length > 0 ? (
                                data.mostAskedTopics.map((topic) => (
                                    <div key={topic.subject} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm font-bold text-slate-300">{topic.subject}</span>
                                            <span className="text-xs font-black text-blue-400">{topic.count} Queries</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-1000"
                                                style={{ width: `${Math.min((topic.count / Math.max(...(data?.mostAskedTopics?.map(t => t.count) || [1]))) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-500 italic font-medium">No tracking dataset found.</p>
                            )}
                        </div>
                    </div>

                    {/* Weak Topics Suggestions Alert Window */}
                    <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2 text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs font-black uppercase tracking-tighter text-red-400">Student Weak Points</span>
                        </div>
                        <div className="space-y-3">
                            {data?.weakTopics && data.weakTopics.length > 0 ? (
                                data.weakTopics.slice(0, 2).map((topic) => (
                                    <div key={topic.subject} className="flex flex-col gap-2 p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                                <BookOpen className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-bold text-white">{topic.subject}</p>
                                                <p className="text-[10px] text-red-400/70 font-black uppercase tracking-wider">Severity: {topic.severity}</p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] leading-relaxed text-slate-300 bg-black/20 p-2.5 rounded-lg border border-white/5">
                                            {topic.suggestion}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-emerald-400/80 font-bold italic p-2">
                                    ✓ Classroom pulse looks stable. No critical structural interventions flagged.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Top Contributors Peer Leaderboard */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Trophy className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-black uppercase tracking-widest">Top Contributors</span>
                        </div>
                        
                        <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-4 space-y-3">
                            {data?.topContributors && data.topContributors.length > 0 ? (
                                data.topContributors.map((contributor, idx) => (
                                    <div key={contributor.name} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-slate-500 w-4">#{idx + 1}</span>
                                            <span className="text-xs font-bold text-slate-300">{contributor.name}</span>
                                        </div>
                                        <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            {contributor.replyCount} Answers
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-500 italic p-2">No response tracking logs found.</p>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Smart Recommendations Section Mount */}
            <div className="pt-6 border-t border-white/5">
                <RecommendedClassrooms />
            </div>
        </div>
    )
}