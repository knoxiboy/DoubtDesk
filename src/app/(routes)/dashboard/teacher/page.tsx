"use client";

import { useEffect, useState } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from "recharts";
import { Loader2, TrendingUp, AlertCircle, CheckCircle2, Users, Sparkles, BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const COLORS = ["#8b5cf6", "#3b82f6", "#ec4899", "#f59e0b", "#10b981"];

const PRIORITY_STYLES = {
    high: {
        border: "border-red-500/30",
        bg: "bg-red-500/5 dark:bg-red-500/10",
        badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        dot: "bg-red-500",
    },
    medium: {
        border: "border-amber-500/30",
        bg: "bg-amber-500/5 dark:bg-amber-500/10",
        badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        dot: "bg-amber-500",
    },
    low: {
        border: "border-blue-500/30",
        bg: "bg-blue-500/5 dark:bg-blue-500/10",
        badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        dot: "bg-blue-500",
    },
};

type Recommendation = {
    topic: string;
    subject: string;
    action: string;
    reasoning: string;
    priority: "high" | "medium" | "low";
    sampleDoubtIds: number[];
};

export default function TeacherDashboard() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const searchParams = useSearchParams();
    const classroomId = searchParams.get("classroomId");

    useEffect(() => {
        // Guard: classroomId is required — show error instead of firing bad request
        if (!classroomId) {
            setError("No classroom selected. Please open this page from your classroom.");
            setLoading(false);
            return;
        }

        fetch(`/api/teacher/insights?classroomId=${classroomId}`)
            .then(async (res) => {
                // Handle non-2xx responses before storing data
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body?.error || `Request failed with status ${res.status}`);
                }
                return res.json();
            })
            .then((json) => {
                setData(json);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError(err.message || "Failed to load analytics.");
                setLoading(false);
            });
    }, [classroomId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] bg-white dark:bg-black transition-colors duration-500">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px] bg-white dark:bg-black">
                <div className="text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                    <p className="text-slate-900 dark:text-white font-bold text-sm">{error}</p>
                </div>
            </div>
        );
    }

    if (!data) return (
        <div className="text-slate-900 dark:text-white text-center py-10 font-bold uppercase tracking-widest text-xs bg-white dark:bg-black min-h-screen">
            Failed to load analytics
        </div>
    );

    const recommendations: Recommendation[] = data.recommendations || [];

    return (
        <div className="space-y-10 animate-in fade-in duration-700 bg-white dark:bg-black p-6 lg:p-10 max-w-7xl mx-auto pb-24 text-slate-900 dark:text-zinc-100 min-h-screen relative overflow-hidden transition-colors duration-500">
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/10 dark:from-purple-500/5 blur-[130px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 dark:bg-emerald-500/[0.02] blur-[130px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none z-0" />

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100 dark:border-zinc-900/60 relative z-10">
                <div className="space-y-3">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
                        Classroom Insights
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" /> Real-time student confusion profiles and metrics.
                    </p>
                </div>
            </header>

            {/* ── Stat Cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                {[
                    { label: "Top Struggle", value: data.topTopics[0]?.topic || "N/A", icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", border: "border-slate-200 dark:border-zinc-900" },
                    { label: "Most Active Room", value: data.subjectVolume[0]?.subject || "N/A", icon: TrendingUp, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10", border: "border-slate-200 dark:border-zinc-900" },
                    {
                        label: "Resolution Rate",
                        value: `${data.statusDistribution && data.statusDistribution.length > 0
                            ? Math.round((data.statusDistribution.find((s: any) => s.status === "solved")?.count || 0) / (data.statusDistribution.reduce((a: any, b: any) => a + b.count, 0) || 1) * 100)
                            : 0}%`,
                        icon: CheckCircle2,
                        color: "text-emerald-600 dark:text-emerald-400",
                        bg: "bg-emerald-500/10",
                        border: "border-slate-200 dark:border-zinc-900"
                    }
                ].map((stat, i) => (
                    <div key={i} className={`bg-white/50 dark:bg-zinc-950/30 border ${stat.border} rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between hover:-translate-y-1 transition-all duration-300 shadow-xl shadow-slate-200/5 dark:shadow-none group`}>
                        <div className="flex items-center gap-4">
                            <div className={`p-3.5 ${stat.bg} rounded-xl`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{stat.label}</p>
                                <p className="text-xl font-black tracking-tight text-slate-900 dark:text-white mt-0.5 truncate">{stat.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Charts ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 md:p-8 backdrop-blur-xl flex flex-col justify-between shadow-xl shadow-slate-200/5 dark:shadow-none">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Top Confusion Topics</h3>
                            <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium mt-0.5">Core sub-topics sorted by question frequencies</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        {!data.topTopics || data.topTopics.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 dark:text-zinc-600 font-semibold text-xs uppercase tracking-wider">
                                No content fields tracked
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.topTopics}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="topic" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px' }}
                                        itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                                    />
                                    <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 md:p-8 backdrop-blur-xl flex flex-col justify-between shadow-xl shadow-slate-200/5 dark:shadow-none">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Doubt Status</h3>
                            <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium mt-0.5">Visual breakdown of unresolved issues vs closed instances</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        {!data.statusDistribution || data.statusDistribution.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-400 dark:text-zinc-600 font-semibold text-xs uppercase tracking-wider">
                                No tracking indicators configured
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={data.statusDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={6} dataKey="count" nameKey="status">
                                        {data.statusDistribution.map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={entry.status === "solved" ? "#10b981" : "#ef4444"} stroke="transparent" />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px' }}
                                        itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">{value}</span>} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* ── AI Recommendations ──────────────────────────────────────── */}
            <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Teaching Recommendations
                        </h2>
                        <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium mt-0.5">
                            Based on unresolved doubt patterns in your classroom
                        </p>
                    </div>
                    <span className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-black uppercase tracking-widest">
                        <Sparkles className="w-3 h-3" /> AI-Generated
                    </span>
                </div>

                {recommendations.length === 0 ? (
                    <div className="p-8 text-center border border-slate-200 dark:border-zinc-900 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/20">
                        <BookOpen className="w-8 h-8 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
                        <p className="text-slate-400 dark:text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                            No weak topics detected yet — great job! 🎉
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {recommendations.map((rec, i) => {
                            const styles = PRIORITY_STYLES[rec.priority] || PRIORITY_STYLES.medium;
                            return (
                                <div
                                    key={i}
                                    className={`${styles.bg} border ${styles.border} rounded-2xl p-5 flex flex-col gap-3 hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />
                                            <p className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white truncate">
                                                {rec.topic}
                                            </p>
                                        </div>
                                        <span className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${styles.badge}`}>
                                            {rec.priority}
                                        </span>
                                    </div>

                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 w-fit">
                                        {rec.subject}
                                    </span>

                                    <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 leading-relaxed">
                                        {rec.action}
                                    </p>

                                    <p className="text-xs text-slate-500 dark:text-zinc-500 leading-relaxed">
                                        {rec.reasoning}
                                    </p>

                                    {rec.sampleDoubtIds && rec.sampleDoubtIds.length > 0 && classroomId && (
                                        <Link
                                            href={`/rooms/${classroomId}?tab=community&search=${encodeURIComponent(rec.topic)}`}
                                            className="mt-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline underline-offset-2 group w-fit"
                                        >
                                            View {rec.sampleDoubtIds.length} related doubt{rec.sampleDoubtIds.length > 1 ? "s" : ""}
                                            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                        </Link>
                                    )}

                                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-600 mt-1">
                                        <Sparkles className="w-2.5 h-2.5" /> AI-generated recommendation
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Subject Volume Table ────────────────────────────────────── */}
            <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-2xl overflow-hidden relative z-10 shadow-xl shadow-slate-200/5 dark:shadow-none">
                <div className="p-6 border-b border-slate-100 dark:border-zinc-900">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Doubt Volume by Subject</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/20">
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Subject</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Doubt Count</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Engagement</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-zinc-900">
                            {!data.subjectVolume || data.subjectVolume.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400 dark:text-zinc-600 text-xs font-semibold uppercase tracking-wider">
                                        No metrics found across segments
                                    </td>
                                </tr>
                            ) : (
                                data.subjectVolume.map((item: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/40 dark:hover:bg-zinc-900/20 transition-colors duration-200">
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">{item.subject}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-black text-purple-600 dark:text-purple-400">{item.count}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-24 h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-500"
                                                    style={{ width: `${(item.count / (data.subjectVolume.reduce((a: any, b: any) => a + b.count, 0) || 1)) * 100}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}