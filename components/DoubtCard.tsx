"use client";

import { useState, useEffect } from "react";
import { MessageSquare, ThumbsUp, CheckCircle, Edit2, Trash2, X, ZoomIn, AlertTriangle, Pin, Bookmark } from "lucide-react";
import AskDoubt from "./AskDoubt";
import DoubtRepliesModal from "./DoubtRepliesModal";
import { toast } from "sonner";

interface DoubtCardProps {
    doubt: any;
    onUpdate?: () => void;
    onViewAISolution?: (doubt: any) => void;
    role?: string;
}

export default function DoubtCard({ doubt, onUpdate, onViewAISolution, role }: DoubtCardProps) {
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

    const isTeacher = role === 'teacher';

    useEffect(() => {
        const savedName = localStorage.getItem("anonymous_user");
        if (savedName === doubt.userName) {
            setIsOwner(true);
        }
    }, [doubt.userName]);

    const handleAction = async (action: string) => {
        if (action === "like") setIsLiking(true);
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
            } else {
                toast.error("Failed to delete doubt");
            }
        } catch (error) {
            console.error("Delete failed:", error);
            toast.error("An error occurred during deletion");
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
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
            <div className="group bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 hover:border-blue-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/5 flex flex-col h-full relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/5 blur-[100px] rounded-full group-hover:bg-blue-600/10 transition-all duration-500"></div>

                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                            <span className="text-lg font-black text-blue-400">{doubt.userName[doubt.userName.length - 1]}</span>
                        </div>
                        <div>
                            <h3 className="text-white font-bold tracking-tight text-sm">
                                {doubt.userName}
                                {isOwner && <span className="ml-2 text-[10px] bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-widest font-black">You</span>}
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                {new Date(doubt.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isTeacher && doubt.classroomId && (
                            <button
                                onClick={handlePin}
                                disabled={isPinning}
                                className={`p-2 rounded-xl border transition-all ${
                                    doubt.isPinned
                                        ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                                        : "bg-white/5 border-white/10 text-slate-500 hover:text-blue-400"
                                }`}
                                title={doubt.isPinned ? "Unpin doubt" : "Pin doubt to top"}
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
                        ) : (
                            <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Unsolved</span>
                            </div>
                        )}
                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{doubt.subject}</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-6">
                    {doubt.content && (
                        <p className="text-slate-300 text-sm leading-relaxed mb-6 font-medium line-clamp-4">
                            {doubt.content}
                        </p>
                    )}

                    {doubt.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {doubt.tags.map((tag: any) => (
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
                            className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-900 aspect-video group-hover:border-white/20 transition-colors cursor-zoom-in group/img"
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
                <div className="mt-auto pt-6 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 flex-1">
                        <button
                            onClick={() => handleAction("like")}
                            disabled={isLiking}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl transition-all group/btn ${
                                doubt.hasLiked
                                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10"
                                    : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5"
                            }`}
                        >
                            <ThumbsUp className={`w-4 h-4 ${isLiking ? 'animate-pulse' : 'group-hover/btn:scale-110 transition-transform'} ${doubt.hasLiked ? 'fill-blue-400' : ''}`} />
                            <span className="text-xs font-black">{doubt.likes || 0}</span>
                        </button>

                        <button
                            onClick={handleBookmark}
                            disabled={isBookmarking}
                            className={`flex items-center justify-center p-3 rounded-2xl transition-all ${
                                doubt.hasBookmarked
                                    ? "bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-lg shadow-purple-500/10"
                                    : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5"
                            }`}
                            title={doubt.hasBookmarked ? "Remove bookmark" : "Add to bookmarks"}
                        >
                            <Bookmark className={`w-4 h-4 ${isBookmarking ? 'animate-pulse' : ''} ${doubt.hasBookmarked ? 'fill-purple-400' : ''}`} />
                        </button>

                        {((isOwner && doubt.type !== 'ai') || isTeacher) && doubt.isSolved !== "solved" && (
                            <button
                                onClick={() => handleAction("solve")}
                                disabled={isSolving}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-3 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-2xl transition-all border border-emerald-500/20 active:scale-95 group/sol"
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
                                className="flex-[2] sm:flex-none flex items-center justify-center gap-3 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all shadow-2xl shadow-emerald-500/30 active:scale-95 group/sol whitespace-nowrap"
                            >
                                <CheckCircle className="w-4 h-4 fill-white/20 group-hover/sol:scale-110 transition-transform flex-shrink-0" />
                                <span className="text-[11px] font-black uppercase tracking-[0.2em]">View Official Solution</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5">
                        {(isOwner || isTeacher) && (
                            <div className="flex items-center gap-1.5 p-1.5 bg-white/5 rounded-2xl border border-white/5 flex-1 sm:flex-none justify-center">
                                {isOwner && (
                                    <button
                                        onClick={() => setIsEditModalOpen(true)}
                                        className="flex-1 sm:flex-none p-3 rounded-xl hover:bg-blue-600/20 text-slate-500 hover:text-blue-400 transition-all group/edit"
                                        aria-label="Edit doubt"
                                    >
                                        <Edit2 className="w-4 h-4 group-hover/edit:scale-110 transition-transform" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                    className="flex-1 sm:flex-none p-3 rounded-xl hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all group/trash"
                                    aria-label="Delete doubt"
                                >
                                    <Trash2 className="w-4 h-4 group-hover/trash:scale-110 transition-transform" />
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => setIsRepliesOpen(true)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 active:scale-95 group/msg"
                        >
                            <MessageSquare className="w-5 h-5 group-hover/msg:scale-110 transition-transform" />
                            <span className="text-xs font-black">{doubt.replyCount || 0}</span>
                        </button>
                    </div>
                </div>

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
                        className="absolute top-8 right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-[110]"
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
                            src={doubt.imageUrl}
                            alt="Full View"
                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10"
                        />
                    </div>
                </div>
            )}

            {/* Premium Delete Confirmation Dialog */}
            {isDeleteDialogOpen && (
                <div
                    className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300"
                    onClick={() => setIsDeleteDialogOpen(false)}
                >
                    <div
                        className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mb-6 border border-red-500/20">
                                <AlertTriangle className="w-10 h-10 text-red-500" />
                            </div>
                            <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-4">
                                Delete <span className="text-red-500">Post?</span>
                            </h2>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
                                This action cannot be undone. Your doubt and all interactions will be permanently removed.
                            </p>

                            <div className="w-full flex gap-4">
                                <button
                                    onClick={() => setIsDeleteDialogOpen(false)}
                                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all border border-white/5 active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="flex-[1.5] py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-red-600/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? (
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        "Yes, Delete"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
