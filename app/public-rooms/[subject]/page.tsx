"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { MessageSquare, Plus } from "lucide-react";
import AskDoubt from "@/components/AskDoubt";
import InfiniteDoubtFeed from "@/components/InfiniteDoubtFeed";
import { useSWRConfig } from "swr";

export default function PublicRoomPage() {
    const params = useParams();
    const subject = params.subject as string;
    const [isAskModalOpen, setIsAskModalOpen] = useState(false);
    const { mutate } = useSWRConfig();

    const refreshDoubts = () => {
        mutate((key) => typeof key === 'string' && key.startsWith('/api/doubts'), undefined, { revalidate: true });
    };

    return (
        <div className="p-6 md:p-12 space-y-8 max-w-7xl mx-auto pb-24">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
                <div className="space-y-1">
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">
                        {subject}<span className="text-blue-500"> Room</span>
                    </h1>
                    <p className="text-slate-400 text-lg font-medium tracking-tight">
                        Ask and answer doubts anonymously in the <span className="text-blue-400/80 font-bold capitalize">{subject}</span> community.
                    </p>
                </div>
                <button 
                    onClick={() => setIsAskModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    Ask a Doubt
                </button>
            </header>

            <InfiniteDoubtFeed 
                subject={subject}
                emptyMessage={`Be the first to start a conversation in the ${subject} room. All posts are anonymous.`}
                emptyAction={() => setIsAskModalOpen(true)}
                emptyActionLabel="Post the first doubt"
            />

            {isAskModalOpen && (
                <AskDoubt 
                    defaultSubject={subject} 
                    isOpen={isAskModalOpen} 
                    onClose={() => setIsAskModalOpen(false)} 
                    onSuccess={() => {
                        setIsAskModalOpen(false);
                        refreshDoubts();
                    }}
                />
            )}
        </div>
    );
}
