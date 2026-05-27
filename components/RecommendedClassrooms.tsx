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

export default function RecommendedClassrooms() {
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchRecommendations = async () => {
        try {
            const res = await fetch("/api/recommendations");

            if (!res.ok) {
                throw new Error("Failed to fetch recommendations");
            }

            const data = await res.json();

            setClassrooms(data.recommendations || []);
        } catch (error) {
            console.error(error);
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

    if (!classrooms.length) {
        return (
            <div className="rounded-xl border p-4 text-sm text-gray-500">
                No recommendations available right now.
            </div>
        );
    }

    return (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">
                        Recommended For You
                    </h2>

                    <p className="text-sm text-gray-500">
                        Personalized classrooms based on your profile
                    </p>
                </div>

                <button
                    onClick={refreshRecommendations}
                    disabled={refreshing}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
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
                        className="rounded-xl border p-4 transition hover:border-black"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                                <h3 className="font-semibold">
                                    {classroom.name}
                                </h3>

                                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                    <span>
                                        {classroom.university}
                                    </span>

                                    <span>•</span>

                                    <span>
                                        {classroom.year}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {classroom.memberCount} members
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Flame className="h-3 w-3" />
                                        {classroom.activityCount} discussions
                                    </div>
                                </div>
                            </div>

                            <button className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90">
                                Join
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}