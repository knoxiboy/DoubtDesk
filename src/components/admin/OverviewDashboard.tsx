// src/components/admin/OverviewDashboard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    Users,
    School,
    MessageSquare,
    AlertTriangle,
    Activity,
    TrendingUp,
    Clock,
    Brain,
    ShieldAlert,
    ArrowRight,
    Search,
    RefreshCw,
    CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
    Legend
} from "recharts";

type ClassroomHealth = {
    id: number;
    name: string;
    university: string;
    year: string;
    teacherEmail: string;
    teacherName: string;
    enrolledStudents: number;
    totalDoubts: number;
    solvedDoubts: number;
    resolutionRate: number;
    avgResolutionTime: number;
    driftRate: number;
    alertsCount: number;
};

type ConfusionAlert = {
    id: number;
    classroomId: number;
    classroomName: string;
    topic: string;
    summary: string;
    suggestedAction: string;
    confidence: number;
    doubtCount: number;
    createdAt: string;
};

type RoleCount = {
    role: string | null;
    count: number;
};

type SubjectCount = {
    subject: string;
    count: number;
};

type AdminOverviewData = {
    stats: {
        totalUsers: number;
        totalClassrooms: number;
        totalDoubts: number;
        totalAiCalls: number;
        activeConfusionAlerts: number;
        activeClassrooms: number;
        inactiveClassrooms: number;
        rolesBreakdown: RoleCount[];
        subjectVolume: SubjectCount[];
        moderationQueue: {
            pendingFlags: number;
            totalFlags: number;
        };
    };
    classroomHealth: ClassroomHealth[];
    confusionAlerts: ConfusionAlert[];
};

const CHART_COLORS = ["#3b82f6", "#06b6d4", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#64748b"];

export default function OverviewDashboard() {
    const [data, setData] = useState<AdminOverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("overview");

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/overview");
            if (res.redirected && res.url.includes("/403")) {
                window.location.href = "/403";
                return;
            }
            if (!res.ok) {
                if (res.status === 403) {
                    window.location.href = "/403";
                    return;
                }
                throw new Error("Failed to fetch admin overview statistics.");
            }
            const json = await res.json();
            setData(json as AdminOverviewData);
            setError(null);
        } catch (err: unknown) {
            console.error("Dashboard load failure:", err);
            setError(err instanceof Error ? err.message : "Unable to load dashboard data");
            toast.error("Failed to load dashboard metrics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const formatResolutionTime = (minutes: number) => {
        if (minutes <= 0) return "< 1 min";
        if (minutes < 60) return `${minutes} mins`;
        const hours = Math.floor(minutes / 60);
        const remainingMins = minutes % 60;
        return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border border-destructive/20 bg-destructive/5 rounded-3xl text-center space-y-4">
                <ShieldAlert className="w-12 h-12 text-destructive animate-pulse" />
                <div className="space-y-1">
                    <p className="text-lg font-bold text-slate-900 dark:text-white">Failed to Load Dashboard</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all active:scale-95"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Try Again
                </button>
            </div>
        );
    }

    // Filter classrooms based on query
    const filteredClassrooms = data?.classroomHealth.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.university.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.teacherEmail.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const getResolutionRateColor = (rate: number) => {
        if (rate >= 75) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
        if (rate >= 40) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
        return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    };

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic flex items-center gap-3">
                        System <span className="text-blue-600">Overview</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Monitor university organization metrics, safety logs, and classroom learning health.
                    </p>
                </div>

                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-zinc-900/60 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Stats
                </button>
            </div>

            {/* Loading Skeletons */}
            {loading && !data ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="h-32 w-full rounded-3xl" />
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Skeleton className="h-[380px] lg:col-span-2 rounded-3xl" />
                        <Skeleton className="h-[380px] rounded-3xl" />
                    </div>
                </div>
            ) : data && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Users Card */}
                        <Card className="rounded-3xl border border-slate-100 dark:border-zinc-900/60 shadow-md hover:shadow-lg transition-all group overflow-hidden relative bg-white dark:bg-black">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">Platform Users</CardTitle>
                                <Users className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-slate-900 dark:text-white">{data.stats.totalUsers}</div>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                                    {data.stats.rolesBreakdown.map(r => `${r.count} ${r.role || "student"}s`).join(" • ")}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Classrooms Card */}
                        <Card className="rounded-3xl border border-slate-100 dark:border-zinc-900/60 shadow-md hover:shadow-lg transition-all group overflow-hidden relative bg-white dark:bg-black">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-violet-500" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">Classrooms</CardTitle>
                                <School className="h-4 w-4 text-purple-500 group-hover:scale-110 transition-transform" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-slate-900 dark:text-white">{data.stats.totalClassrooms}</div>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">
                                    <span className="text-emerald-500 font-extrabold">{data.stats.activeClassrooms} Active</span> • {data.stats.inactiveClassrooms} Inactive (30d)
                                </p>
                            </CardContent>
                        </Card>

                        {/* Doubts & Resolution Card */}
                        <Card className="rounded-3xl border border-slate-100 dark:border-zinc-900/60 shadow-md hover:shadow-lg transition-all group overflow-hidden relative bg-white dark:bg-black">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">Total Doubts</CardTitle>
                                <MessageSquare className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-slate-900 dark:text-white">{data.stats.totalDoubts}</div>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">
                                    Includes <span className="text-blue-500 font-black">{data.stats.totalAiCalls} AI Tutor Calls</span>
                                </p>
                            </CardContent>
                        </Card>

                        {/* Confusion Spikes Card */}
                        <Card className="rounded-3xl border border-slate-100 dark:border-zinc-900/60 shadow-md hover:shadow-lg transition-all group overflow-hidden relative bg-white dark:bg-black">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-500" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">Active Spikes</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-slate-900 dark:text-white">{data.stats.activeConfusionAlerts}</div>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1.5 flex items-center gap-1">
                                    {data.stats.activeConfusionAlerts > 0 ? (
                                        <>
                                            <span className="text-rose-500 font-black animate-pulse">CRITICAL:</span> Requires attention
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-emerald-500 font-black">HEALTHY:</span> No alerts detected
                                        </>
                                    )}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Navigation Widgets & Moderation Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Moderation Queue Summary */}
                        <Card className="rounded-3xl border border-slate-100 dark:border-zinc-900/60 md:col-span-2 bg-gradient-to-br from-slate-50/50 to-white dark:from-zinc-950/20 dark:to-zinc-950 flex flex-col justify-between p-6">
                            <div className="space-y-2">
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Moderation Queue Health</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Review community flags. There are currently <span className="text-rose-500 font-bold">{data.stats.moderationQueue.pendingFlags} unresolved moderation incidents</span> awaiting admin evaluation.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-4 items-center justify-between mt-4">
                                <div className="flex gap-6">
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-widest font-black">Pending</p>
                                        <p className="text-2xl font-black text-rose-500">{data.stats.moderationQueue.pendingFlags}</p>
                                    </div>
                                    <div className="w-px bg-slate-200 dark:bg-zinc-800 h-10" />
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase tracking-widest font-black">Total Flags</p>
                                        <p className="text-2xl font-black text-slate-700 dark:text-zinc-300">{data.stats.moderationQueue.totalFlags}</p>
                                    </div>
                                </div>
                                <Link
                                    href="/admin/moderation"
                                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                                >
                                    Moderate Queue <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </Card>

                        {/* Class Analytics Shortcut */}
                        <Card className="rounded-3xl border border-slate-100 dark:border-zinc-900/60 p-6 flex flex-col justify-between bg-white dark:bg-black">
                            <div className="space-y-2">
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Classroom Analytics</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Gain deep insights into teacher performance, resolution time distributions, and student analytics.
                                </p>
                            </div>
                            <Link
                                href="/dashboard/analytics"
                                className="flex items-center gap-2 px-5 py-2.5 bg-purple-500/10 hover:bg-purple-50 text-purple-600 dark:hover:bg-purple-900/10 dark:text-purple-400 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all w-fit mt-4"
                            >
                                Open Analytics <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </Card>
                    </div>

                    {/* Tabs Area */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList className="bg-slate-100 dark:bg-zinc-950 p-1 rounded-2xl border border-slate-200/50 dark:border-zinc-900 h-12 gap-1 flex w-full sm:w-fit overflow-x-auto">
                            <TabsTrigger value="overview" className="rounded-xl px-5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-500 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
                                Overview & Charts
                            </TabsTrigger>
                            <TabsTrigger value="classrooms" className="rounded-xl px-5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-500 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white">
                                Classroom Health
                            </TabsTrigger>
                            <TabsTrigger value="alerts" className="rounded-xl px-5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-500 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white flex items-center gap-1.5">
                                Confusion Alerts {data.stats.activeConfusionAlerts > 0 && <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />}
                            </TabsTrigger>
                        </TabsList>

                        {/* TAB 1: OVERVIEW & CHARTS */}
                        <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-200">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Subject Volume Chart */}
                                <Card className="rounded-3xl border border-slate-100 dark:border-zinc-900/60 bg-white dark:bg-black p-6">
                                    <CardHeader className="px-0 pb-4">
                                        <CardTitle className="text-base font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Doubt Volume by Subject</CardTitle>
                                        <CardDescription className="text-xs">Visual breakdown of student questions across academic categories</CardDescription>
                                    </CardHeader>
                                    <CardContent className="px-0 flex justify-center items-center">
                                        {data.stats.subjectVolume.length === 0 ? (
                                            <div className="h-64 flex flex-col justify-center items-center text-slate-400 dark:text-zinc-600">
                                                <MessageSquare className="w-8 h-8 mb-2" />
                                                <p className="text-xs font-bold uppercase tracking-wider">No doubts posted yet</p>
                                            </div>
                                        ) : (
                                            <div className="h-72 w-full max-w-[500px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={data.stats.subjectVolume}
                                                            dataKey="count"
                                                            nameKey="subject"
                                                            cx="50%"
                                                            cy="50%"
                                                            outerRadius={85}
                                                            innerRadius={45}
                                                            paddingAngle={3}
                                                            label={({ subject, count }) => `${subject}: ${count}`}
                                                        >
                                                            {data.stats.subjectVolume.map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="rgba(0,0,0,0.05)" />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            contentStyle={{
                                                                background: "#09090b",
                                                                border: "1px solid #27272a",
                                                                borderRadius: "12px",
                                                                color: "#fff"
                                                            }}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Subject Counts Bar Chart */}
                                <Card className="rounded-3xl border border-slate-100 dark:border-zinc-900/60 bg-white dark:bg-black p-6">
                                    <CardHeader className="px-0 pb-4">
                                        <CardTitle className="text-base font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Subject Popularity Rankings</CardTitle>
                                        <CardDescription className="text-xs">Bar breakdown of categorized doubts</CardDescription>
                                    </CardHeader>
                                    <CardContent className="px-0">
                                        {data.stats.subjectVolume.length === 0 ? (
                                            <div className="h-64 flex flex-col justify-center items-center text-slate-400 dark:text-zinc-600">
                                                <MessageSquare className="w-8 h-8 mb-2" />
                                                <p className="text-xs font-bold uppercase tracking-wider">No doubts posted yet</p>
                                            </div>
                                        ) : (
                                            <div className="h-72 w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={data.stats.subjectVolume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.1} />
                                                        <XAxis dataKey="subject" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                                                        <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                                                        <Tooltip
                                                            cursor={{ fill: "rgba(255,255,255,0.04)" }}
                                                            contentStyle={{
                                                                background: "#09090b",
                                                                border: "1px solid #27272a",
                                                                borderRadius: "12px",
                                                                color: "#fff"
                                                            }}
                                                        />
                                                        <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* TAB 2: CLASSROOMS HEALTH */}
                        <TabsContent value="classrooms" className="space-y-6 animate-in fade-in duration-200">
                            <Card className="rounded-3xl border border-slate-100 dark:border-zinc-900/60 bg-white dark:bg-black p-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <CardTitle className="text-base font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Classroom Health Register</CardTitle>
                                        <CardDescription className="text-xs mt-1">Audit active classes, student engagement metrics, and instructional alignment</CardDescription>
                                    </div>
                                    <div className="relative w-full sm:w-72">
                                        <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by name, teacher or uni..."
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500/50 transition-all text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {filteredClassrooms.length === 0 ? (
                                    <div className="flex flex-col justify-center items-center py-12 text-slate-400 dark:text-zinc-600">
                                        <School className="w-10 h-10 mb-2" />
                                        <p className="text-xs font-bold uppercase tracking-wider">No classrooms found</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-zinc-900">
                                        <Table>
                                            <TableHeader className="bg-slate-50 dark:bg-zinc-950">
                                                <TableRow className="border-b border-slate-100 dark:border-zinc-900">
                                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-500 py-3.5">Classroom</TableHead>
                                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-500 py-3.5">Teacher</TableHead>
                                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-500 py-3.5 text-center">Students</TableHead>
                                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-500 py-3.5 text-center">Doubts</TableHead>
                                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-500 py-3.5 text-center">Resolved Rate</TableHead>
                                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-500 py-3.5 text-center">Resolution Time</TableHead>
                                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-500 py-3.5 text-center">Pedagogy Drift</TableHead>
                                                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-500 py-3.5 text-center">Active Alerts</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredClassrooms.map((classroom) => (
                                                    <TableRow key={classroom.id} className="border-b border-slate-100 dark:border-zinc-900/60 hover:bg-slate-50/50 dark:hover:bg-zinc-950/20">
                                                        <TableCell className="font-bold text-xs text-slate-900 dark:text-white py-4">
                                                            <div className="flex flex-col">
                                                                <span>{classroom.name}</span>
                                                                <span className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider mt-0.5">{classroom.university} ({classroom.year})</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-slate-700 dark:text-zinc-300 py-4">
                                                            <div className="flex flex-col">
                                                                <span>{classroom.teacherName}</span>
                                                                <span className="text-[9px] text-slate-400 dark:text-zinc-500 mt-0.5">{classroom.teacherEmail}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs font-black text-center py-4">{classroom.enrolledStudents}</TableCell>
                                                        <TableCell className="text-xs font-black text-center py-4">{classroom.totalDoubts}</TableCell>
                                                        <TableCell className="py-4">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${getResolutionRateColor(classroom.resolutionRate)}`}>
                                                                    {classroom.resolutionRate}%
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-xs font-semibold text-center text-slate-600 dark:text-zinc-400 py-4">
                                                            {classroom.totalDoubts > 0 && classroom.solvedDoubts > 0 ? (
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                                    <span>{formatResolutionTime(classroom.avgResolutionTime)}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-400 dark:text-zinc-600">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="py-4">
                                                            <div className="flex items-center justify-center">
                                                                {classroom.driftRate > 15 ? (
                                                                    <Badge variant="destructive" className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-widest flex items-center gap-1">
                                                                        <AlertTriangle className="w-2.5 h-2.5" /> High ({classroom.driftRate}%)
                                                                    </Badge>
                                                                ) : classroom.driftRate > 0 ? (
                                                                    <Badge variant="secondary" className="px-2 py-0.5 rounded-full text-[9px] font-semibold flex items-center gap-1">
                                                                        Moderate ({classroom.driftRate}%)
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-[10px] text-emerald-500 font-extrabold flex items-center gap-1">
                                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Normal
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="py-4">
                                                            <div className="flex items-center justify-center">
                                                                {classroom.alertsCount > 0 ? (
                                                                    <Badge className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest animate-pulse">
                                                                        {classroom.alertsCount} Alert{classroom.alertsCount > 1 ? "s" : ""}
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-slate-400 dark:text-zinc-600 text-[10px] font-semibold">-</span>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </Card>
                        </TabsContent>

                        {/* TAB 3: CONFUSION ALERTS MONITOR */}
                        <TabsContent value="alerts" className="space-y-6 animate-in fade-in duration-200">
                            {data.confusionAlerts.length === 0 ? (
                                <Card className="rounded-3xl border border-slate-100 dark:border-zinc-900/60 bg-white dark:bg-black p-12 text-center flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No Active Confusion Spikes</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                                        All classrooms are learning within normal bounds. There are currently no clustered areas of difficulty.
                                    </p>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {data.confusionAlerts.map((alert) => (
                                        <Card key={alert.id} className="rounded-3xl border border-rose-500/20 shadow-md bg-white dark:bg-zinc-950 overflow-hidden relative">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <Badge variant="destructive" className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-full mb-2">
                                                            Spike Detected
                                                        </Badge>
                                                        <CardTitle className="text-base font-black text-slate-900 dark:text-white uppercase italic">
                                                            {alert.topic}
                                                        </CardTitle>
                                                        <span className="text-[9px] text-slate-400 dark:text-zinc-500 uppercase font-black tracking-wider block mt-1">
                                                            Classroom: {alert.classroomName}
                                                        </span>
                                                    </div>
                                                    <div className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3 py-1.5 rounded-2xl flex flex-col items-center text-center shrink-0">
                                                        <span className="text-xl font-black">{alert.doubtCount}</span>
                                                        <span className="text-[7px] font-black uppercase tracking-widest mt-0.5">Doubts</span>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4 pt-2">
                                                {/* Confidence Progress */}
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between items-center text-[9px] uppercase tracking-widest font-black text-slate-500 dark:text-zinc-500">
                                                        <span>Spike Confidence</span>
                                                        <span>{alert.confidence}%</span>
                                                    </div>
                                                    <Progress value={alert.confidence} className="h-2 bg-slate-100 dark:bg-zinc-900" />
                                                </div>

                                                {/* Summary */}
                                                <div className="space-y-1 p-4 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl border border-slate-100 dark:border-zinc-900/60">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                                                        <Brain className="w-3.5 h-3.5 text-rose-400" /> AI Diagnostic Summary
                                                    </span>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold mt-1">
                                                        {alert.summary}
                                                    </p>
                                                </div>

                                                {/* Suggested Action */}
                                                <div className="space-y-1 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1">
                                                        <Activity className="w-3.5 h-3.5" /> Suggested Pedagogical Action
                                                    </span>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-semibold mt-1">
                                                        {alert.suggestedAction}
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-[8px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                                                        Detected {new Date(alert.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}
