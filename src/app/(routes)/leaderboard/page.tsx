"use client";

import { useEffect, useState } from "react";
import { Trophy, Flame, Medal, Award, Crown, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type LeaderboardUser = {
    rank: number;
    id: number;
    handle: string;
    initial: string;
    karmaScore: number;
    karmaLevel: number;
    currentStreak: number;
    lastContributionAt: string | null;
};

export default function LeaderboardPage() {
    const [users, setUsers] = useState<LeaderboardUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchLeaderboard() {
            try {
                const res = await fetch("/api/leaderboard");
                const data = await res.json();
                setUsers(data);
            } catch (error) {
                console.error("Failed to fetch leaderboard", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchLeaderboard();
    }, []);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />;
        if (rank === 2) return <Medal className="w-7 h-7 text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.5)]" />;
        if (rank === 3) return <Award className="w-6 h-6 text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]" />;
        return <span className="text-xl font-bold text-slate-400">#{rank}</span>;
    };

    const getRankRowClass = (rank: number) => {
        if (rank === 1) return "bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border-yellow-500/20";
        if (rank === 2) return "bg-gradient-to-r from-slate-400/10 to-slate-300/5 border-slate-400/20";
        if (rank === 3) return "bg-gradient-to-r from-amber-700/10 to-amber-600/5 border-amber-700/20";
        return "bg-white/5 border-white/5 hover:bg-white/10";
    };

    if (isLoading) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-8 sm:mb-12 text-center space-y-4">
                <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl mb-4 ring-1 ring-white/10 shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)]">
                    <Trophy className="w-12 h-12 text-blue-400" />
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 tracking-tight">
                    Global Leaderboard
                </h1>
                <p className="text-slate-400 font-medium max-w-xl mx-auto">
                    Top students contributing to the community. Earn karma by posting helpful solutions and maintaining your daily streak.
                </p>
            </div>

            <div className="space-y-4">
                {users.map((user) => (
                    <div
                        key={user.id}
                        className={`group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-xl ${getRankRowClass(user.rank)}`}
                    >
                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                        <div className="flex items-center gap-6 w-full sm:w-auto relative z-10">
                            <div className="w-12 flex justify-center shrink-0">
                                {getRankIcon(user.rank)}
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner shrink-0 group-hover:border-blue-500/30 transition-colors">
                                    <span className="text-lg font-black text-slate-300 group-hover:text-blue-400 transition-colors">
                                        {user.initial}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        {user.handle}
                                        {user.currentStreak > 2 && (
                                            <span className="flex items-center text-xs font-black bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full border border-orange-500/20">
                                                <Flame className="w-3 h-3 mr-1" />
                                                {user.currentStreak}
                                            </span>
                                        )}
                                    </h3>
                                    <div className="text-sm text-slate-400 font-medium mt-0.5 flex items-center gap-2">
                                        Level {user.karmaLevel}
                                        {user.lastContributionAt && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-slate-600" />
                                                <span className="text-xs">
                                                    Active {formatDistanceToNow(new Date(user.lastContributionAt), { addSuffix: true })}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-0 ml-[4.5rem] sm:ml-0 flex items-center relative z-10">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400">
                                    {user.karmaScore.toLocaleString()}
                                </span>
                                <span className="text-sm font-bold tracking-widest text-slate-500 uppercase">
                                    Karma
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {users.length === 0 && (
                    <div className="text-center p-12 bg-white/5 border border-white/5 rounded-3xl">
                        <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-slate-300">No users yet</h3>
                        <p className="text-slate-500 mt-2">The leaderboard will update as students earn karma.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
