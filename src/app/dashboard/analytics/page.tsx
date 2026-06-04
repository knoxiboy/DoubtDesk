"use client";

import { useEffect, useState } from "react";
import { useAppUser } from "../../provider";
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { 
    BarChart3, LineChart as LineIcon, PieChart as PieIcon, 
    TrendingUp, Clock, Users, Download, Calendar, 
    Sparkles, Filter, ArrowLeft, AlertCircle, CheckCircle2, 
    ShieldAlert, Loader2, BookOpen 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AnalyticsDashboardData, Classroom, SubjectAnalytics } from "@/types";

const COLORS = ["#8b5cf6", "#3b82f6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

export default function AnalyticsDashboard() {
    const { appUser, loading: authLoading } = useAppUser();
    const router = useRouter();

    const [data, setData] = useState<AnalyticsDashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedClassroom, setSelectedClassroom] = useState<string>("all");
    const [dateRange, setDateRange] = useState<string>("30");

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - parseInt(dateRange));

            let url = `/api/teacher/analytics?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
            if (selectedClassroom !== "all") {
                url += `&classroomId=${selectedClassroom}`;
            }

            const res = await fetch(url);
            if (!res.ok) {
                throw new Error("Failed to load analytics details");
            }
            const json = await res.json();
            setData(json);
        } catch (err: unknown) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Failed to load analytics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        document.title = "Teacher Analytics | DoubtDesk";
    }, []);

    useEffect(() => {
        if (!authLoading && appUser) {
            const isAuthorized = appUser.role === 'teacher' || appUser.role === 'admin';
            if (isAuthorized) {
                fetchAnalytics();
            }
        }
    }, [authLoading, appUser, selectedClassroom, dateRange]);

    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white dark:bg-black transition-colors duration-500">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
        );
    }

    const isAuthorized = appUser && (appUser.role === 'teacher' || appUser.role === 'admin');

    if (!appUser) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-black text-slate-900 dark:text-white p-6 text-center space-y-4 transition-colors duration-500">
                <ShieldAlert className="w-16 h-16 text-red-500" />
                <h1 className="text-3xl font-black tracking-tight">Authentication Required</h1>
                <p className="text-slate-500 dark:text-zinc-400 max-w-md text-sm font-medium">Please sign in to your instructor account to view learning metrics.</p>
                <button 
                    onClick={() => router.push("/sign-in")}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs shadow-lg shadow-blue-600/10 active:scale-[0.98]"
                >
                    Sign In
                </button>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-black text-slate-900 dark:text-white p-6 text-center space-y-4 transition-colors duration-500">
                <ShieldAlert className="w-16 h-16 text-red-500" />
                <h1 className="text-3xl font-black tracking-tight">Access Denied</h1>
                <p className="text-slate-500 dark:text-zinc-400 max-w-sm text-sm font-medium leading-relaxed">This space is dedicated to classroom teachers and platform administrators. If you believe this is an error, please update your account role from your profile.</p>
                <button 
                    onClick={() => router.push("/dashboard")}
                    className="px-6 py-3.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/60 rounded-xl font-bold uppercase tracking-wider text-xs"
                >
                    Back to Student Feed
                </button>
            </div>
        );
    }

    const downloadCSV = () => {
        if (!data) return;

        try {
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "DoubtDesk Classroom Analytics Report\n";
            csvContent += `Generated on,${new Date().toLocaleDateString()}\n`;
            csvContent += `Data Mode,${data.isDemoData ? "Simulated (Insufficient live data)" : "Active Class Data"}\n`;
            csvContent += `Classroom ID,${selectedClassroom === "all" ? "All Classrooms" : selectedClassroom}\n`;
            csvContent += `Date Range,Last ${dateRange} days\n\n`;
            
            csvContent += "SUMMARY METRICS\n";
            csvContent += `Total Doubts asked,${data.summary.totalDoubts}\n`;
            csvContent += `Resolved Doubts,${data.summary.solvedDoubts}\n`;
            csvContent += `Unresolved Doubts,${data.summary.unsolvedDoubts}\n`;
            csvContent += `Resolution Rate,${data.summary.resolutionRate}%\n`;
            csvContent += `Active Students,${data.summary.activeStudents}\n`;
            csvContent += `Avg Response Time,${data.summary.averageResponseTime} minutes\n\n`;
            
            csvContent += "DAILY DOUBT TRENDS\n";
            csvContent += "Date,Doubt Count\n";
            data.trends.forEach((row) => {
                csvContent += `"${row.date}",${row.count}\n`;
            });
            csvContent += "\n";
            
            csvContent += "SUBJECT WISE BREAKDOWN\n";
            csvContent += "Subject,Doubt Count\n";
            data.subjects.forEach((row) => {
                csvContent += `"${row.subject}",${row.count}\n`;
            });
            csvContent += "\n";

            csvContent += "PEAK ACTIVITY HOURS\n";
            csvContent += "Hour,Doubt Count\n";
            data.peakHours.forEach((row) => {
                csvContent += `"${row.hour}",${row.count}\n`;
            });
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `DoubtDesk_Teacher_Report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("CSV report downloaded successfully!");
        } catch (error) {
            toast.error("Failed to generate CSV export");
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-zinc-100 p-4 md:p-8 relative overflow-hidden transition-colors duration-500">
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-purple-500/10 dark:from-purple-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 dark:bg-emerald-500/[0.02] blur-[120px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none z-0" />

            <div className="max-w-7xl mx-auto relative z-10 space-y-10 pb-16">
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-zinc-900/60">
                    <div className="space-y-2">
                        <button 
                            onClick={() => router.push("/dashboard")} 
                            className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors text-xs font-bold uppercase tracking-wider group"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> 
                            Back to Feed
                        </button>
                        
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                                Teacher Analytics
                            </h1>
                            {data?.isDemoData && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                                    <Sparkles className="w-3 h-3" /> Preview Mode
                                </span>
                            )}
                        </div>
                        <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium max-w-2xl leading-relaxed">
                            Monitor classroom activity patterns, student confusion densities, and response time metrics.
                        </p>
                    </div>

                    {data && (
                        <button
                            onClick={downloadCSV}
                            className="flex items-center justify-center gap-2.5 px-5 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-lg shadow-blue-600/10 active:scale-[0.98] shrink-0"
                         aria-label="Interactive button">
                            <Download className="w-4 h-4" /> Export Report (CSV)
                        </button>
                    )}
                </div>

                <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-xl shadow-xl shadow-slate-200/5 dark:shadow-none">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
                        
                        <div className="flex flex-col gap-1.5 min-w-[240px]">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                                <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" /> Filter Classroom
                            </label>
                            <select
                                value={selectedClassroom}
                                onChange={(e) => setSelectedClassroom(e.target.value)}
                                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-3.5 rounded-xl focus:outline-none focus:border-blue-500/50 transition-all font-semibold text-sm appearance-none cursor-pointer text-slate-900 dark:text-zinc-100"
                            >
                                <option className="bg-white dark:bg-zinc-950" value="all">All Classrooms Combined</option>
                                {data?.classroomsList?.map((classroom: any) => (
                                    <option key={classroom.id} className="bg-white dark:bg-zinc-950" value={classroom.id.toString()}>
                                        {classroom.name} ({classroom.university})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" /> Time Horizon
                            </label>
                            <div className="grid grid-cols-3 bg-slate-50 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 p-1.5 rounded-xl">
                                {[
                                    { value: "7", label: "7 Days" },
                                    { value: "30", label: "30 Days" },
                                    { value: "90", label: "90 Days" }
                                ].map((item) => (
                                    <button
                                        key={item.value}
                                        onClick={() => setDateRange(item.value)}
                                        className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${ dateRange === item.value ? "bg-purple-600 text-white shadow-md shadow-purple-600/10" : "text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-200" }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                    {data?.isDemoData && (
                        <div className="text-left md:text-right max-w-sm flex gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl backdrop-blur-md">
                            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium leading-relaxed">
                                <span className="font-bold text-slate-700 dark:text-zinc-300 block mb-0.5">Showing Simulated Class Data</span>
                                The system dynamically generated simulated graphs because there are currently fewer than 3 active doubts recorded.
                            </p>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-32 rounded-2xl bg-slate-50 dark:bg-zinc-900/40" />
                            ))}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Skeleton className="h-[400px] rounded-3xl bg-slate-50 dark:bg-zinc-900/40" />
                            <Skeleton className="h-[400px] rounded-3xl bg-slate-50 dark:bg-zinc-900/40" />
                        </div>
                    </div>
                ) : (
                    data && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { 
                                    label: "Total Doubts asked", 
                                    value: data.summary.totalDoubts, 
                                    detail: `In last ${dateRange} days`,
                                    icon: BookOpen, 
                                    color: "text-purple-600 dark:text-purple-400", 
                                    bg: "bg-purple-500/10",
                                    border: "border-slate-200 dark:border-zinc-900"
                                },
                                { 
                                    label: "Avg Resolution Rate", 
                                    value: `${data.summary.resolutionRate}%`, 
                                    detail: `${data.summary.solvedDoubts} Solved out of ${data.summary.totalDoubts}`,
                                    icon: CheckCircle2, 
                                    color: "text-emerald-600 dark:text-emerald-400", 
                                    bg: "bg-emerald-500/10",
                                    border: "border-slate-200 dark:border-zinc-900"
                                },
                                { 
                                    label: "Avg Response Time", 
                                    value: data.summary.averageResponseTime === 0 ? "N/A" : `${data.summary.averageResponseTime}m`, 
                                    detail: "Time to first reply",
                                    icon: Clock, 
                                    color: "text-blue-600 dark:text-blue-400", 
                                    bg: "bg-blue-500/10",
                                    border: "border-slate-200 dark:border-zinc-900"
                                },
                                { 
                                    label: "Engaged Students", 
                                    value: data.summary.activeStudents, 
                                    detail: "Students active in timeframe",
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

                        <div className="p-5 bg-purple-500/[0.02] border border-slate-200 dark:border-zinc-900 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm backdrop-blur-sm relative z-10">
                            <div className="flex gap-4">
                                <div className="p-2.5 bg-purple-500/10 border border-purple-500/20 rounded-xl shrink-0">
                                    <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="space-y-0.5">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">AI-Driven Teacher Action Plan</h4>
                                    <p className="text-slate-600 dark:text-zinc-400 text-xs font-medium leading-relaxed">
                                        {data.summary.resolutionRate < 60 
                                            ? "Critical: Doubts are accumulating faster than resolution rates. Host an immediate doubt-clearing session for highly active topics."
                                            : data.summary.averageResponseTime > 60 
                                            ? "Pace warning: The average reply latency is currently high. Instruct AI Solver integrations or host quick daily recaps."
                                            : "Curriculum Grasp Stable: Classroom resolution rate is exemplary. Continue providing advanced elective challenges."
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                            
                            <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl shadow-slate-200/5 dark:shadow-none">
                                <div className="flex items-center justify-between mb-6 px-2">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Doubt Activity trends</h3>
                                        <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium mt-0.5">Daily volume of questions asked</p>
                                    </div>
                                    <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                        <LineIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data.trends}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                                            <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px' }}
                                                itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                                                labelStyle={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="count" 
                                                stroke="#8b5cf6" 
                                                strokeWidth={2.5}
                                                dot={{ fill: '#8b5cf6', r: 3.5 }}
                                                activeDot={{ r: 5, fill: '#a78bfa' }} 
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl shadow-slate-200/5 dark:shadow-none">
                                <div className="flex items-center justify-between mb-6 px-2">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Most-Asked Subjects</h3>
                                        <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium mt-0.5">Queries distribution by subject</p>
                                    </div>
                                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                        <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                                <div className="h-[300px] w-full">
                                    {data.subjects.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-400 dark:text-zinc-600 font-semibold text-xs uppercase tracking-wider">
                                            No Subjects Data Available
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={data.subjects} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" horizontal={false} />
                                                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis dataKey="subject" type="category" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={100} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px' }}
                                                    itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                                                />
                                                <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                                                    {data.subjects.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl shadow-slate-200/5 dark:shadow-none">
                                <div className="flex items-center justify-between mb-6 px-2">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Doubt Resolution Status</h3>
                                        <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium mt-0.5">Ratio of Solved vs Unsolved Doubts</p>
                                    </div>
                                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                        <PieIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                </div>
                                <div className="h-[300px] w-full flex flex-col sm:flex-row items-center justify-center gap-6">
                                    <div className="h-[240px] w-full sm:w-1/2">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={data.solvedStats}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={85}
                                                    paddingAngle={6}
                                                    dataKey="value"
                                                >
                                                    <Cell fill="#10b981" />
                                                    <Cell fill="#ef4444" />
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px' }}
                                                    itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex flex-col gap-4 font-semibold text-sm w-full sm:w-1/2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]" />
                                            <div>
                                                <p className="text-slate-800 dark:text-zinc-200">Solved Doubts</p>
                                                <p className="text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider">{data.summary.solvedDoubts} queries ({data.summary.resolutionRate}%)</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]" />
                                            <div>
                                                <p className="text-slate-800 dark:text-zinc-200">Unsolved Doubts</p>
                                                <p className="text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider">{data.summary.unsolvedDoubts} queries ({100 - data.summary.resolutionRate}%)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/50 dark:bg-zinc-950/30 border border-slate-200 dark:border-zinc-900 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl shadow-slate-200/5 dark:shadow-none">
                                <div className="flex items-center justify-between mb-6 px-2">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200 uppercase tracking-wider">Peak Doubt Hours</h3>
                                        <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium mt-0.5">Doubt volume by time of day</p>
                                    </div>
                                    <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                                        <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                                    </div>
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.peakHours}>
                                            <defs>
                                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                                            <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px' }}
                                                itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="count" 
                                                stroke="#06b6d4" 
                                                strokeWidth={2.5}
                                                fillOpacity={1} 
                                                fill="url(#colorCount)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </div>
                    </>
                ))}

            </div>
        </div>
    );
}