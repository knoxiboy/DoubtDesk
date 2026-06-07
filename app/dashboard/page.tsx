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
import { AnalyticsWidgetSkeleton, DoubtCardSkeleton } from "@/components/ToolSkeletons";

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
        <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto pb-24 text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-[#020617] animate-pulse">
            {/* Dashboard Heading Skeleton */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-slate-200 dark:border-white/5">
                <div className="space-y-4">
                    <Skeleton className="h-6 w-48 rounded-full bg-slate-50 dark:bg-slate-800" />
                    <Skeleton className="h-16 w-64 md:w-96 bg-slate-50 dark:bg-slate-800" />
                    <Skeleton className="h-6 w-72 bg-slate-50 dark:bg-slate-800" />
                </div>
            </header>

            {/* Metrics Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-3xl bg-slate-50 dark:bg-slate-800" />
                ))}
            </div>

            {/* Visualization Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-[380px] rounded-[2.5rem] bg-slate-50 dark:bg-slate-800" />
                <Skeleton className="h-[380px] rounded-[2.5rem] bg-slate-50 dark:bg-slate-800" />
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
        <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto pb-24 text-slate-800 dark:text-slate-200 min-h-screen relative overflow-hidden bg-slate-50 dark:bg-[#020617]">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-600/5 blur-[120px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />

            {/* Dashboard Heading */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-white/5 relative z-10">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                        <Sparkles className="w-3.5 h-3.5" /> Neural Insights Live
                    </div>
                    <h1 className="text-5xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        Dash<span className="text-blue-500">board</span>
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed">
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
                    <div key={i} className={`bg-white/40 dark:bg-slate-900/40 border ${card.border} rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between hover:scale-[1.02] transition-transform group`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className={`p-3.5 ${card.bg} rounded-2xl`}>
                                <card.icon className={`w-5 h-5 ${card.color}`} />
                            </div>
                            <span className="text-3xl font-black text-slate-900 dark:text-white">{card.value}</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">{card.label}</p>
                            <p className="text-slate-500 dark:text-slate-500 text-xs mt-1 font-semibold">{card.detail}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* 2. Visualizations Suite Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">

                {/* Chart 1: Global Topic Densities (Bar Chart) */}
                <div className="bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Global Topic Density</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase mt-1">Doubt counts distributed by subject</p>
                        </div>
                        <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <Target className="w-4 h-4 text-blue-400" />
                        </div>
                    </div>
                    <div className="h-[280px] w-full">
                        {!data?.mostAskedTopics || data.mostAskedTopics.length === 0 ? (
                            <AnalyticsWidgetSkeleton />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.mostAskedTopics} layout="vertical">
                                    {/* chart code */}
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Chart 2: Peak Activity Hourly Area Chart */}
                <div className="bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Peak Doubt Timeline</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase mt-1">Doubt volume by time of day</p>
                        </div>
                        <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                            <TrendingUp className="w-4 h-4 text-purple-400" />
                        </div>
                    </div>
                    <div className="h-[280px] w-full">
                        {formattedPeakHours.length === 0 ? (
                            <AnalyticsWidgetSkeleton />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={formattedPeakHours}>
                                    {/* chart code */}
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
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">Trending Doubts</h2>
                    </div>

                    <div className="grid gap-4">
                        {!data?.trendingDoubts || data.trendingDoubts.length === 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[...Array(3)].map((_, i) => (
                                    <DoubtCardSkeleton key={i} />
                                ))}
                            </div>
                        ) : (
                            data.trendingDoubts.map((doubt, i) => (
                                <div key={doubt.id} className="group p-5 bg-slate-100 dark:bg-white/5 ...">
                                    {/* doubt card content */}
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
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic font-bold">Interventions</h2>
                        </div>

                        <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-3xl space-y-4">
                            {!data?.weakTopics || data.weakTopics.length === 0 ? (
                                <AnalyticsWidgetSkeleton />
                            ) : (
                                <div className="space-y-3">
                                    {data.weakTopics.slice(0, 2).map((topic) => (
                                        <div key={topic.subject} className="flex items-center gap-3 p-3.5 ...">
                                            {/* topic content */}
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
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic font-bold">Contributors</h2>
                        </div>

                        <div className="bg-white/40 dark:bg-slate-900/40 border ... rounded-3xl p-6 space-y-4">
                            {!data?.topContributors || data.topContributors.length === 0 ? (
                                <AnalyticsWidgetSkeleton />
                            ) : (
                                <div className="space-y-3">
                                    {data.topContributors.slice(0, 3).map((contributor, i) => (
                                        <div key={i} className="flex items-center gap-3 bg-slate-100 dark:bg-white/5 ...">
                                            {/* contributor content */}
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
