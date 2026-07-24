"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DoubtCard from "@/components/classroom/DoubtCard";
import DoubtRepliesModal from "@/components/classroom/DoubtRepliesModal";
import type { Doubt } from "@/types";

interface DoubtPermalinkClientProps {
    initialDoubt: any;
}

export default function DoubtPermalinkClient({ initialDoubt }: DoubtPermalinkClientProps) {
    const [doubt, setDoubt] = useState<any>({
        ...initialDoubt,
        tags: [],
        replyCount: initialDoubt.replyCount || 0,
        hasLiked: false,
        hasBookmarked: false,
    });

    const fetchDoubt = async () => {
        try {
            const res = await fetch(`/api/doubts/${initialDoubt.id}`);
            if (res.ok) {
                const data = await res.json();
                setDoubt(data);
            }
        } catch (error) {
            console.error("Failed to fetch doubt details:", error);
        }
    };

    useEffect(() => {
        fetchDoubt();
    }, [initialDoubt.id]);

    const backUrl = doubt.classroomId ? `/rooms/${doubt.classroomId}` : "/public-rooms";

    const handleScrollToComments = () => {
        const commentsSection = document.getElementById("permalink-comments");
        if (commentsSection) {
            commentsSection.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 max-w-4xl mx-auto pb-24 text-slate-900 dark:text-zinc-100 bg-white dark:bg-black min-h-screen transition-colors duration-500 relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 dark:from-blue-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />
            
            {/* Header/Back button */}
            <div className="relative z-10 flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-900/60">
                <Link 
                    href={backUrl} 
                    className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all text-sm font-bold uppercase tracking-wider"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Feed
                </Link>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
                    Doubt <span className="text-blue-500">Permalink</span>
                </h1>
            </div>

            {/* Content */}
            <div className="relative z-10 space-y-8">
                <DoubtCard 
                    doubt={doubt} 
                    onUpdate={fetchDoubt} 
                    disableModal={true} 
                    onCommentClick={handleScrollToComments}
                />
                <div id="permalink-comments" className="border border-slate-200 dark:border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <DoubtRepliesModal 
                        doubt={doubt} 
                        isOpen={true} 
                        onClose={() => {}} 
                        onReplyChange={fetchDoubt} 
                        inline={true} 
                    />
                </div>
            </div>
        </div>
    );
}
