"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MessageSquare, BookOpen, Users, ThumbsUp, ArrowLeft, RefreshCw, AlertTriangle, Mail, CheckCircle2, TrendingUp, Target, Heart } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ProfileData, ProfileDoubt, ProfileReply, ProfileClassroom, ActivityStats } from "@/types/profile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function ProfileSkeleton() {
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl mt-16 animate-pulse bg-white dark:bg-black min-h-screen transition-colors duration-500">
      <div className="h-5 w-24 bg-slate-200 dark:bg-zinc-800 rounded-lg mb-6" />

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-200 dark:border-zinc-900 p-6">
        <div className="w-24 h-24 rounded-full bg-slate-200 dark:bg-zinc-800 shrink-0" />
        <div className="flex-1 space-y-3 w-full text-center md:text-left">
          <div className="h-8 w-48 bg-slate-200 dark:bg-zinc-800 rounded-xl mx-auto md:mx-0" />
          <div className="h-4 w-36 bg-slate-200 dark:bg-zinc-800 rounded-lg mx-auto md:mx-0" />
          <div className="flex gap-2 pt-2 justify-center md:justify-start">
            <div className="h-6 w-16 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
            <div className="h-6 w-28 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
            <div className="h-6 w-20 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
          </div>
        </div>
        <div className="h-24 w-full md:w-[380px] bg-slate-100 dark:bg-zinc-900/40 rounded-xl border border-slate-200 dark:border-zinc-900 shrink-0" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-950/20 p-6 flex flex-col items-center gap-3">
            <div className="w-7 h-7 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
            <div className="h-6 w-12 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
            <div className="h-3 w-20 bg-slate-200 dark:bg-zinc-800 rounded-md" />
          </div>
        ))}
        <div className="col-span-2 rounded-xl border border-slate-200 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-950/20 p-6 flex flex-col items-center justify-center gap-3 lg:col-start-2 lg:col-span-2">
          <div className="w-7 h-7 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-6 w-24 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
          <div className="h-3 w-24 bg-slate-200 dark:bg-zinc-800 rounded-md" />
        </div>
      </div>

      <div className="h-12 w-full bg-slate-100 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 mb-8" />
      
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 dark:border-zinc-900 bg-slate-50/30 dark:bg-zinc-950/20 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-2 w-1/2">
                <div className="h-5 w-2/3 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
                <div className="h-3 w-1/3 bg-slate-200 dark:bg-zinc-800 rounded-md" />
              </div>
              <div className="h-6 w-16 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
            </div>
            <div className="h-4 w-full bg-slate-200 dark:bg-zinc-800 rounded-lg" />
            <div className="h-3 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md pt-1" />
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

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-xl min-h-[50vh] flex flex-col items-center justify-center text-center mt-16 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-200 dark:border-red-950/50 bg-red-50 dark:bg-red-950/10 text-red-600 dark:text-red-400 mb-4 shadow-sm">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
        Failed to load profile parameters
      </h3>
      <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed mb-6">
        {message || "An unexpected network layout validation timeout occurred."}
      </p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-zinc-300 shadow-sm transition-all duration-200 hover:bg-slate-50 dark:hover:bg-zinc-800 active:scale-[0.98]"
      >
        <RefreshCw className="h-4 w-4" />
        Retry Sync Connection
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [notificationPreference, setNotificationPreference] = useState<"instant" | "daily" | "weekly" | "none">("instant");
  const [isSavingPref, setIsSavingPref] = useState(false);

  const handlePrefChange = async (value: "instant" | "daily" | "weekly" | "none") => {
    if (isSavingPref) return;
    setIsSavingPref(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationPreference: value }),
      });
      if (res.ok) {
        setNotificationPreference(value);
        setEmailNotificationsEnabled(value !== "none");
        toast.success("Notification preferences updated!");
      } else {
        toast.error("Failed to update preferences");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error updating preferences");
    } finally {
      setIsSavingPref(false);
    }
  };

  const fetchProfile = () => {
    setLoading(true);
    setError(null);

    Promise.all([
      fetch("/api/profile").then((res) => {
        if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
        return res.json();
      }),
      fetch("/api/profile/stats").then((res) => {
        if (!res.ok) throw new Error(`Failed to load stats (${res.status})`);
        return res.json();
      })
    ])
      .then(([profileRes, statsRes]: [ProfileData, { success: boolean, stats: ActivityStats }]) => {
        if (profileRes.user && statsRes.success) {
          setProfileData(profileRes);
          setActivityStats(statsRes.stats);
          setEmailNotificationsEnabled(profileRes.user.emailNotificationsEnabled ?? true);
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
    if (!userId) {
      router.replace("/sign-in");
      return;
    }
    fetchProfile();
  }, [isLoaded, userId, router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("unsubscribed") === "true") {
        toast.success("Successfully unsubscribed from email notifications!");
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  if (!isLoaded || loading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchProfile} />;
  }

  if (!profileData?.user || !activityStats) {
    return (
      <ErrorState
        message="We couldn't find your profile data. Please try again later."
        onRetry={fetchProfile}
      />
    );
  }

  const { user, stats, activities } = profileData;

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl mt-16 text-slate-900 dark:text-zinc-100 bg-white dark:bg-black transition-colors duration-500">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-6 group text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Go Back
      </button>

      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-8 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-200 dark:border-zinc-900 p-6 shadow-sm backdrop-blur-md">
        <Avatar className="w-24 h-24 border-4 border-slate-200 dark:border-zinc-900 shadow-sm">
          <AvatarImage src={user.imageUrl} />
          <AvatarFallback className="text-3xl bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">{user.name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 text-center md:text-left space-y-1.5">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{user.name}</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 flex items-center justify-center md:justify-start gap-2">
            <CalendarDays className="w-4 h-4 text-blue-500" />
            Joined {format(new Date(user.joinDate), "MMMM yyyy")}
          </p>

          <div className="flex flex-wrap gap-2 pt-2 justify-center md:justify-start">
            {user.role && <Badge className="bg-blue-50 text-blue-600 dark:bg-zinc-900 dark:text-zinc-300 border border-blue-100 dark:border-zinc-800 hover:bg-blue-100">{user.role}</Badge>}
            {user.university && <Badge variant="outline" className="border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400">{user.university}</Badge>}
            {user.year && <Badge variant="outline" className="border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400">{user.year}</Badge>}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white/60 dark:bg-zinc-950/20 border border-slate-200 dark:border-zinc-900 rounded-xl p-4 md:self-center shadow-sm min-w-[280px] sm:min-w-[380px] w-full sm:w-auto">
          <div className="flex flex-col max-w-[240px] text-left">
            <span className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-blue-500" />
              Email Alerts
            </span>
            <span className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5 leading-normal">
              Get notified when someone replies to your doubts.
            </span>
          </div>
          <div className="w-full sm:w-auto sm:ml-auto">
            <Select
              value={notificationPreference}
              onValueChange={handlePrefChange}
              disabled={isSavingPref}
            >
              <SelectTrigger className="w-full sm:w-[160px] border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 focus:ring-blue-500">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100">
                <SelectItem value="instant">Instant Alerts</SelectItem>
                <SelectItem value="daily">Daily Digest</SelectItem>
                <SelectItem value="weekly">Weekly Digest</SelectItem>
                <SelectItem value="none">Muted (None)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8" aria-label="Profile Statistics">
        <Card className="bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 shadow-sm transition-all duration-300 hover:border-blue-400/40">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
            <MessageSquare className="w-7 h-7 text-blue-500 mb-2" aria-hidden="true" />
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{stats.totalDoubts || 0}</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mt-0.5">Doubts Asked</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 shadow-sm transition-all duration-300 hover:border-indigo-400/40">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
            <BookOpen className="w-7 h-7 text-indigo-500 mb-2" aria-hidden="true" />
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{stats.totalReplies || 0}</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mt-0.5">Replies Given</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 shadow-sm transition-all duration-300 hover:border-emerald-400/40">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
            <ThumbsUp className="w-7 h-7 text-emerald-500 mb-2" aria-hidden="true" />
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{stats.helpfulVotes || 0}</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mt-0.5">Helpful Votes</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 shadow-sm transition-all duration-300 hover:border-purple-400/40">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
            <Users className="w-7 h-7 text-purple-500 mb-2" aria-hidden="true" />
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{stats.classroomsCount || 0}</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mt-0.5">Classrooms</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 shadow-sm transition-all duration-300 hover:border-rose-400/40">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
            <Heart className="w-7 h-7 text-rose-500 mb-2" aria-hidden="true" />
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{activityStats.totalLikesReceived || 0}</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mt-0.5">Likes Received</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 shadow-sm transition-all duration-300 hover:border-amber-400/40">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
            <TrendingUp className="w-7 h-7 text-amber-500 mb-2" aria-hidden="true" />
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{activityStats.totalReplyUpvotes || 0}</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mt-0.5">Reply Upvotes</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 shadow-sm transition-all duration-300 hover:border-green-400/40">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
            <CheckCircle2 className="w-7 h-7 text-green-500 mb-2" aria-hidden="true" />
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{activityStats.doubtsSolved || 0}</h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mt-0.5">Doubts Solved</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 shadow-sm transition-all duration-300 hover:border-cyan-400/40">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full w-full overflow-hidden">
            <Target className="w-7 h-7 text-cyan-500 mb-2" aria-hidden="true" />
            <h3 className="text-[15px] font-black text-slate-900 dark:text-white truncate w-full max-w-full px-2" title={activityStats.mostActiveSubject || "None"}>
              {activityStats.mostActiveSubject || "No activity"}
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mt-0.5">Active Subject</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 rounded-xl border border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/20 p-6 flex flex-col items-center justify-center gap-1 transition-all duration-300 hover:border-slate-400/40 lg:col-start-2 lg:col-span-2">
          <CalendarDays className="w-7 h-7 text-slate-400 dark:text-zinc-500 mb-1" aria-hidden="true" />
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            {activityStats.memberSince ? format(new Date(activityStats.memberSince), "MMM yyyy") : "Unknown"}
          </h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider mt-0.5">Member Since</p>
        </Card>
      </div>

      <Tabs defaultValue="doubts" className="w-full relative z-10">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded-xl">
          <TabsTrigger value="doubts" className="rounded-lg text-slate-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">My Doubts</TabsTrigger>
          <TabsTrigger value="replies" className="rounded-lg text-slate-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">My Replies</TabsTrigger>
          <TabsTrigger value="classrooms" className="rounded-lg text-slate-600 dark:text-zinc-400 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white data-[state=active]:shadow-sm">My Classrooms</TabsTrigger>
        </TabsList>

        <TabsContent value="doubts" className="space-y-4 outline-none">
          {activities.doubts.length === 0 ? (
            <Card className="bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <MessageSquare className="w-12 h-12 text-slate-400 dark:text-zinc-600 mb-4 opacity-60" />
                <h3 className="text-base font-bold text-slate-800 dark:text-zinc-300">No doubts recorded</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">You haven&apos;t posted any queries yet.</p>
              </CardContent>
            </Card>
          ) : (
            activities.doubts.map((doubt: ProfileDoubt) => (
              <Card key={doubt.id} className="bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 hover:border-blue-400/40 dark:hover:bg-zinc-900/30 transition-all duration-200 rounded-2xl shadow-sm">
                <CardHeader className="py-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{doubt.subject}</CardTitle>
                      <CardDescription className="text-slate-500 dark:text-zinc-400 text-xs font-medium mt-0.5">{doubt.subTopic}</CardDescription>
                    </div>
                    <Badge className={doubt.isSolved === "solved" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-none capitalize" : "bg-slate-100 text-slate-600 dark:bg-zinc-900 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 shadow-none capitalize"} variant="outline">
                      {doubt.isSolved}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-2 space-y-4">
                  <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                    {doubt.content || "No descriptions detailed."}
                  </p>
                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 dark:text-zinc-500 pt-1 border-t border-slate-50 dark:border-zinc-900/50">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" /> {doubt.likes || 0}
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

        <TabsContent value="replies" className="space-y-4 outline-none">
          {activities.replies.length === 0 ? (
            <Card className="bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 rounded-2xl">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <BookOpen className="w-12 h-12 text-slate-400 dark:text-zinc-600 mb-4 opacity-60" />
                <h3 className="text-base font-bold text-slate-800 dark:text-zinc-300">No logs discovered</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">You haven&apos;t provided interaction answers yet.</p>
              </CardContent>
            </Card>
          ) : (
            activities.replies.map((reply: ProfileReply) => (
              <Card key={reply.id} className="bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 hover:border-indigo-400/40 dark:hover:bg-zinc-900/30 transition-all duration-200 rounded-2xl shadow-sm">
                <CardHeader className="py-4 border-b border-slate-50 dark:border-zinc-900/50 mb-3">
                  <div className="flex justify-between items-center gap-4">
                    <Badge variant="outline" className="capitalize bg-slate-50 text-slate-600 dark:bg-zinc-900 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 shadow-none font-semibold">{reply.type}</Badge>
                    <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500">
                      {format(new Date(reply.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="py-2">
                  <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed line-clamp-3">{reply.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="classrooms" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 outline-none">
          {activities.classrooms.length === 0 ? (
            <div className="col-span-full">
              <Card className="bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 rounded-2xl">
                <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                  <Users className="w-12 h-12 text-slate-400 dark:text-zinc-600 mb-4 opacity-60" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-zinc-300">No rooms active</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-500 mt-1">You haven&apos;t established classroom profiles yet.</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            activities.classrooms.map((classroom: ProfileClassroom) => (
              <Card key={classroom.id} className="flex flex-col bg-white dark:bg-zinc-950/20 border-slate-200 dark:border-zinc-900 hover:border-purple-400/40 dark:hover:bg-zinc-900/30 transition-all duration-200 rounded-2xl shadow-sm overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white tracking-tight line-clamp-1">{classroom.name}</CardTitle>
                  <CardDescription className="text-slate-500 dark:text-zinc-400 text-xs font-medium truncate">{classroom.university}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-end pt-2 border-t border-slate-50 dark:border-zinc-900/50 bg-slate-50/30 dark:bg-zinc-950/10">
                  <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-zinc-400">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 dark:text-zinc-500 font-medium">Year Parameters:</span>
                      <span className="text-slate-800 dark:text-zinc-300">{classroom.year}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 dark:text-zinc-500 font-medium">Teacher Allocation:</span>
                      <span className="text-slate-800 dark:text-zinc-300 truncate max-w-[140px]" title={classroom.teacherEmail}>{classroom.teacherEmail.split('@')[0]}</span>
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

export { ProfileSkeleton, ErrorState };