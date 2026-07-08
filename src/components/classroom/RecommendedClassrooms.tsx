"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Users, Flame } from "lucide-react";

type Classroom = {
    id: number;
    name: string;
    university: string;
    year: string;
    inviteCode: string;
    teacherEmail: string;
    recommendationScore: number;
    memberCount: number;
    activityCount: number;
};

const ERROR_MESSAGES = {
    RECOMMENDATIONS_LOAD_FAILED: "Failed to load recommendations",
} as const;

const UI_TEXT = {
    ERROR_HEADING: "Unable to load recommendations.",
    RETRY_BUTTON: "Try again",
    RETRY_RECOMMENDATIONS_LABEL: "Retry loading recommendations",
} as const;

export default function RecommendedClassrooms({ onJoin }: { onJoin?: (inviteCode: string) => void }) {
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRecommendations = async () => {
        setError(null);
        try {
            const res = await fetch("/api/recommendations");
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.error || ERROR_MESSAGES.RECOMMENDATIONS_LOAD_FAILED);
            }

            setClassrooms(data.recommendations || []);
            setError(null);
        } catch (error) {
            console.error(error);
            setError(error instanceof Error ? error.message : ERROR_MESSAGES.RECOMMENDATIONS_LOAD_FAILED);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRecommendations();
    }, []);

    const refreshRecommendations = async () => {
        setRefreshing(true);
        await fetchRecommendations();
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading recommendations...
            </div>
        );
    }

    if (error) {
        return (
            <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
                <p className="font-medium">{UI_TEXT.ERROR_HEADING}</p>
                <p className="mt-1 text-red-600">{error}</p>
                <button
                    onClick={refreshRecommendations}
                    disabled={refreshing}
                    aria-disabled={refreshing}
                    aria-label={refreshing ? "Retrying classroom recommendations" : UI_TEXT.RETRY_RECOMMENDATIONS_LABEL}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCw
                        aria-hidden="true"
                        className={`h-4 w-4 ${
                            refreshing ? "animate-spin" : ""
                        }`}
                    />
                    {UI_TEXT.RETRY_BUTTON}
                </button>
            </div>
        );
    }

    if (!classrooms.length) {
        return (
            <div className="rounded-xl border p-4 text-sm text-gray-500">
                No recommendations available right now.
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/30 p-5 shadow-sm text-slate-900 dark:text-zinc-100">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">
                        Recommended For You
                    </h2>

                    <p className="text-sm text-slate-500 dark:text-zinc-400">
                        Personalized classrooms based on your profile
                    </p>
                </div>

                <button
                    onClick={refreshRecommendations}
                    disabled={refreshing}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-zinc-800 px-3 py-2 text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900/60 transition"
                  aria-label="Interactive button">
                    <RefreshCw
                        className={`h-4 w-4 ${
                            refreshing ? "animate-spin" : ""
                        }`}
                    />

                    Refresh
                </button>
            </div>

            <div className="space-y-4">
                {classrooms.map((classroom) => (
                    <div
                        key={classroom.id}
                        className="rounded-xl border border-slate-100 dark:border-zinc-900 p-4 transition hover:border-blue-500/50 dark:hover:border-blue-500/40"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                    {classroom.name}
                                </h3>

                                <div className="flex flex-wrap gap-2 text-xs text-slate-400 dark:text-zinc-500">
                                    <span>
                                        {classroom.university}
                                    </span>

                                    <span>•</span>

                                    <span>
                                        {classroom.year}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-zinc-400">
                                    <div className="flex items-center gap-1">
                                        <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                        {classroom.memberCount} members
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Flame className="h-3 w-3 text-orange-500 dark:text-orange-400" />
                                        {classroom.activityCount} discussions
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => onJoin?.(classroom.inviteCode)}
                                className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm text-white font-bold transition duration-300 shadow-md shadow-blue-600/10 active:scale-[0.98]"
                            >
                                Join
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
