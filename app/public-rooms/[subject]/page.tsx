"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageSquare, Plus } from "lucide-react";
import AskDoubt from "@/components/AskDoubt";
import DoubtCard from "@/components/DoubtCard";

export default function PublicRoomPage() {
    const params = useParams();
    const subject = params.subject as string;
    const [isAskModalOpen, setIsAskModalOpen] = useState(false);
    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchDoubts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/doubts?subject=${subject}`);
            const data = await res.json();
            setDoubts(data);
        } catch (error) {
            console.error("Failed to fetch doubts:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoubts();
    }, [subject]);

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

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Doubts...</p>
                </div>
            ) : doubts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {doubts.map((doubt: any) => (
                        <DoubtCard key={doubt.id} doubt={doubt} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-white/5 rounded-[3rem] bg-white/[0.02] text-center px-6">
                    <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mb-6">
                        <MessageSquare className="w-10 h-10 text-blue-500/50" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">No doubts yet!</h2>
                    <p className="text-slate-500 max-w-sm mx-auto mb-8">
                        Be the first to start a conversation in the {subject} room. All posts are anonymous.
                    </p>
                    <button 
                        onClick={() => setIsAskModalOpen(true)}
                        className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl font-bold transition-all"
                    >
                        Post the first doubt
                    </button>
                </div>
            )}

            {isAskModalOpen && (
                <AskDoubt 
                    defaultSubject={subject} 
                    isOpen={isAskModalOpen} 
                    onClose={() => setIsAskModalOpen(false)} 
                    onSuccess={() => {
                        setIsAskModalOpen(false);
                        fetchDoubts();
                    }}
                />
            )}
        </div>
    );
}
