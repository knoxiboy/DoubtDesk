"use client";

import { useState } from "react";
import { format } from "date-fns";
import { History, Clock, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import type { DoubtEdit } from "@/types";

interface DoubtEditHistoryProps {
    doubtId: number;
    trigger?: React.ReactNode;
}

export function DoubtEditHistory({ doubtId, trigger }: DoubtEditHistoryProps) {
    const [edits, setEdits] = useState<DoubtEdit[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [expandedEditId, setExpandedEditId] = useState<number | null>(null);

    const fetchEdits = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/doubts/${doubtId}/edits`);
            if (res.ok) {
                const data = await res.json();
                setEdits(data);
                if (data.length > 0) {
                    setExpandedEditId(data[0].id); // expand the latest edit by default
                }
            }
        } catch (error) {
            console.error("Failed to fetch edits", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (open && edits.length === 0) {
            fetchEdits();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <button className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-zinc-800/50 px-2 py-0.5 rounded-full border border-slate-200 dark:border-zinc-700/50">
                        <History className="w-3 h-3" />
                        (Edited)
                    </button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-zinc-800">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <History className="w-5 h-5 text-blue-500" />
                        Edit History
                    </DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-zinc-900/20">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        </div>
                    ) : edits.length === 0 ? (
                        <div className="text-center p-8 text-slate-500">
                            No edit history found.
                        </div>
                    ) : (
                        <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-zinc-700 before:to-transparent">
                            {edits.map((edit, index) => {
                                const isExpanded = expandedEditId === edit.id;
                                return (
                                    <div key={edit.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        {/* Icon */}
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-black bg-blue-100 dark:bg-blue-900/50 text-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        
                                        {/* Content Card */}
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-all">
                                            <button 
                                                onClick={() => setExpandedEditId(isExpanded ? null : edit.id)}
                                                className="flex items-center justify-between w-full text-left"
                                            >
                                                <div>
                                                    <span className="text-xs font-semibold text-blue-500 tracking-wide uppercase">
                                                        Version {edits.length - index}
                                                    </span>
                                                    <div className="text-sm text-slate-500 mt-1">
                                                        {format(new Date(edit.editedAt), "MMM d, yyyy 'at' h:mm a")}
                                                    </div>
                                                </div>
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                                )}
                                            </button>

                                            {isExpanded && (
                                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800 animate-in slide-in-from-top-2 duration-200">
                                                    {edit.previousSubject && (
                                                        <div className="mb-3">
                                                            <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Previous Subject</div>
                                                            <div className="text-sm font-medium text-slate-900 dark:text-slate-200">{edit.previousSubject}</div>
                                                        </div>
                                                    )}
                                                    {edit.previousContent && (
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Previous Content</div>
                                                            <div className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap line-clamp-6 hover:line-clamp-none transition-all">
                                                                {edit.previousContent}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
