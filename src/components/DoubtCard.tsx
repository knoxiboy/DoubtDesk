"use client";

import { useState, useEffect, useRef } from "react";
import { MessageSquare, ThumbsUp, CheckCircle, Edit2, Trash2, X, ZoomIn, AlertTriangle, Pin, Bookmark, Clock, Loader2 } from "lucide-react";
import AskDoubt from "./AskDoubt";
import DoubtRepliesModal from "./DoubtRepliesModal";
import { toast } from "sonner";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import type { Doubt, Tag } from "@/types";
import { useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

interface DoubtCardProps {
    doubt: Doubt & {
        tags?: Tag[];
        hasBookmarked?: boolean;
        hasLiked?: boolean;
        replyCount?: number;
    };
    onUpdate?: () => void;
    onViewAISolution?: (
        doubt: Doubt & {
            tags?: Tag[];
            hasBookmarked?: boolean;
            hasLiked?: boolean;
            replyCount?: number;
        },
    ) => void;
    role?: string;
    openRepliesOnMount?: boolean;
}

export default function DoubtCard({ doubt, onUpdate, onViewAISolution, role, openRepliesOnMount = false }: DoubtCardProps) {
    const { isSignedIn } = useUser();
    const [isOwner, setIsOwner] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const [isSolving, setIsSolving] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isFullscreenImageOpen, setIsFullscreenImageOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isRepliesOpen, setIsRepliesOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isPinning, setIsPinning] = useState(false);
    const [isBookmarking, setIsBookmarking] = useState(false);
    const [likes, setLikes] = useState<number>(doubt.likes || 0);
    const searchParams = useSearchParams();
    const lastAutoOpenedThread = useRef<string | null>(null);

    const isTeacher = role === 'teacher';

    useEffect(() => {
        const savedName = localStorage.getItem("anonymous_user");
        if (savedName === doubt.userName) {
            setIsOwner(true);
        }
    }, [doubt.userName]);

    useEffect(() => {
        const deepLinkedDoubtId = searchParams ? (Number(searchParams.get("doubtId") || "") || null) : null;
        const shouldAutoOpen = openRepliesOnMount || deepLinkedDoubtId === doubt.id;
        const autoOpenKey = shouldAutoOpen ? `${doubt.id}:${searchParams ? (searchParams.get("doubtId") || "") : ""}` : null;

        if (shouldAutoOpen && autoOpenKey !== lastAutoOpenedThread.current) {
            setIsRepliesOpen(true);
            lastAutoOpenedThread.current = autoOpenKey;
        }
    }, [doubt.id, openRepliesOnMount, searchParams]);

    const handleAction = async (action: string) => {
        if (action === "like") {
            setIsLiking(true);
            setLikes(prev => prev + 1);
        }
        if (action === "solve") setIsSolving(true);

        const userName = localStorage.getItem("anonymous_user");

        try {
            const res = await fetch(`/api/doubts/action/${doubt.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, userName }),
            });

            const data = await res.json();

            if (res.ok && onUpdate) {
                onUpdate();
                if (action === "solve") {
                    const statusText = doubt.isSolved === "solved" ? "Doubt marked as unsolved." : "Doubt marked as solved!";
                    toast.success(statusText);
                }
            } else if (!res.ok) {
                toast.error(data.error || `Failed to ${action} doubt.`);
            }
        } catch (error) {
            if(action === 'like') setLikes(prev => prev -1);

            console.error(`Action ${action} failed:`, error);
            toast.error(`Failed to ${action} doubt.`);
        } finally {
            setIsLiking(false);
            setIsSolving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/doubts/action/${doubt.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Doubt deleted successfully");
                if (onUpdate) onUpdate();
                setIsDeleteDialogOpen(false);
            } else {
                toast.error("Failed to delete doubt");
            }
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error("An error occurred during deletion");
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePin = async () => {
        setIsPinning(true);
        try {
            const res = await fetch(`/api/doubts/${doubt.id}/pin`, {
                method: doubt.isPinned ? "DELETE" : "POST",
            });

            const data = await res.json();
            if (res.ok) {
                toast.success(doubt.isPinned ? "Doubt unpinned" : "Doubt pinned to top!");
                if (onUpdate) onUpdate();
            } else {
                toast.error(data.error || "Failed to update pin status");
            }
        } catch (error) {
            toast.error("Error updating pin status");
        } finally {
            setIsPinning(false);
        }
    };

    const handleBookmark = async () => {
        setIsBookmarking(true);
        try {
            const res = await fetch(`/api/doubts/${doubt.id}/bookmark`, {
                method: doubt.hasBookmarked ? "DELETE" : "POST",
            });

            if (res.ok) {
                toast.success(doubt.hasBookmarked ? "Bookmark removed" : "Added to bookmarks!");
                if (onUpdate) onUpdate();
            } else {
                toast.error("Failed to update bookmark");
            }
        } catch (error) {
            toast.error("Error updating bookmark");
        } finally {
            setIsBookmarking(false);
        }
    };

    return (
        <>
            <div className={`group bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 hover:border-blue-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/5 flex flex-col h-full relative overflow-hidden ${doubt.isPendingSync ? "opacity-65 italic" : ""}`}>
                {/* Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/5 blur-[100px] rounded-full group-hover:bg-blue-600/10 transition-all duration-500"></div>

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 sm:mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                            <span className="text-lg font-black text-blue-400">{doubt.userName?.slice(-1)?.toUpperCase() || '?'}</span>
                        </div>
                        <div>
                            <h3 className="text-slate-900 dark:text-white font-bold tracking-tight text-sm">
                                {doubt.userName || 'Anonymous'}
                                {isOwner && <span className="ml-2 text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">You</span>}
                            </h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                {new Date(doubt.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        {doubt.isPendingSync ? (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-500/10 border border-slate-500/20 rounded-full animate-pulse">
                                <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Syncing Offline...</span>
                            </div>
                        ) : (
                            <>
                                {isTeacher && doubt.classroomId && (
                                    <button
                                        onClick={handlePin}
                                        disabled={isPinning}
                                        className={`p-2 rounded-xl border transition-all ${ doubt.isPinned ? "bg-blue-600/20 border-blue-500/40 text-blue-400" : "bg-white/5 border-white/10 text-slate-500 hover:text-blue-400" }`}
                                        title={doubt.isPinned ? "Unpin doubt" : "Pin doubt to top"}
                                        aria-label="Interactive button"
                                    >
                                        <Pin className={`w-4 h-4 ${doubt.isPinned ? 'fill-blue-400' : ''} ${isPinning ? 'animate-pulse' : ''}`} />
                                    </button>
                                )}
                                {doubt.isPinned && !isTeacher && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                        <Pin className="w-3 h-3 text-blue-400 fill-blue-400" />
                                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Pinned</span>
                                    </div>
                                )}
                                {doubt.isSolved === "solved" ? (
                                    <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
                                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Solved</span>
                                    </div>
                                ) : doubt.isSolved === "in-progress" ? (
                                    <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-1.5">
                                        <Clock className="w-3 h-3 text-amber-500" />
                                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">In Progress</span>
                                    </div>
                                ) : (
                                    <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full flex items-center gap-1.5">
                                        <AlertTriangle className="w-3 h-3 text-red-500" />
                                        <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Unsolved</span>
                                    </div>
                                )}
                            </>
                        )}
                        <div className="px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full">
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{doubt.subject}</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-6">
                    {doubt.content && (
                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-6 font-medium line-clamp-4">
                            {doubt.content}
                        </p>
                    )}

                    {(doubt.tags?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {doubt.tags?.map((tag: Tag) => (
                                <span
                                    key={tag.id || tag.name}
                                    className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[9px] font-black uppercase tracking-widest"
                                >
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                    )}

                    {doubt.imageUrl && (
                        <div
                            onClick={() => setIsFullscreenImageOpen(true)}
                            className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 aspect-video group-hover:border-slate-300 dark:group-hover:border-white/20 transition-colors cursor-zoom-in group/img"
                        >
                            <img
                                src={doubt.imageUrl}
                                alt="Doubt"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <ZoomIn className="w-8 h-8 text-white/50" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {!doubt.isPendingSync && (
                    <div className="mt-auto pt-6 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2.5 flex-1">
                            <button
                                onClick={() => handleAction("like")}
                                disabled={isLiking}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl transition-all group/btn ${ doubt.hasLiked ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10" : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5" }`}
                            >
                                <ThumbsUp className={`w-4 h-4 ${isLiking ? 'animate-pulse' : 'group-hover/btn:scale-110 transition-transform'} ${doubt.hasLiked ? 'fill-blue-400' : ''}`} />
                                <span className="text-xs font-black">{likes}</span>
                            </button>

                            {isSignedIn && (
                                <button
                                    onClick={handleBookmark}
                                    disabled={isBookmarking}
                                    className={`flex items-center justify-center p-3 rounded-2xl transition-all ${ doubt.hasBookmarked ? "bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10" : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5" }`}
                                    title={doubt.hasBookmarked ? "Remove bookmark" : "Add to bookmarks"}
                                    aria-label="Interactive button"
                                >
                                    <Bookmark className={`w-4 h-4 ${isBookmarking ? 'animate-pulse' : ''} ${doubt.hasBookmarked ? 'fill-purple-400' : ''}`} />
                                </button>
                            )}

                            {((isOwner && doubt.type !== 'ai') || isTeacher) && doubt.isSolved !== "solved" && (
                                <button
                                    onClick={() => handleAction("solve")}
                                    disabled={isSolving}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-slate-900 dark:hover:text-white rounded-2xl transition-all border border-emerald-500/20 active:scale-95 group/sol"
                                >
                                    <CheckCircle className={`w-4 h-4 ${isSolving ? 'animate-spin' : 'group-hover/sol:scale-110'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Mark Solved</span>
                                </button>
                            )}

                            {doubt.isSolved === "solved" && (
                                <button
                                    onClick={() => {
                                        if (doubt.type === 'ai' && onViewAISolution) {
                                            onViewAISolution(doubt);
                                        } else {
                                            setIsRepliesOpen(true);
                                        }
                                    }}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all shadow-2xl shadow-emerald-500/30 active:scale-95 group/sol whitespace-nowrap"
                                >
                                    <CheckCircle className="w-4 h-4 fill-white/20 group-hover/sol:scale-110 transition-transform flex-shrink-0" />
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">View Official Solution</span>
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2.5">
                            {(isOwner || isTeacher) && (
                                <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 flex-1 sm:flex-none justify-center">
                                    {isOwner && (
                                        <button
                                            onClick={() => setIsEditModalOpen(true)}
                                            className="flex-1 sm:flex-none p-3 rounded-xl hover:bg-blue-600/20 text-slate-500 dark:text-slate-500 hover:text-blue-400 transition-all group/edit"
                                            aria-label="Edit doubt"
                                        >
                                            <Edit2 className="w-4 h-4 group-hover/edit:scale-110 transition-transform" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsDeleteDialogOpen(true)}
                                        className="flex-1 sm:flex-none p-3 rounded-xl hover:bg-red-500/20 text-slate-500 dark:text-slate-500 hover:text-red-400 transition-all group/trash"
                                        aria-label="Delete doubt"
                                    >
                                        <Trash2 className="w-4 h-4 group-hover/trash:scale-110 transition-transform" />
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={() => setIsRepliesOpen(true)}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-200 dark:border-white/5 active:scale-95 group/msg"
                            >
                                <MessageSquare className="w-5 h-5 group-hover/msg:scale-110 transition-transform" />
                                <span className="text-xs font-black">{doubt.replyCount || 0}</span>
                            </button>
                        </div>
                    </div>
                )}

                {isEditModalOpen && (
                    <AskDoubt
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        doubtToEdit={doubt}
                        onSuccess={() => {
                            setIsEditModalOpen(false);
                            if (onUpdate) onUpdate();
                        }}
                    />
                )}

                <DoubtRepliesModal
                    doubt={doubt}
                    isOpen={isRepliesOpen}
                    onClose={() => setIsRepliesOpen(false)}
                    onReplyChange={onUpdate}
                    isTeacher={isTeacher}
                />
            </div>

            {/* Fullscreen Image Overlay */}
            {isFullscreenImageOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in duration-300"
                    onClick={() => setIsFullscreenImageOpen(false)}
                >
                    <button
                        className="absolute top-8 right-8 p-3 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-white/20 text-slate-900 dark:text-white transition-all z-[110]"
                        onClick={(e) => { e.stopPropagation(); setIsFullscreenImageOpen(false); }}
                        aria-label="Close fullscreen view"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div
                        className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={doubt.imageUrl ?? undefined}
                            alt="Full View"
                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-slate-200 dark:border-white/10"
                        />
                    </div>
                </div>
            )}

            {/* Premium Delete Confirmation Dialog */}
            <DeleteConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={setIsDeleteDialogOpen}
                onConfirm={handleDelete}
                isDeleting={isDeleting}
                title="Delete Post?"
                description="This action cannot be undone. Your doubt and all interactions will be permanently removed."
                confirmText="Yes, Delete"
            />
        </>
    );
}