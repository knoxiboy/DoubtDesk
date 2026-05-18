"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Classroom = {
  id: number;
  name: string;
  subject?: string;
  university?: string;
  year?: string;
  recommendationScore: number;
};

export default function RecommendedClassrooms() {
  const router = useRouter();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/recommendations");

      if (!res.ok) {
        throw new Error("Failed to fetch recommendations");
      }

      const data = await res.json();

      setClassrooms(data.recommendations || []);
    } catch (error) {
      console.error("Recommendation fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (classroomId: number) => {
    try {
      setJoiningId(classroomId);

      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classroomId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to join classroom");
      }

      // Remove joined classroom from recommendations
      setClassrooms((prev) =>
        prev.filter((room) => room.id !== classroomId)
      );

      router.refresh();
    } catch (error) {
      console.error("Join classroom error:", error);
    } finally {
      setJoiningId(null);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border p-6">
        <p className="text-sm text-gray-500">
          Loading recommendations...
        </p>
      </div>
    );
  }

  if (classrooms.length === 0) {
    return (
      <div className="rounded-xl border p-6">
        <h2 className="text-xl font-semibold">
          Recommended Classrooms
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          No recommendations available right now.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            Recommended Classrooms
          </h2>

          <p className="text-sm text-gray-500">
            Personalized suggestions based on your profile
          </p>
        </div>

        <button
          onClick={fetchRecommendations}
          className="rounded-md border px-4 py-2 text-sm hover:bg-gray-100"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {classrooms.map((room) => (
          <div
            key={room.id}
            className="rounded-xl border p-4 transition hover:shadow-md"
          >
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">
                {room.name}
              </h3>

              {room.subject && (
                <p className="text-sm text-gray-500">
                  Subject: {room.subject}
                </p>
              )}

              {room.university && (
                <p className="text-sm text-gray-500">
                  University: {room.university}
                </p>
              )}

              {room.year && (
                <p className="text-sm text-gray-500">
                  Academic Year: {room.year}
                </p>
              )}

              <div className="pt-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  Match Score: {room.recommendationScore}
                </span>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => handleJoin(room.id)}
                disabled={joiningId === room.id}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {joiningId === room.id ? "Joining..." : "Join"}
              </button>

              <button
                onClick={() => router.push(`/rooms/${room.id}`)}
                className="rounded-md border px-4 py-2 text-sm hover:bg-gray-100"
              >
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}