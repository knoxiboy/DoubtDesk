"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MessageSquare, BookOpen, Users, ThumbsUp, ArrowLeft, RefreshCw, AlertTriangle, Mail, Loader2, Bell } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProfileData, ProfileDoubt, ProfileReply, ProfileClassroom } from "@/types/profile";


/** Skeleton placeholder that mirrors the profile page layout. */
function ProfileSkeleton() {
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl mt-16 animate-pulse">
            {/* Back button skeleton */}
            <div className="h-5 w-24 bg-slate-800 rounded mb-6" />

            {/* Header skeleton */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 bg-slate-900/50 rounded-xl border border-slate-800 p-6">
                <div className="w-24 h-24 rounded-full bg-slate-800" />
                <div className="flex-1 space-y-3 text-center md:text-left">
                    <div className="h-8 w-48 bg-slate-800 rounded mx-auto md:mx-0" />
                    <div className="h-4 w-36 bg-slate-800/70 rounded mx-auto md:mx-0" />
                    <div className="flex gap-2 mt-4 justify-center md:justify-start">
                        <div className="h-6 w-16 bg-slate-800 rounded-full" />
                        <div className="h-6 w-24 bg-slate-800 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Stats skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col items-center gap-2">
                        <div className="w-8 h-8 bg-slate-800 rounded" />
                        <div className="h-7 w-10 bg-slate-800 rounded" />
                        <div className="h-4 w-20 bg-slate-800/70 rounded" />
                    </div>
                ))}
            </div>

            {/* Tabs skeleton */}
            <div className="h-10 w-full bg-slate-900 rounded-lg border border-slate-800 mb-8" />
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
                        <div className="h-5 w-2/3 bg-slate-800 rounded" />
                        <div className="h-4 w-1/3 bg-slate-800/70 rounded" />
                        <div className="h-4 w-full bg-slate-800/50 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}

interface ErrorStateProps {
    message: string;
    onRetry: () => void;
}

/** Full-screen error state with retry button. */
function ErrorState({ message, onRetry }: ErrorStateProps) {
    return (
        <div className="flex h-screen flex-col items-center justify-center text-slate-200 px-4">
            <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
            <h1 className="text-2xl font-bold">Something went wrong</h1>
            <p className="text-muted-foreground mt-2 text-center max-w-md">{message}</p>
            <button
                onClick={onRetry}
                className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-semibold border border-slate-700 transition-all"
            >
                <RefreshCw className="w-4 h-4" />
                Try Again
            </button>
        </div>
    );
}


export default function ProfilePage() {
    const { isLoaded, userId } = useAuth();
    const router = useRouter();
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
    const [isSavingPref, setIsSavingPref] = useState(false);

    const fetchProfile = () => {
        setLoading(true);
        setError(null);

        fetch("/api/profile")
            .then((res) => {
                if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
                return res.json();
            })
            .then((data: ProfileData) => {
                if (data.user) {
                    setProfileData(data);
                    setEmailNotificationsEnabled(data.user.emailNotificationsEnabled ?? true);
                } else {
                    setError("Profile data is unavailable. Please try again.");
                }
                setLoading(false);
            })
            .catch((err: unknown) => {
                const message = err instanceof Error ? err.message : "An unexpected error occurred.";
                console.error("Profile fetch error:", err);
                setError(message);
                setLoading(false);
            });
    };

    useEffect(() => {
        if (!isLoaded) return;
        // Auth is handled by middleware — if we reach here, userId is guaranteed.
        if (!userId) {
            router.replace("/sign-in");
            return;
        }
        fetchProfile();
    }, [isLoaded, userId, router]);

    if (!isLoaded || loading) {
        return <ProfileSkeleton />;
    }

    if (error) {
        return <ErrorState message={error} onRetry={fetchProfile} />;
    }

    if (!profileData?.user) {
        return (
            <ErrorState
                message="We couldn't find your profile data. Please try again later."
                onRetry={fetchProfile}
            />
        );
    }

    const { user, stats, activities } = profileData;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-5xl mt-16 text-slate-200">
            {/* Go Back Button */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors mb-6 group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Go Back
            </button>

            {/* Header Section */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 bg-slate-900/50 rounded-xl border border-slate-800 p-6 shadow-sm">
                <Avatar className="w-24 h-24 border-4 border-slate-950 shadow-sm">
                    <AvatarImage src={user.imageUrl} />
                    <AvatarFallback className="text-3xl bg-slate-800 text-slate-200">{user.name.charAt(0)}</AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-bold text-slate-100">{user.name}</h1>
                    <p className="text-slate-400 mt-1 flex items-center justify-center md:justify-start gap-2">
                        <CalendarDays className="w-4 h-4" />
                        Joined {format(new Date(user.joinDate), "MMMM yyyy")}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                        {user.role && <Badge className="bg-slate-800 text-slate-200 hover:bg-slate-700">{user.role}</Badge>}
                        {user.university && <Badge variant="outline" className="border-slate-700 text-slate-300">{user.university}</Badge>}
                        {user.year && <Badge variant="outline" className="border-slate-700 text-slate-300">{user.year}</Badge>}
                    </div>
                </div>

                {/* Email Notification Settings Switch */}
                <div className="flex items-center gap-4 bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 md:self-center shadow-inner">
                    <div className="flex flex-col max-w-[240px]">
                        <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-purple-400" />
                            Email Alerts
                        </span>
                        <span className="text-xs text-slate-400 mt-0.5 leading-normal">
                            Get notified when someone replies to your doubts.
                        </span>
                    </div>
                    <button
                        onClick={async () => {
                            if (isSavingPref) return;
                            setIsSavingPref(true);
                            const newValue = !emailNotificationsEnabled;
                            try {
                                const res = await fetch("/api/profile", {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({ emailNotificationsEnabled: newValue }),
                                });
                                if (res.ok) {
                                    setEmailNotificationsEnabled(newValue);
                                    toast.success(newValue ? "Email notifications enabled!" : "Email notifications disabled!");
                                } else {
                                    toast.error("Failed to update preferences");
                                }
                            } catch (error) {
                                console.error(error);
                                toast.error("Error updating preferences");
                            } finally {
                                setIsSavingPref(false);
                            }
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            emailNotificationsEnabled ? "bg-purple-600" : "bg-slate-700"
                        } ${isSavingPref ? "opacity-50 pointer-events-none" : ""}`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                                emailNotificationsEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                        >
                            {isSavingPref ? (
                                <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />
                            ) : emailNotificationsEnabled ? (
                                <Bell className="w-3 h-3 text-purple-600" />
                            ) : null}
                        </span>
                    </button>
                </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="bg-blue-500/10 border-blue-500/20 shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                        <MessageSquare className="w-8 h-8 text-blue-400 mb-2 opacity-90" />
                        <h3 className="text-2xl font-bold text-slate-100">{stats.totalDoubts}</h3>
                        <p className="text-sm text-blue-200/70">Doubts Asked</p>
                    </CardContent>
                </Card>
                <Card className="bg-indigo-500/10 border-indigo-500/20 shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                        <BookOpen className="w-8 h-8 text-indigo-400 mb-2 opacity-90" />
                        <h3 className="text-2xl font-bold text-slate-100">{stats.totalReplies}</h3>
                        <p className="text-sm text-indigo-200/70">Replies Given</p>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/10 border-emerald-500/20 shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                        <ThumbsUp className="w-8 h-8 text-emerald-400 mb-2 opacity-90" />
                        <h3 className="text-2xl font-bold text-slate-100">{stats.helpfulVotes}</h3>
                        <p className="text-sm text-emerald-200/70">Helpful Votes</p>
                    </CardContent>
                </Card>
                <Card className="bg-purple-500/10 border-purple-500/20 shadow-sm">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                        <Users className="w-8 h-8 text-purple-400 mb-2 opacity-90" />
                        <h3 className="text-2xl font-bold text-slate-100">{stats.classroomsCount}</h3>
                        <p className="text-sm text-purple-200/70">Classrooms</p>
                    </CardContent>
                </Card>
            </div>

            {/* Activity Tabs */}
            <Tabs defaultValue="doubts" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-900 border border-slate-800 p-1">
                    <TabsTrigger value="doubts" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">My Doubts</TabsTrigger>
                    <TabsTrigger value="replies" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">My Replies</TabsTrigger>
                    <TabsTrigger value="classrooms" className="data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100 text-slate-400">My Classrooms</TabsTrigger>
                </TabsList>

                <TabsContent value="doubts" className="space-y-4">
                    {activities.doubts.length === 0 ? (
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                                <MessageSquare className="w-12 h-12 text-slate-600 mb-4 opacity-50" />
                                <h3 className="text-lg font-medium text-slate-300">No doubts yet</h3>
                                <p className="text-sm text-slate-500 mt-1">You haven&apos;t posted any doubts.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        activities.doubts.map((doubt: ProfileDoubt) => (
                            <Card key={doubt.id} className="bg-slate-900/50 border-slate-800 hover:bg-slate-800/80 transition-all shadow-sm">
                                <CardHeader className="py-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg text-slate-100">{doubt.subject}</CardTitle>
                                            <CardDescription className="text-slate-400">{doubt.subTopic}</CardDescription>
                                        </div>
                                        <Badge className={doubt.isSolved === "solved" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-400 border-slate-700"} variant="outline">
                                            {doubt.isSolved}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="py-2">
                                    <p className="text-sm text-slate-300 line-clamp-2">
                                        {doubt.content || "No description provided."}
                                    </p>
                                    <div className="flex gap-4 mt-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <ThumbsUp className="w-3 h-3 text-emerald-400/70" /> {doubt.likes || 0}
                                        </span>
                                        <span>
                                            {format(new Date(doubt.createdAt), "MMM d, yyyy")}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="replies" className="space-y-4">
                    {activities.replies.length === 0 ? (
                        <Card className="bg-slate-900/50 border-slate-800">
                            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                                <BookOpen className="w-12 h-12 text-slate-600 mb-4 opacity-50" />
                                <h3 className="text-lg font-medium text-slate-300">No replies yet</h3>
                                <p className="text-sm text-slate-500 mt-1">You haven&apos;t replied to any doubts.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        activities.replies.map((reply: ProfileReply) => (
                            <Card key={reply.id} className="bg-slate-900/50 border-slate-800 hover:bg-slate-800/80 transition-all shadow-sm">
                                <CardHeader className="py-4">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className="capitalize bg-slate-800 text-slate-300 border-slate-700">{reply.type}</Badge>
                                        <span className="text-xs text-slate-500">
                                            {format(new Date(reply.createdAt), "MMM d, yyyy")}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="py-2">
                                    <p className="text-sm text-slate-300 line-clamp-3">{reply.content}</p>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>

                <TabsContent value="classrooms" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activities.classrooms.length === 0 ? (
                        <div className="col-span-full">
                            <Card className="bg-slate-900/50 border-slate-800">
                                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                                    <Users className="w-12 h-12 text-slate-600 mb-4 opacity-50" />
                                    <h3 className="text-lg font-medium text-slate-300">No classrooms yet</h3>
                                    <p className="text-sm text-slate-500 mt-1">You haven&apos;t joined any classrooms.</p>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        activities.classrooms.map((classroom: ProfileClassroom) => (
                            <Card key={classroom.id} className="flex flex-col bg-slate-900/50 border-slate-800 hover:bg-slate-800/80 transition-all shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-xl text-slate-100">{classroom.name}</CardTitle>
                                    <CardDescription className="text-slate-400">{classroom.university}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    <div className="space-y-2 text-sm text-slate-300">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Year:</span>
                                            <span className="font-medium">{classroom.year}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Teacher:</span>
                                            <span className="font-medium">{classroom.teacherEmail.split('@')[0]}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
