"use client"

import { useEffect, useState } from "react"
import { 
    TrendingUp, Target, Zap, MessageCircle, AlertCircle, Loader2, Sparkles, 
    Brain, BookOpen, Clock, CheckCircle2, Users, Trophy 
} from "lucide-react"
import { 
    BarChart, Bar, Cell, AreaChart, Area, Tooltip, XAxis, YAxis, ResponsiveContainer 
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"

type AnalyticsData = {
    trendingDoubts: any[];
    mostAskedTopics: any[];
    weakTopics: any[];
    solvedStats: any[];
    peakTime: any[];
    engagement: {
        totalStudents: number;
        totalDoubts: number;
        totalReplies: number;
    };
    topContributors: any[];
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

function DashboardSkeleton() {
    return (
        <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto pb-24 text-slate-200 bg-[#020617] animate-pulse">
            {/* Dashboard Heading Skeleton */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-white/5">
                <div className="space-y-4">
                    <Skeleton className="h-6 w-48 rounded-full bg-slate-800" />
                    <Skeleton className="h-16 w-64 md:w-96 bg-slate-800" />
                    <Skeleton className="h-6 w-72 bg-slate-800" />
                </div>
            </header>

            {/* Metrics Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-3xl bg-slate-800" />
                ))}
            </div>

            {/* Visualization Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-[380px] rounded-[2.5rem] bg-slate-800" />
                <Skeleton className="h-[380px] rounded-[2.5rem] bg-slate-800" />
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = async () => {
        try {
            const res = await fetch('/api/analytics');
            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error("Error loading analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, []);

    if (loading) {
        return <DashboardSkeleton />;
    }

    // Helper counts
    const solvedCount = data?.solvedStats?.find((s: any) => s.status === 'solved')?.count || 0;
    const unsolvedCount = data?.solvedStats?.find((s: any) => s.status !== 'solved')?.count || 0;
    const totalDoubtStats = Number(solvedCount) + Number(unsolvedCount);
    const solvedPercentage = totalDoubtStats > 0 ? Math.round((Number(solvedCount) / totalDoubtStats) * 100) : 0;

    // Format peak hours data for Recharts AreaChart
    const formattedPeakHours = data?.peakTime?.map((p: any) => ({
        hour: `${p.hour}:00`,
        count: Number(p.count)
    })) || [];

    return (
        <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto pb-24 text-slate-200 min-h-screen relative overflow-hidden bg-[#020617]">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-600/5 blur-[120px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />

            {/* Dashboard Heading */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5 relative z-10">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        <Sparkles className="w-3.5 h-3.5" /> Neural Insights Live
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter uppercase italic">
                        Dash<span className="text-blue-500">board</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed">
                        Real-time intelligence on your registered classroom doubt trends and resolution metrics.
                    </p>
                </div>
            </header>

            {/* 1. Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                {[
                    { 
                        label: "Classroom Queries", 
                        value: data?.engagement?.totalDoubts || 0, 
                        detail: "Total doubts asked",
                        icon: BookOpen, 
                        color: "text-blue-400", 
                        bg: "bg-blue-500/10",
                        border: "border-blue-500/20"
                    },
                    { 
                        label: "Resolution Pulse", 
                        value: `${solvedPercentage}%`, 
                        detail: `${solvedCount} Solved / ${unsolvedCount} Pending`,
                        icon: CheckCircle2, 
                        color: "text-emerald-400", 
                        bg: "bg-emerald-500/10",
                        border: "border-emerald-500/20"
                    },
                    { 
                        label: "Community Wisdom", 
                        value: data?.engagement?.totalReplies || 0, 
                        detail: "Total replies contributed",
                        icon: MessageCircle, 
                        color: "text-cyan-400", 
                        bg: "bg-cyan-500/10",
                        border: "border-cyan-500/20"
                    },
                    { 
                        label: "Active Learners", 
                        value: data?.engagement?.totalStudents || 0, 
                        detail: "Engaged classmates",
                        icon: Users, 
                        color: "text-purple-400", 
                        bg: "bg-purple-500/10",
                        border: "border-purple-500/20"
                    }
                ].map((card, i) => (
                    <div key={i} className={`bg-slate-900/40 border ${card.border} rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between hover:scale-[1.02] transition-transform group`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className={`p-3.5 ${card.bg} rounded-2xl`}>
                                <card.icon className={`w-5 h-5 ${card.color}`} />
                            </div>
                            <span className="text-3xl font-black text-white">{card.value}</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
                            <p className="text-slate-500 text-xs mt-1 font-semibold">{card.detail}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 2. Visualizations Suite Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                
                {/* Chart 1: Global Topic Densities (Bar Chart) */}
                <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Global Topic Density</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Doubt counts distributed by subject</p>
                        </div>
                        <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <Target className="w-4 h-4 text-blue-400" />
                        </div>
                    </div>
                    <div className="h-[280px] w-full">
                        {!data?.mostAskedTopics || data.mostAskedTopics.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                                No subject stats available yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.mostAskedTopics} layout="vertical">
                                    <XAxis type="number" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="subject" type="category" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} width={100} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                                        {data.mostAskedTopics.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Chart 2: Peak Activity Hourly Area Chart */}
                <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest">Peak Doubt Timeline</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Doubt volume by time of day</p>
                        </div>
                        <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                            <TrendingUp className="w-4 h-4 text-purple-400" />
                        </div>
                    </div>
                    <div className="h-[280px] w-full">
                        {formattedPeakHours.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                                No hourly timeline data available yet
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={formattedPeakHours}>
                                    <defs>
                                        <linearGradient id="gCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="hour" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="count" 
                                        stroke="#8b5cf6" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#gCount)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

            </div>

            {/* 3. Bottom Grid: Trending Feed + Leaderboards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                
                {/* Left & Middle: Trending Doubt Feed */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                            <Zap className="w-5 h-5 text-cyan-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Trending Doubts</h2>
                    </div>

                    <div className="grid gap-4">
                        {!data?.trendingDoubts || data.trendingDoubts.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs border border-white/5 rounded-2xl bg-slate-900/20">
                                No active doubts inside your classrooms yet.
                            </div>
                        ) : (
                            data.trendingDoubts.map((doubt, i) => (
                                <div key={doubt.id} className="group p-5 bg-white/5 border border-white/5 hover:border-cyan-500/30 rounded-2xl transition-all hover:bg-white/[0.08] backdrop-blur-xl flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                            {doubt.subject}
                                        </span>
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Recently Asked</span>
                                    </div>
                                    <p className="text-slate-200 font-medium line-clamp-2 leading-relaxed italic">
                                        "{doubt.content}"
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Insights & Contributors Leaderboard */}
                <div className="space-y-8">
                    
                    {/* Weak Points Card */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
                                <AlertCircle className="w-5 h-5 text-red-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight uppercase italic font-bold">Interventions</h2>
                        </div>

                        <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl space-y-4">
                            {!data?.weakTopics || data.weakTopics.length === 0 ? (
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest text-center py-4">No critical weak spots detected!</p>
                            ) : (
                                <div className="space-y-3">
                                    {data.weakTopics.slice(0, 2).map((topic) => (
                                        <div key={topic.subject} className="flex items-center gap-3 p-3.5 bg-red-500/10 rounded-2xl border border-red-500/20 hover:scale-[1.02] transition-transform">
                                            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
                                                <BookOpen className="w-4 h-4 text-red-400" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-tight text-white">{topic.subject}</p>
                                                <p className="text-[9px] text-red-400/80 font-black uppercase tracking-widest mt-0.5">{topic.severity} Priority Recap</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Contributors Leaderboard */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                <Trophy className="w-5 h-5 text-amber-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight uppercase italic font-bold">Contributors</h2>
                        </div>

                        <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 space-y-4">
                            {!data?.topContributors || data.topContributors.length === 0 ? (
                                <div className="py-8 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px] opacity-40">No helpers recorded yet.</div>
                            ) : (
                                <div className="space-y-3">
                                    {data.topContributors.slice(0, 3).map((contributor, i) => (
                                        <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 hover:scale-[1.01] transition-all">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/10 border border-white/10 text-xs font-black text-slate-400">
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black uppercase tracking-tight truncate text-white">{contributor.name}</p>
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-0.5">Contributor</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-lg font-black italic tracking-tighter text-amber-400">{contributor.replyCount}</p>
                                                <p className="text-[7px] font-black uppercase tracking-widest text-slate-600">Replies</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    )
}
