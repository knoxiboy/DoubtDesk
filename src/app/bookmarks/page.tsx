"use client";

import { useEffect, useState } from "react";
import { Bookmark, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import DoubtCard from "@/components/DoubtCard";
import { useRouter } from "next/navigation";
import { useAppUser } from "@/app/provider";
import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from "@clerk/nextjs";

const ERROR_MESSAGES = {
  BOOKMARKS_LOAD_FAILED: "Failed to load bookmarks",
} as const;

const UI_TEXT = {
  ERROR_HEADING: "Unable to Load Bookmarks",
  RETRY_BUTTON: "Try Again",
  RETRY_BOOKMARKS_LABEL: "Retry loading bookmarks",
} as const;

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { appUser } = useAppUser();
  const { isLoaded, isSignedIn } = useAuth();

  const fetchBookmarks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookmarks");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || ERROR_MESSAGES.BOOKMARKS_LOAD_FAILED);
      }

      setBookmarks(data);
    } catch (error) {
      console.error("Failed to fetch bookmarks:", error);
      setError(error instanceof Error ? error.message : ERROR_MESSAGES.BOOKMARKS_LOAD_FAILED);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      return;
    }

    fetchBookmarks();
  }, [isLoaded, isSignedIn]);

  return (
    <>
      <SignedIn>
        <div className="p-4 md:p-8 relative overflow-hidden text-slate-900 dark:text-zinc-100 bg-white dark:bg-black min-h-screen transition-colors duration-500">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/10 dark:from-purple-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />

          <div className="max-w-7xl mx-auto relative z-10 space-y-10 pb-16">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100 dark:border-zinc-900/60">
              <div className="space-y-2">
                <button
                  onClick={() => router.back()}
                  className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors text-xs font-bold uppercase tracking-wider group"
                >
                  <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> 
                  Back
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20 shadow-sm shrink-0">
                    <Bookmark className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                      Your Bookmarks
                    </h1>
                    <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium mt-0.5">
                      Saved doubts for quick reference.
                    </p>
                  </div>
                </div>
              </div>
            </header>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                <p className="text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-xs">Loading your saved doubts...</p>
              </div>
            ) : error ? (
              <div
                role="alert"
                className="flex flex-col items-center justify-center py-20 bg-red-50/50 dark:bg-red-950/10 border border-dashed border-red-200 dark:border-red-900 rounded-2xl text-center px-6 shadow-sm"
              >
                <div className="w-16 h-16 bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                  <Bookmark aria-hidden="true" className="w-7 h-7 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">{UI_TEXT.ERROR_HEADING}</h3>
                <p className="text-slate-500 dark:text-zinc-400 max-w-sm mx-auto font-medium text-xs leading-relaxed mb-6">
                  {error}
                </p>
                <button
                  onClick={fetchBookmarks}
                  aria-label={UI_TEXT.RETRY_BOOKMARKS_LABEL}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-lg shadow-red-600/10 active:scale-[0.98]"
                >
                  <RefreshCw aria-hidden="true" className="w-3.5 h-3.5" />
                  {UI_TEXT.RETRY_BUTTON}
                </button>
              </div>
            ) : bookmarks.length > 0 ? (
              <div className="flex flex-col gap-6 lg:gap-8">
                {bookmarks.map((doubt) => (
                  <DoubtCard
                    key={doubt.id}
                    doubt={doubt}
                    onUpdate={fetchBookmarks}
                    role={appUser?.role}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30 dark:bg-zinc-950/10 border border-dashed border-slate-200 dark:border-zinc-900 rounded-2xl text-center px-6 shadow-sm">
                <div className="w-16 h-16 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl flex items-center justify-center mb-6 shadow-sm">
                  <Bookmark className="w-7 h-7 text-slate-400 dark:text-zinc-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">No Bookmarks Yet</h3>
                <p className="text-slate-500 dark:text-zinc-400 max-w-sm mx-auto font-medium text-xs leading-relaxed mb-6">
                  You haven&apos;t bookmarked any doubts yet. Click the bookmark icon on any doubt card to save it here for later reference!
                </p>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-lg shadow-blue-600/10 active:scale-[0.98]"
                >
                  Explore Doubts
                </button>
              </div>
            )}
          </div>
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
