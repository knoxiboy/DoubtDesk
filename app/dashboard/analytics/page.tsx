"use client";

import { useEffect, useState } from "react";
import { useAppUser } from "../../provider";
import Sidebar from "@/components/Sidebar";
import { 
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
    BarChart3, LineChart as LineIcon, PieChart as PieIcon, 
    TrendingUp, Clock, Users, Download, Calendar, 
    Sparkles, Filter, ArrowLeft, AlertCircle, CheckCircle2, 
    ShieldAlert, Loader2, BookOpen, GraduationCap 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

export default function AnalyticsDashboard() {
    const { appUser, loading: authLoading } = useAppUser();
    const router = useRouter();

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedClassroom, setSelectedClassroom] = useState<string>("all");
    const [dateRange, setDateRange] = useState<string>("30"); // 7, 30, 90 days

    // Fetch analytics data
    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            // Calculate date ranges
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
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to load analytics");
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

    // Render loading states
    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#020617]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    // Role verification check
    const isAuthorized = appUser && (appUser.role === 'teacher' || appUser.role === 'admin');

    if (!appUser) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-[#020617] text-white p-6 text-center space-y-4">
                <ShieldAlert className="w-16 h-16 text-red-500" />
                <h1 className="text-3xl font-black uppercase tracking-tight italic">Authentication Required</h1>
                <p className="text-slate-400 max-w-md">Please sign in to your instructor account to view learning metrics.</p>
                <button 
                    onClick={() => router.push("/sign-in")}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold uppercase tracking-widest transition-all"
                >
                    Sign In
                </button>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-[#020617] text-white p-6 text-center space-y-4">
                <ShieldAlert className="w-16 h-16 text-red-500" />
                <h1 className="text-3xl font-black uppercase tracking-tight italic">Access Denied</h1>
                <p className="text-slate-400 max-w-sm">This space is dedicated to classroom teachers and platform administrators. If you believe this is an error, please update your account role from your profile.</p>
                <button 
                    onClick={() => router.push("/dashboard")}
                    className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-bold uppercase tracking-widest transition-all"
                >
                    Back to Student Feed
                </button>
            </div>
        );
    }

    // Download compiled dashboard metrics as a single CSV report
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
            data.trends.forEach((row: any) => {
                csvContent += `"${row.date}",${row.count}\n`;
            });
            csvContent += "\n";
            
            csvContent += "SUBJECT WISE BREAKDOWN\n";
            csvContent += "Subject,Doubt Count\n";
            data.subjects.forEach((row: any) => {
                csvContent += `"${row.subject}",${row.count}\n`;
            });
            csvContent += "\n";

            csvContent += "PEAK ACTIVITY HOURS\n";
            csvContent += "Hour,Doubt Count\n";
            data.peakHours.forEach((row: any) => {
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
        <div className="min-h-screen bg-[#020617] text-white p-4 md:p-8 relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 space-y-8 pb-16">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
                    <div className="space-y-3">
                        <button 
                            onClick={() => router.push("/dashboard")} 
                            className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors text-xs font-black uppercase tracking-widest group"
                        >
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> 
                            Back to Feed
                        </button>
                        
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter uppercase italic">
                                Teacher <span className="text-blue-500">Analytics</span>
                            </h1>
                            {data?.isDemoData && (
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                    <Sparkles className="w-3 h-3" /> Preview Mode
                                </span>
                            )}
                        </div>
                        <p className="text-slate-400 text-sm font-medium">
                            Monitor classroom activity patterns, student confusion densities, and response time metrics.
                        </p>
                    </div>

                    {/* Quick CSV Export */}
                    {data && (
                        <button
                            onClick={downloadCSV}
                            className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-600/20"
                        >
                            <Download className="w-4 h-4" /> Export Report (CSV)
                        </button>
                    )}
                </div>

                {/* Filters Row */}
                <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-xl">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
                        
                        {/* Classroom Selector */}
                        <div className="flex flex-col gap-1.5 min-w-[240px]">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                <Filter className="w-3 h-3 text-slate-500" /> Filter Classroom
                            </label>
                            <select
                                value={selectedClassroom}
                                onChange={(e) => setSelectedClassroom(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl focus:outline-none focus:border-blue-500 transition-all font-semibold text-sm appearance-none cursor-pointer bg-[#0f172a]"
                            >
                                <option className="bg-[#0f172a]" value="all">All Classrooms Combined</option>
                                {data?.classroomsList?.map((classroom: any) => (
                                    <option key={classroom.id} className="bg-[#0f172a]" value={classroom.id.toString()}>
                                        {classroom.name} ({classroom.university})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range Selector */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3 text-slate-500" /> Time Horizon
                            </label>
                            <div className="grid grid-cols-3 bg-white/5 border border-white/10 p-1.5 rounded-xl">
                                {[
                                    { value: "7", label: "7 Days" },
                                    { value: "30", label: "30 Days" },
                                    { value: "90", label: "90 Days" }
                                ].map((item) => (
                                    <button
                                        key={item.value}
                                        onClick={() => setDateRange(item.value)}
                                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                                            dateRange === item.value 
                                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/10" 
                                                : "text-slate-400 hover:text-white"
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Preview Warning Details */}
                    {data?.isDemoData && (
                        <div className="text-left md:text-right max-w-sm flex gap-3 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl">
                            <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                            <p className="text-slate-400 text-xs font-medium leading-relaxed">
                                <span className="font-bold text-slate-300 block mb-0.5">Showing Simulated Class Data</span>
                                The system dynamically generated gorgeous simulated graphs because there are currently fewer than 3 active doubts recorded.
                            </p>
                        </div>
                    )}
                </div>

                {loading ? (
                    // Dashboard Loading Skeleton
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-32 rounded-3xl" />
                            ))}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <Skeleton className="h-[400px] rounded-[2.5rem]" />
                            <Skeleton className="h-[400px] rounded-[2.5rem]" />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Stats Metrics Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { 
                                    label: "Total Doubts asked", 
                                    value: data.summary.totalDoubts, 
                                    detail: `In last ${dateRange} days`,
                                    icon: BookOpen, 
                                    color: "text-blue-400", 
                                    bg: "bg-blue-500/10",
                                    border: "border-blue-500/20"
                                },
                                { 
                                    label: "Avg Resolution Rate", 
                                    value: `${data.summary.resolutionRate}%`, 
                                    detail: `${data.summary.solvedDoubts} Solved out of ${data.summary.totalDoubts}`,
                                    icon: CheckCircle2, 
                                    color: "text-emerald-400", 
                                    bg: "bg-emerald-500/10",
                                    border: "border-emerald-500/20"
                                },
                                { 
                                    label: "Avg Response Time", 
                                    value: data.summary.averageResponseTime === 0 ? "N/A" : `${data.summary.averageResponseTime}m`, 
                                    detail: "Time to first reply",
                                    icon: Clock, 
                                    color: "text-cyan-400", 
                                    bg: "bg-cyan-500/10",
                                    border: "border-cyan-500/20"
                                },
                                { 
                                    label: "Engaged Students", 
                                    value: data.summary.activeStudents, 
                                    detail: "Students active in timeframe",
                                    icon: Users, 
                                    color: "text-purple-400", 
                                    bg: "bg-purple-500/10",
                                    border: "border-purple-500/20"
                                }
                            ].map((card, i) => (
                                <div key={i} className={`bg-slate-900/40 border ${card.border} rounded-3xl p-6 backdrop-blur-md flex flex-col justify-between hover:scale-[1.02] transition-transform`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className={`p-3.5 ${card.bg} rounded-2xl`}>
                                            <card.icon className={`w-5 h-5 ${card.color}`} />
                                        </div>
                                        <span className="text-2xl font-black text-white">{card.value}</span>
                                    </div>
                                    <div className="mt-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
                                        <p className="text-slate-500 text-xs mt-1 font-semibold">{card.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Top Action Plan Insight */}
                        <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex gap-4">
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl shrink-0">
                                    <Sparkles className="w-5 h-5 text-blue-400" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-white">AI-Driven Teacher Action Plan</h4>
                                    <p className="text-slate-400 text-xs font-semibold leading-relaxed">
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

                        {/* Visualizations Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* Chart 1: Doubt Activity Trends (Line Chart) */}
                            <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-xl">
                                <div className="flex items-center justify-between mb-6 px-2">
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Doubt Activity trends</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Daily volume of questions asked</p>
                                    </div>
                                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                        <LineIcon className="w-4 h-4 text-blue-400" />
                                    </div>
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data.trends}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                                            <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                                                labelStyle={{ fontSize: '10px', color: '#64748b', fontWeight: 'black', textTransform: 'uppercase' }}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="count" 
                                                stroke="#3b82f6" 
                                                strokeWidth={3}
                                                dot={{ fill: '#3b82f6', r: 4 }}
                                                activeDot={{ r: 6, fill: '#60a5fa' }} 
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Chart 2: Most Asked Subjects (Bar Chart) */}
                            <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-xl">
                                <div className="flex items-center justify-between mb-6 px-2">
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Most-Asked Subjects</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Queries distribution by subject</p>
                                    </div>
                                    <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                        <BarChart3 className="w-4 h-4 text-purple-400" />
                                    </div>
                                </div>
                                <div className="h-[300px] w-full">
                                    {data.subjects.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-500 font-bold uppercase tracking-widest text-xs">
                                            No Subjects Data Available
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={data.subjects} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" horizontal={false} />
                                                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                                <YAxis dataKey="subject" type="category" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={100} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                    itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                                                />
                                                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]}>
                                                    {data.subjects.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* Chart 3: Solved vs Unsolved (Pie/Donut Chart) */}
                            <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-xl">
                                <div className="flex items-center justify-between mb-6 px-2">
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Doubt Resolution Status</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Ratio of Solved vs Unsolved Doubts</p>
                                    </div>
                                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                        <PieIcon className="w-4 h-4 text-emerald-400" />
                                    </div>
                                </div>
                                <div className="h-[300px] w-full flex flex-col md:flex-row items-center justify-center gap-6">
                                    <div className="h-[240px] w-full md:w-1/2">
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
                                                    <Cell fill="#10b981" /> {/* Solved - Emerald */}
                                                    <Cell fill="#ef4444" /> {/* Unsolved - Red */}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                    itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex flex-col gap-4 font-semibold text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                            <div>
                                                <p className="text-slate-200">Solved Doubts</p>
                                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{data.summary.solvedDoubts} queries ({data.summary.resolutionRate}%)</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                                            <div>
                                                <p className="text-slate-200">Unsolved Doubts</p>
                                                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{data.summary.unsolvedDoubts} queries ({100 - data.summary.resolutionRate}%)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Chart 4: Peak Activity Hours (Area Chart) */}
                            <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-xl">
                                <div className="flex items-center justify-between mb-6 px-2">
                                    <div>
                                        <h3 className="text-sm font-black text-white uppercase tracking-widest">Peak Doubt Hours</h3>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Doubt volume by time of day</p>
                                    </div>
                                    <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                                    </div>
                                </div>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.peakHours}>
                                            <defs>
                                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                                            <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                itemStyle={{ fontSize: '11px', color: '#fff', fontWeight: 'bold' }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="count" 
                                                stroke="#06b6d4" 
                                                strokeWidth={3}
                                                fillOpacity={1} 
                                                fill="url(#colorCount)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
