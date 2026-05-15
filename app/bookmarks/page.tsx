"use client";

import { useEffect, useState } from "react";
import { Bookmark, Loader2, ArrowLeft } from "lucide-react";
import DoubtCard from "@/components/DoubtCard";
import { useRouter } from "next/navigation";
import { useAppUser } from "@/app/provider";

export default function BookmarksPage() {
    const [bookmarks, setBookmarks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { appUser } = useAppUser();

    const fetchBookmarks = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/bookmarks");
            const data = await res.json();
            if (res.ok) {
                setBookmarks(data);
            }
        } catch (error) {
            console.error("Failed to fetch bookmarks:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBookmarks();
    }, []);

    return (
        <div className="min-h-screen bg-[#020617] text-white p-8">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <button 
                            onClick={() => router.back()}
                            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest mb-4"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-purple-600/10 rounded-[2rem] flex items-center justify-center border border-purple-500/20">
                                <Bookmark className="w-8 h-8 text-purple-400" />
                            </div>
                            <div>
                                <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase">
                                    Your <span className="text-purple-500 text-shadow-glow">Bookmarks</span>
                                </h1>
                                <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs">
                                    Saved doubts for quick reference
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Loading your saved doubts...</p>
                    </div>
                ) : bookmarks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                    <div className="flex flex-col items-center justify-center py-32 bg-slate-900/20 border border-dashed border-white/5 rounded-[3rem] text-center px-6">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8">
                            <Bookmark className="w-10 h-10 text-slate-700" />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase italic mb-4">No Bookmarks Yet</h3>
                        <p className="text-slate-500 max-w-md mx-auto font-medium leading-relaxed mb-8 text-sm">
                            You haven't bookmarked any doubts yet. Click the bookmark icon on any doubt to save it here for later!
                        </p>
                        <button 
                            onClick={() => router.push("/dashboard")}
                            className="px-8 py-4 bg-white text-black rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all active:scale-95 shadow-xl"
                        >
                            Explore Doubts
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
