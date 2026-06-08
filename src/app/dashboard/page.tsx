"use client"

import { useEffect, useState } from "react"
import { 
    TrendingUp, Target, Zap, MessageCircle, AlertCircle, Sparkles, 
    BookOpen, CheckCircle2, Users, Trophy 
} from "lucide-react"
import { 
    BarChart, Bar, Cell, AreaChart, Area, Tooltip, XAxis, YAxis, ResponsiveContainer 
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import RecommendedClassrooms from "@/components/RecommendedClassrooms"
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs"

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

const COLORS = ["#8b5cf6", "#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];
const ANALYTICS_UNAVAILABLE_MESSAGE = "Analytics are unavailable right now.";

function DashboardSkeleton() {
    return (
        <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto pb-24 bg-white dark:bg-black animate-pulse transition-colors duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-slate-100 dark:border-zinc-900">
                <div className="space-y-4">
                    <Skeleton className="h-6 w-48 rounded-full bg-slate-100 dark:bg-zinc-900" />
                    <Skeleton className="h-16 w-64 md:w-96 bg-slate-100 dark:bg-zinc-900" />
                    <Skeleton className="h-6 w-72 bg-slate-100 dark:bg-zinc-900" />
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-zinc-900" />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Skeleton className="h-[380px] rounded-3xl bg-slate-100 dark:bg-zinc-900" />
                <Skeleton className="h-[380px] rounded-3xl bg-slate-100 dark:bg-zinc-900" />
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
            if (!res.ok) {
                throw new Error(`Analytics request failed with status ${res.status}`);
            }
            const result = await res.json();
            setData(result);
        } catch (error) {
            console.error("Error loading analytics:", error);
            setData(null);
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

    if (!data) {
        return (
            <>
                <SignedIn>
                    <div role="status" className="p-10 text-center text-sm text-slate-500 dark:text-zinc-400">
                        {ANALYTICS_UNAVAILABLE_MESSAGE}
                    </div>
                </SignedIn>
                <SignedOut>
                    <RedirectToSignIn />
                </SignedOut>
            </>
        );
    }

    const solvedCount = data?.solvedStats?.find((s: any) => s.status === 'solved')?.count || 0;
    const unsolvedCount = data?.solvedStats?.find((s: any) => s.status !== 'solved')?.count || 0;
    const totalDoubtStats = Number(solvedCount) + Number(unsolvedCount);
    const solvedPercentage = totalDoubtStats > 0 ? Math.round((Number(solvedCount) / totalDoubtStats) * 100) : 0;

    const formattedPeakHours = data?.peakTime?.map((p: any) => ({
        hour: `${p.hour}:00`,
        count: Number(p.count)
    })) || [];

    return (
        <>
            <SignedIn>
                <div className="p-6 lg:p-10 space-y-10 max-w-7xl mx-auto pb-24 text-slate-900 dark:text-zinc-100 min-h-screen relative overflow-hidden bg-white dark:bg-black transition-colors duration-500">
                    <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/10 dark:from-purple-500/5 blur-[130px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />
                    <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 dark:bg-emerald-500/[0.02] blur-[130px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none z-0" />

                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100 dark:border-zinc-900/60 relative z-10">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 dark:bg-purple-500/5 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest animate-pulse backdrop-blur-sm">
                                <Sparkles className="w-3.5 h-3.5" /> Neural Insights Live
                            </div>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
                                Dashboard
                            </h1>
                            <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium leading-relaxed max-w-2xl">
                                Real-time intelligence on your registered classroom doubt trends and resolution metrics.
                            </p>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                        {[
                            { 
                                label: "Classroom Queries", 
                                value: data?.engagement?.totalDoubts || 0, 
                                detail: "Total doubts asked",
                                icon: BookOpen, 
                                color: "text-purple-600 dark:text-purple-400", 
                                bg: "bg-purple-500/10",
                                border: "border-slate-200 dark:border-zinc-900"
                            },
                            { 
                                label: "Resolution Pulse", 
                                value: `${solvedPercentage}%`, 
                                detail: `${solvedCount} Solved / ${unsolvedCount} Pending`,
                                icon: CheckCircle2, 
                                color: "text-emerald-600 dark:text-emerald-400", 
                                bg: "bg-emerald-500/10",
                                border: "border-slate-200 dark:border-zinc-900"
                            },
                            { 
                                label: "Community Wisdom", 
                                value: data?.engagement?.totalReplies || 0, 
                                detail: "Total replies contributed",
                                icon: MessageCircle, 
                                color: "text-blue-600 dark:text-blue-400", 
                                bg: "bg-blue-500/10",
                                border: "border-slate-200 dark:border-zinc-900"
                            },
                            { 
                                label: "Active Learners", 
                                value: data?.engagement?.totalStudents || 0, 
                                detail: "Engaged classmates",
                                icon: Users, 
                                color: "text-pink-600 dark:text-pink-400", 
                                bg: "bg-pink-500/10",
                                border: "border-slate-200 dark:border-zinc-900"
                            }
                        ].map((card, i) => (
                            <div key={i} className={`bg-white/50 dark:bg-zinc-950/30 border ${card.border} rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-slate-200/5 dark:shadow-none group`}>
                                <div className="flex items-center justify-between gap-4">
                                    <div className={`p-3.5 ${card.bg} rounded-xl`}>
                                        <card.icon className={`w-5 h-5 ${card.color}`} />
                                    </div>
                                    <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{card.value}</span>
                                </div>
                                <div className="mt-4">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{card.label}</p>
                                    <p className="text-slate-600 dark:text-zinc-400 text-xs mt-0.5 font-medium">{card.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                        <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 md:p-8 backdrop-blur-xl flex flex-col justify-between shadow-xl shadow-slate-200/5 dark:shadow-none">
                            <div className="flex items-center justify-between mb-6 px-2">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Global Topic Density</h3>
                                    <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium mt-0.5">Doubt counts distributed by subject</p>
                                </div>
                                <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                    <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                            <div className="h-[280px] w-full">
                                {!data?.mostAskedTopics || data.mostAskedTopics.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-400 dark:text-zinc-600 font-semibold text-xs uppercase tracking-wider">
                                        No subject stats available yet
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.mostAskedTopics} layout="vertical">
                                            <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis dataKey="subject" type="category" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={100} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px' }}
                                                itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                                            />
                                            <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]}>
                                                {data.mostAskedTopics.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>

                        <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 md:p-8 backdrop-blur-xl flex flex-col justify-between shadow-xl shadow-slate-200/5 dark:shadow-none">
                            <div className="flex items-center justify-between mb-6 px-2">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Peak Doubt Timeline</h3>
                                    <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium mt-0.5">Doubt volume by time of day</p>
                                </div>
                                <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                    <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                </div>
                            </div>
                            <div className="h-[280px] w-full">
                                {formattedPeakHours.length === 0 ? (
                                    <div className="h-full flex items-center justify-center text-slate-400 dark:text-zinc-600 font-semibold text-xs uppercase tracking-wider">
                                        No hourly timeline data available yet
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={formattedPeakHours}>
                                            <defs>
                                                <linearGradient id="gCount" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px' }}
                                                itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="count" 
                                                stroke="#8b5cf6" 
                                                strokeWidth={2.5}
                                                fillOpacity={1} 
                                                fill="url(#gCount)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
                        <div className="lg:col-span-2 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                                    <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Trending Doubts</h2>
                            </div>

                            <div className="grid gap-4">
                                {!data?.trendingDoubts || data.trendingDoubts.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 dark:text-zinc-500 font-semibold text-xs border border-slate-200 dark:border-zinc-900 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/20">
                                        No active doubts inside your classrooms yet.
                                    </div>
                                ) : (
                                    data.trendingDoubts.map((doubt) => (
                                        <div key={doubt.id} className="group p-5 bg-slate-50/50 dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-900 hover:border-purple-500/40 dark:hover:bg-zinc-900/30 rounded-2xl transition-all duration-300 flex flex-col gap-3 shadow-sm">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                                    {doubt.subject}
                                                </span>
                                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-semibold uppercase tracking-wider">Recently Asked</span>
                                            </div>
                                            <p className="text-slate-700 dark:text-zinc-300 text-sm font-medium leading-relaxed">
                                                &ldquo;{doubt.content}&rdquo;
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
                                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Interventions</h2>
                                </div>

                                <div className="p-6 bg-red-500/[0.02] border border-slate-200 dark:border-zinc-900 rounded-2xl space-y-4 shadow-sm backdrop-blur-sm">
                                    {!data?.weakTopics || data.weakTopics.length === 0 ? (
                                        <p className="text-slate-400 dark:text-zinc-500 text-xs font-semibold text-center py-4">No critical weak spots detected!</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {data.weakTopics.slice(0, 2).map((topic) => (
                                                <div key={topic.subject} className="flex items-center gap-3 p-3.5 bg-red-500/5 dark:bg-red-500/10 rounded-xl border border-red-500/10 hover:scale-[1.02] transition-transform duration-300">
                                                    <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20">
                                                        <BookOpen className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{topic.subject}</p>
                                                        <p className="text-[10px] text-red-600 dark:text-red-400 font-semibold mt-0.5">{topic.severity} Priority Recap</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                        <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Contributors</h2>
                                </div>

                                <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-2xl p-6 space-y-4 shadow-sm backdrop-blur-sm">
                                    {!data?.topContributors || data.topContributors.length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 dark:text-zinc-500 font-semibold text-xs opacity-60">No helpers recorded yet.</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {data.topContributors.slice(0, 3).map((contributor, i) => (
                                                <div key={i} className="flex items-center gap-3 bg-slate-50/50 dark:bg-zinc-900/40 border border-slate-200/60 dark:border-zinc-800/60 rounded-xl p-4 hover:scale-[1.01] transition-all duration-300 shadow-sm">
                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-500 dark:text-zinc-400">
                                                        {i + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold truncate text-slate-900 dark:text-white">{contributor.name}</p>
                                                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Contributor</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-base font-black tracking-tight text-amber-500">{contributor.replyCount}</p>
                                                        <p className="text-[9px] font-bold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Replies</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <RecommendedClassrooms />
                    </div>
                </div>
            </SignedIn>
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        </>
    )
}
