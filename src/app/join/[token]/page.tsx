"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

type InviteStatus =
  | "loading"
  | "valid"
  | "invalid"
  | "expired"
  | "revoked"
  | "already-member"
  | "error";

type InviteDetails = {
  status: InviteStatus;
  error?: string;
  classroom?: {
    id: number;
    name: string;
    university: string;
    year: string;
  };
  expiresAt?: string;
};

export default function JoinClassroomPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  const token = params.token as string;

  const [inviteDetails, setInviteDetails] = useState<InviteDetails>({
    status: "loading",
  });
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const fetchInviteDetails = async () => {
      try {
        const response = await fetch(`/api/invites/${token}`);
        const data = await response.json();

        setInviteDetails({
          status: data.status || "error",
          error: data.error,
          classroom: data.classroom,
          expiresAt: data.expiresAt,
        });
      } catch {
        setInviteDetails({
          status: "error",
          error: "Unable to load invite details. Please try again later.",
        });
      }
    };

    if (token) {
      fetchInviteDetails();
    }
  }, [token]);

  const handleJoinClassroom = async () => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.push(
        `/sign-in?redirect_url=${encodeURIComponent(`/join/${token}`)}`,
      );
      return;
    }

    setIsJoining(true);

    try {
      const response = await fetch(`/api/invites/${token}/join`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        setInviteDetails({
          status: "error",
          error: data.error || "Unable to join classroom.",
        });
        return;
      }

      if (data.classroom?.id) {
        router.push(`/rooms/${data.classroom.id}`);
        return;
      }

      router.push("/rooms");
    } catch {
      setInviteDetails({
        status: "error",
        error: "Unable to join classroom. Please try again later.",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const classroom = inviteDetails.classroom;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Join Classroom</h1>
          <p className="mt-2 text-sm text-gray-600">
            Review the classroom invite before joining.
          </p>
        </div>

        {inviteDetails.status === "loading" && (
          <div className="rounded-lg bg-gray-100 p-4 text-center text-gray-700">
            Loading invite details...
          </div>
        )}

        {classroom &&
          ["valid", "already-member"].includes(inviteDetails.status) && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 p-5">
                <p className="text-sm font-medium text-gray-500">Classroom</p>
                <h2 className="mt-1 text-xl font-semibold text-gray-900">
                  {classroom.name}
                </h2>

                <div className="mt-4 grid gap-3 text-sm text-gray-700">
                  <div>
                    <span className="font-medium">University:</span>{" "}
                    {classroom.university}
                  </div>
                  <div>
                    <span className="font-medium">Year:</span> {classroom.year}
                  </div>
                  {inviteDetails.expiresAt && (
                    <div>
                      <span className="font-medium">Invite expires:</span>{" "}
                      {new Date(inviteDetails.expiresAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {inviteDetails.status === "already-member" ? (
                <button
                  type="button"
                  onClick={() => router.push(`/rooms/${classroom.id}`)}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700"
                >
                  Open Classroom
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleJoinClassroom}
                  disabled={isJoining}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isJoining
                    ? "Joining..."
                    : isSignedIn
                      ? "Join Classroom"
                      : "Sign in to Join"}
                </button>
              )}
            </div>
          )}

        {["invalid", "expired", "revoked", "error"].includes(
          inviteDetails.status,
        ) && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-red-700">
              {inviteDetails.error || "This invite link is no longer valid."}
            </div>

            <button
              type="button"
              onClick={() => router.push("/rooms")}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              Go to Classrooms
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
