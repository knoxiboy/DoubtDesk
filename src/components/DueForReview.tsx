"use client";

import { useEffect, useState } from "react";
import { Brain, ChevronRight, Loader2 } from "lucide-react";
import PracticeModal from "@/components/classroom/PracticeModal";
interface DueAttempt {
    id: number;
    originalDoubtId: number;
    generatedQuestion: string;
    nextReviewAt: string;
    intervalDays: number;
    easeFactor: number;
}

export default function DueForReview() {
    const [items, setItems] = useState<DueAttempt[] | null>(null);
    const [selected, setSelected] = useState<DueAttempt | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch("/api/practice/due")
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled) setItems(data.items ?? []);
            })
            .catch(() => {
                if (!cancelled) setItems([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (items === null) {
        return (
            <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking review queue...
            </div>
        );
    }

    if (items.length === 0) {
        return null;
    }

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-black text-white">
                    Due for Review ({items.length})
                </h3>
            </div>
            <ul className="space-y-2">
                {items.slice(0, 5).map((item) => (
                    <li key={item.id}>
                        <button
                            onClick={() => setSelected(item)}
                            className="w-full flex items-center justify-between text-left px-3 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
                        >
                            <span className="text-slate-300 text-xs line-clamp-1 pr-2">
                                {item.generatedQuestion}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 shrink-0" />
                        </button>
                    </li>
                ))}
            </ul>

            {selected && (
                <PracticeModal
                    isOpen={!!selected}
                    onClose={() => setSelected(null)}
                    doubtId={selected.originalDoubtId}
                    subject=""
                    subTopic={null}
                    reviewAttempt={{
                        id: selected.id,
                        question: selected.generatedQuestion,
                    }}
                />
            )}
        </div>
    );
}