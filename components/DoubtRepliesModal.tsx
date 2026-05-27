"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, CheckCircle, MessageSquare, Loader2, Upload, File, ZoomIn, MoreVertical, Pencil, Trash2, PlusCircle, Eye, EyeOff, Bold, Italic, Code, List, ThumbsUp, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import MarkdownRenderer from "./MarkdownRenderer";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
interface Reply {
    id: number;
    doubtId: number;
    userName: string;
    type: 'comment' | 'solution';
    content: string | null;
    imageUrl: string | null;
    upvotes: number;
    hasUpvoted?: boolean;
    createdAt: string;
}

interface DoubtRepliesModalProps {
    doubt: any;
    isOpen: boolean;
    onClose: () => void;
    onReplyChange?: () => void;
    isTeacher?: boolean;
}

export default function DoubtRepliesModal({ doubt, isOpen, onClose, onReplyChange, isTeacher = false }: DoubtRepliesModalProps) {
    const [replies, setReplies] = useState<Reply[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [chatText, setChatText] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [showSolutionForm, setShowSolutionForm] = useState(false);
    const [solutionContent, setSolutionContent] = useState("");
    const [solutionImage, setSolutionImage] = useState("");
    const [fileName, setFileName] = useState("");
    const [userName, setUserName] = useState("");

    const [isDoubtOwner, setIsDoubtOwner] = useState(false);
    const [isSolving, setIsSolving] = useState(false);
    const [isEditingReply, setIsEditingReply] = useState(false);
    const [isDeletingReply, setIsDeletingReply] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState<'all' | 'chat' | 'solutions'>('all');

    // Edit/Delete State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState("");
    const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
    const [replyToDelete, setReplyToDelete] = useState<number | null>(null);
    const [isFullscreenImageOpen, setIsFullscreenImageOpen] = useState(false);
    const [fullscreenImageUrl, setFullscreenImageUrl] = useState("");
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [isEditPreviewMode, setIsEditPreviewMode] = useState(false);
    const [isChatPreviewMode, setIsChatPreviewMode] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchReplies();
            const savedName = localStorage.getItem("anonymous_user");
            if (savedName) setUserName(savedName);
            if (savedName === doubt.userName) setIsDoubtOwner(true);
        }
    }, [isOpen, doubt.id, doubt.userName]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [replies]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleEsc);
        }
        return () => window.removeEventListener("keydown", handleEsc);
    }, [isOpen, onClose]);

    const fetchReplies = async () => {
        const storedUserName = localStorage.getItem("anonymous_user");
        try {
            const url = `/api/replies?doubtId=${doubt.id}` + (storedUserName ? `&userName=${encodeURIComponent(storedUserName)}` : "");
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setReplies(data);
            }
        } catch (error) {
            console.error("Failed to fetch replies:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePost = async (type: 'comment' | 'solution') => {
        const content = type === 'comment' ? chatText : solutionContent;
        const imageUrl = type === 'solution' ? solutionImage : null;

        if (!content.trim() && !imageUrl) return;

        setIsPosting(true);
        try {
            const res = await fetch("/api/replies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    doubtId: doubt.id,
                    userName,
                    type,
                    content,
                    imageUrl
                })
            });

            if (res.ok) {
                const updatedReply = await res.json();

                if (editingId && type === 'solution') {
                    setReplies(replies.map(r => r.id === editingId ? updatedReply : r));
                    setEditingId(null);
                } else {
                    setReplies([...replies, updatedReply]);
                }

                if (type === 'comment') setChatText("");
                else {
                    setSolutionContent("");
                    setSolutionImage("");
                    setFileName("");
                    setShowSolutionForm(false);
                    setEditingId(null);
                }
                if (onReplyChange) onReplyChange();
                toast.success(editingId ? "Solution updated!" : (type === 'solution' ? "Solution posted!" : "Reply submitted."), {
                    id: editingId ? `reply-update-${editingId}` : `reply-create-${type}-${doubt.id}`,
                });
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to submit reply.", { id: `reply-create-error-${type}-${doubt.id}` });
            }
        } catch (error) {
            toast.error("Network error while submitting reply.", { id: `reply-create-error-${type}-${doubt.id}` });
        } finally {
            setIsPosting(false);
        }
    };

    const handlePostOrUpdate = () => {
        if (editingId && replies.find(r => r.id === editingId)?.type === 'solution') {
            // Update mode for solution
            updateSolution();
        } else {
            handlePost('solution');
        }
    };

    const updateSolution = async () => {
        if (!editingId) return;
        setIsPosting(true);
        try {
            const res = await fetch(`/api/replies/action/${editingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: solutionContent,
                    imageUrl: solutionImage
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setReplies(replies.map(r => r.id === editingId ? updated : r));
                setEditingId(null);
                setSolutionContent("");
                setSolutionImage("");
                setFileName("");
                setShowSolutionForm(false);
                toast.success("Solution updated!", { id: `reply-update-${editingId}` });
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to update solution.", { id: `reply-update-error-${editingId}` });
            }
        } catch (error) {
            toast.error("Network error while updating solution.", { id: `reply-update-error-${editingId}` });
        } finally {
            setIsPosting(false);
        }
    };

    const handleEditReply = async (replyId: number) => {
        if (!editContent.trim()) return;
        setIsEditingReply(true);
        try {
            const res = await fetch(`/api/replies/action/${replyId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: editContent })
            });
            if (res.ok) {
                const updated = await res.json();
                setReplies(replies.map(r => r.id === replyId ? updated : r));
                setEditingId(null);
                setEditContent("");
                toast.success("Reply updated", { id: `reply-update-${replyId}` });
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to update reply.", { id: `reply-update-error-${replyId}` });
            }
        } catch (error) {
            toast.error("Network error while updating reply.", { id: `reply-update-error-${replyId}` });
        } finally {
            setIsEditingReply(false);
        }
    };

    const handleDeleteReply = async (replyId: number) => {
        setIsDeletingReply(true);
        try {
            const res = await fetch(`/api/replies/action/${replyId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setReplies(replies.filter(r => r.id !== replyId));
                if (onReplyChange) onReplyChange();
                toast.success("Reply deleted", { id: `reply-delete-${replyId}` });
                setReplyToDelete(null);
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to delete reply.", { id: `reply-delete-error-${replyId}` });
            }
        } catch (error) {
            toast.error("Network error while deleting reply.", { id: `reply-delete-error-${replyId}` });
        } finally {
            setIsDeletingReply(false);
            setMenuOpenId(null);
        }
    };

    const handleVote = async (replyId: number) => {
        try {
            const res = await fetch("/api/replies/vote", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ replyId })
            });

            if (res.status === 401) {
                toast.error("Sign in to vote.", { id: `vote-auth-required-${replyId}` });
                return;
            }

            if (res.ok) {
                const updatedReply = await res.json();
                setReplies(prev => prev.map(r => r.id === replyId ? {
                    ...r,
                    upvotes: updatedReply.upvotes,
                    hasUpvoted: updatedReply.hasUpvoted
                } : r));
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Failed to vote.", { id: `vote-error-${replyId}` });
            }
        } catch (error) {
            console.error("Failed to vote:", error);
            toast.error("Network error while voting.", { id: `vote-network-error-${replyId}` });
        }
    };

    const handleMarkAsSolution = async (replyId: number) => {
        setIsSolving(true);
        const userName = localStorage.getItem("anonymous_user");
        try {
            const res = await fetch(`/api/doubts/action/${doubt.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "solve", userName, replyId }),
            });
            if (res.ok) {
                if (onReplyChange) onReplyChange();
                const isUnmarking = doubt.solvedReplyId === replyId;
                toast.success(isUnmarking ? "Solution unmarked." : "Marked as official solution!", {
                    id: `solution-mark-${doubt.id}`,
                });
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to update solution status.", { id: `solution-mark-error-${doubt.id}` });
            }
        } catch (error) {
            toast.error("Network error while updating solution status.", { id: `solution-mark-error-${doubt.id}` });
        } finally {
            setIsSolving(false);
        }
    };

    const insertMarkdown = (textareaRef: React.RefObject<HTMLTextAreaElement>, type: string, stateSetter: (val: string) => void) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        let replacement = "";

        switch (type) {
            case "bold": replacement = `**${selectedText || "bold text"}**`; break;
            case "italic": replacement = `*${selectedText || "italic text"}*`; break;
            case "code": replacement = `\`\`\`\n${selectedText || "code"}\n\`\`\``; break;
            case "list": replacement = `\n- ${selectedText || "list item"}`; break;
        }

        const newText = text.substring(0, start) + replacement + text.substring(end);
        stateSetter(newText);
        
        // Focus back and set selection
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + replacement.length, start + replacement.length);
        }, 0);
    };

    const solutionTextareaRef = useRef<HTMLTextAreaElement>(null);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);
    const chatInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
                toast.error("Only image (PNG, JPG, GIF, WebP) and PDF files are supported.");
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File size exceeds 5MB limit.");
                return;
            }
            setFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => setSolutionImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const ReplyBubble = ({ reply }: { reply: Reply }) => {
        const isMe = reply.userName === userName;
        const isOfficial = doubt.solvedReplyId === reply.id;

        return (
            <div className={`flex flex-col group/msg relative w-full mb-6 ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Message Bubble */}
                <div className={`relative max-w-[85%] sm:max-w-[75%] rounded-[2rem] p-6 ${
                    reply.type === 'solution'
                    ? `${isOfficial ? 'bg-emerald-500/10 border-2 border-emerald-500/40 ring-4 ring-emerald-500/5' : 'bg-white/5 border border-white/10'}`
                    : isMe ? 'bg-blue-600/10 border border-blue-500/20' : 'bg-white/5 border border-white/10'
                }`}>
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isMe ? 'text-blue-400' : 'text-slate-400'}`}>
                                {reply.userName} {isMe && "(YOU)"}
                            </span>
                            {reply.type === 'solution' && isOfficial && (
                                <div className="bg-emerald-500 text-slate-900 dark:text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg shadow-emerald-500/20 flex items-center gap-1">
                                    <CheckCircle className="w-2.5 h-2.5" /> Official
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            {(isDoubtOwner || isTeacher) && reply.type === 'solution' && !editingId && (
                                <button
                                    onClick={() => handleMarkAsSolution(reply.id)}
                                    disabled={isSolving}
                                    className={`text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${ isOfficial ? "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500" } hover:text-slate-900 dark:hover:text-white hover:scale-105 active:scale-95`}
                                >
                                    {isOfficial ? "Unmark" : "Mark Official"}
                                </button>
                            )}

                            {isMe && !editingId && (
                                <div className="relative">
                                    <button
                                        onClick={() => setMenuOpenId(menuOpenId === reply.id ? null : reply.id)}
                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
                                        aria-label="More options"
                                    >
                                        <MoreVertical className="w-3.5 h-3.5" />
                                    </button>

                                    {menuOpenId === reply.id && (
                                        <div className="absolute top-10 right-0 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl py-1 w-32 animate-in zoom-in-95 duration-200 z-50 overflow-hidden">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (reply.type === 'solution') {
                                                        setSolutionContent(reply.content || "");
                                                        setSolutionImage(reply.imageUrl || "");
                                                        setEditingId(reply.id);
                                                        setShowSolutionForm(true);
                                                        setMenuOpenId(null);
                                                    } else {
                                                        setEditingId(reply.id);
                                                        setEditContent(reply.content || "");
                                                        setMenuOpenId(null);
                                                    }
                                                }}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-slate-900 dark:hover:text-white transition-all text-left"
                                            >
                                                <Pencil className="w-3 h-3" /> Edit
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setReplyToDelete(reply.id);
                                                    setMenuOpenId(null);
                                                }}
                                                className="w-full flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase text-red-400 hover:bg-red-600 hover:text-slate-900 dark:hover:text-white transition-all text-left"
                                            >
                                                <Trash2 className="w-3 h-3" /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="space-y-4">
                        {editingId === reply.id && reply.type === 'comment' ? (
                            <div className="space-y-4 min-w-[240px] animate-in fade-in duration-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <button onClick={() => insertMarkdown(editTextareaRef, "bold", setEditContent)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-400"><Bold className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => insertMarkdown(editTextareaRef, "italic", setEditContent)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-400"><Italic className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => insertMarkdown(editTextareaRef, "code", setEditContent)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-slate-600 dark:text-slate-400"><Code className="w-3.5 h-3.5" /></button>
                                    <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1" />
                                    <button 
                                        onClick={() => setIsEditPreviewMode(!isEditPreviewMode)} 
                                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-black uppercase transition-all ${isEditPreviewMode ? 'bg-blue-500 text-white' : 'hover:bg-white/10 text-slate-400'}`}
                                    >
                                        {isEditPreviewMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                        {isEditPreviewMode ? "Edit" : "Preview"}
                                    </button>
                                </div>
                                {isEditPreviewMode ? (
                                    <div className="w-full bg-white/50 dark:bg-slate-950/50 border border-blue-500/20 rounded-2xl p-4 min-h-[112px] text-sm text-slate-900 dark:text-white overflow-y-auto">
                                        <MarkdownRenderer content={editContent || "*Nothing to preview*"} />
                                    </div>
                                ) : (
                                    <textarea
                                        ref={editTextareaRef}
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full bg-white/50 dark:bg-slate-950/50 border border-blue-500/20 rounded-2xl p-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500/50 transition-all h-28 resize-none"
                                    />
                                )}
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setEditingId(null)} disabled={isEditingReply} className="px-4 py-2 text-[10px] font-black uppercase text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-50">Cancel</button>
                                    <button
                                        onClick={() => handleEditReply(reply.id)}
                                        disabled={isEditingReply || !editContent.trim()}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-900/40 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isEditingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {reply.content && (
                                    <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                                        <MarkdownRenderer content={reply.content} />
                                    </div>
                                )}
                                {reply.imageUrl && (
                                    reply.imageUrl.startsWith("data:application/pdf") ? (
                                        <div className="mt-3 p-4 rounded-2xl bg-white/80 dark:bg-slate-950/80 border border-red-500/20 flex items-center justify-between gap-4 group/pdf hover:border-red-500/40 transition-all shadow-lg w-full max-w-sm">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 group-hover/pdf:scale-105 transition-transform">
                                                    <FileText className="w-5 h-5 text-red-400" />
                                                </div>
                                                <div className="min-w-0 text-left">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Attached Document.pdf</p>
                                                    <p className="text-[9px] text-slate-600 dark:text-slate-400 uppercase tracking-widest font-black mt-0.5">PDF Attachment</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); window.open(reply.imageUrl!, "_blank"); }}
                                                className="p-2.5 bg-red-500/10 hover:bg-red-500 hover:text-slate-900 dark:hover:text-white text-red-400 rounded-xl transition-all border border-red-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0"
                                                title="Open PDF in new tab"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" /> Open
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => { setFullscreenImageUrl(reply.imageUrl!); setIsFullscreenImageOpen(true); }}
                                            className="mt-2 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 group/img relative cursor-zoom-in active:scale-[0.98] transition-all w-full"
                                            aria-label="View image fullscreen"
                                        >
                                            <img src={reply.imageUrl} alt="Solution" className="w-full h-auto object-cover max-h-[32rem]" />
                                            <div className="absolute inset-0 bg-white/0 group-hover/img:bg-slate-100 dark:group-hover/img:bg-white/5 flex items-center justify-center transition-all">
                                                <ZoomIn className="w-8 h-8 text-slate-900 dark:text-white opacity-0 group-hover/img:opacity-100 scale-50 group-hover/img:scale-100 transition-all" />
                                            </div>
                                        </button>
                                    )
                                )}
                            </>
                        )}
                    </div>

                    {/* Vote Action */}
                    <div className="mt-4 flex items-center justify-end">
                        <button
                            onClick={() => handleVote(reply.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all active:scale-95 group/vote ${ reply.hasUpvoted ? "bg-blue-600/20 text-blue-400 border-blue-500/30 shadow-lg shadow-blue-500/10" : "bg-white/5 text-slate-500 border-white/5 hover:text-white hover:bg-white/10" }`}
                        >
                            <ThumbsUp
                                className={`w-3.5 h-3.5 ${ reply.hasUpvoted ? 'fill-blue-400' : 'group-hover/vote:scale-110 transition-transform' }`}
                            />
                            <span className="text-[10px] font-black uppercase tracking-widest">
                                {reply.upvotes || 0} <span className="hidden sm:inline ml-1 opacity-60">Helpful</span>
                            </span>
                        </button>
                    </div>
                </div>

                {/* Footer: Time */}
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2 px-2">
                    {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/60 dark:bg-slate-950/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[1.5rem] sm:rounded-[2.5rem] w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 sm:p-8 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center shrink-0 border border-blue-500/20">
                            <MessageSquare className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic flex items-center gap-2">
                                Doubt <span className="text-blue-500">Discussion</span>
                                {doubt.isSolved === "solved" && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                            </h2>
                            <p className="text-slate-500 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1">
                                {doubt.subject} • {replies.length} Interactions
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl text-slate-600 dark:text-slate-400 transition-colors" aria-label="Close modal">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tab Navigation - Hidden for 'Ask Teacher' Doubts */}
                {doubt.type !== 'teacher' && (
                    <div className="px-5 sm:px-8 border-b border-slate-200 dark:border-white/5 flex gap-6 sm:gap-8 h-14 bg-white/[0.01] overflow-x-auto whitespace-nowrap scrollbar-hide">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`relative flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${ activeTab === 'all' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300' }`}
                        >
                            All Chat
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] bg-slate-100 dark:bg-white/5 ${activeTab === 'all' ? 'text-blue-500 bg-blue-500/10' : 'text-slate-600'}`}>
                                {replies.length}
                            </span>
                            {activeTab === 'all' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 animate-in fade-in slide-in-from-bottom-1" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`relative flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${ activeTab === 'chat' ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300' }`}
                        >
                            General Chat
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] bg-slate-100 dark:bg-white/5 ${activeTab === 'chat' ? 'text-blue-500 bg-blue-500/10' : 'text-slate-600'}`}>
                                {replies.filter(r => r.type === 'comment').length}
                            </span>
                            {activeTab === 'chat' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 animate-in fade-in slide-in-from-bottom-1" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('solutions')}
                            className={`relative flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${ activeTab === 'solutions' ? 'text-emerald-500' : 'text-slate-500 hover:text-slate-300' }`}
                        >
                            All Solutions
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] bg-slate-100 dark:bg-white/5 ${activeTab === 'solutions' ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-600'}`}>
                                {replies.filter(r => r.type === 'solution').length}
                            </span>
                            {activeTab === 'solutions' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 animate-in fade-in slide-in-from-bottom-1" />}
                        </button>
                    </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-4 sm:space-y-6 bg-white/50 dark:bg-slate-900/50">
                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">Loading Thread...</p>
                        </div>
                    ) : replies.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <MessageSquare className="w-10 h-10 text-slate-500 dark:text-slate-500" />
                            </div>
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No interactions yet.</p>
                            <p className="text-[10px] uppercase font-black tracking-widest text-slate-600 mt-2">Be the first to help out!</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {(() => {
                                const filteredReplies = activeTab === 'all'
                                    ? replies
                                    : activeTab === 'chat'
                                        ? replies.filter(r => r.type === 'comment')
                                        : replies.filter(r => r.type === 'solution');

                                if (filteredReplies.length === 0) {
                                    return (
                                        <div className="h-40 flex flex-col items-center justify-center text-center opacity-40">
                                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
                                                {activeTab === 'chat' ? "No general chat messages yet." : "No solutions posted yet."}
                                            </p>
                                        </div>
                                    );
                                }

                                let lastDate = "";
                                return filteredReplies.map((reply, index) => {
                                    const replyDate = new Date(reply.createdAt).toLocaleDateString([], {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    });

                                    let dateSeparator = null;
                                    if (replyDate !== lastDate) {
                                        lastDate = replyDate;

                                        // WhatsApp style: Today, Yesterday, or Date
                                        const now = new Date();
                                        const today = now.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
                                        const yesterday = new Date(now.setDate(now.getDate() - 1)).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });

                                        let displayDate = replyDate;
                                        if (replyDate === today) displayDate = "Today";
                                        else if (replyDate === yesterday) displayDate = "Yesterday";

                                        dateSeparator = (
                                            <div key={`date-${reply.id}`} className="flex justify-center mt-2 mb-1">
                                                <div className="px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500">
                                                        {displayDate}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={reply.id} className="space-y-2">
                                            {dateSeparator}
                                            <ReplyBubble reply={reply} />
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Hybrid Input Area */}
                {(doubt.type !== 'teacher' || isTeacher || isDoubtOwner) && (
                    <div className="p-5 sm:p-8 bg-white/[0.02] border-t border-slate-200 dark:border-white/5 solution-form-area">
                    {showSolutionForm ? (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 bg-white/[0.03] p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-2xl relative overflow-y-auto max-h-[60vh] group/form custom-scrollbar">
                            {/* Decorative Background Blur */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />

                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/20 flex items-center justify-center">
                                        <PlusCircle className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">
                                            {editingId ? "Update" : "Post"} <span className="text-emerald-500">Solution</span>
                                        </h3>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                            {editingId ? "Refining your contribution" : `Solving • ${doubt.subject}`}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowSolutionForm(false);
                                        setEditingId(null);
                                        setSolutionContent("");
                                        setSolutionImage("");
                                        setFileName("");
                                    }}
                                    className="p-3 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all hover:rotate-90"
                                    aria-label="Close form"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <button onClick={() => insertMarkdown(solutionTextareaRef, "bold", setSolutionContent)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-600 dark:text-slate-400"><Bold className="w-4 h-4" /></button>
                                <button onClick={() => insertMarkdown(solutionTextareaRef, "italic", setSolutionContent)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-600 dark:text-slate-400"><Italic className="w-4 h-4" /></button>
                                <button onClick={() => insertMarkdown(solutionTextareaRef, "code", setSolutionContent)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-600 dark:text-slate-400"><Code className="w-4 h-4" /></button>
                                <button onClick={() => insertMarkdown(solutionTextareaRef, "list", setSolutionContent)} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-600 dark:text-slate-400"><List className="w-4 h-4" /></button>
                                <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-2" />
                                <button 
                                    onClick={() => setIsPreviewMode(!isPreviewMode)} 
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isPreviewMode ? 'bg-emerald-500 text-white' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}
                                >
                                    {isPreviewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    {isPreviewMode ? "Editing" : "Preview Mode"}
                                </button>
                            </div>

                            {isPreviewMode ? (
                                <div className="w-full h-40 bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-[1.5rem] p-5 text-slate-900 dark:text-white text-sm overflow-y-auto">
                                    <MarkdownRenderer content={solutionContent || "*Nothing to preview*"} />
                                </div>
                            ) : (
                                <textarea
                                    ref={solutionTextareaRef}
                                    value={solutionContent}
                                    onChange={(e) => setSolutionContent(e.target.value)}
                                    placeholder="Explain your solution clearly and step-by-step..."
                                    className="w-full h-40 bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10 rounded-[1.5rem] p-5 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 transition-all resize-none font-medium leading-relaxed placeholder:text-slate-600 shadow-inner"
                                />
                            )}

                            {solutionImage && (
                                <div className="relative group/preview animate-in zoom-in-95 duration-300 w-full sm:w-fit">
                                    {solutionImage.startsWith("data:application/pdf") ? (
                                        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-950 border border-red-500/20 shadow-2xl">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                                                    <FileText className="w-6 h-6 text-red-500" />
                                                </div>
                                                <div className="min-w-0 text-left">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-xs">{fileName}</p>
                                                    <p className="text-[9px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5">PDF Attachment</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setSolutionImage(""); setFileName(""); }}
                                                className="p-2.5 bg-red-500/10 hover:bg-red-500 hover:text-slate-900 dark:hover:text-white text-red-400 rounded-xl transition-all border border-red-500/20 text-xs font-bold uppercase tracking-wider shrink-0"
                                                title="Remove PDF"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/20 bg-white dark:bg-slate-950 shadow-2xl group/img">
                                            <img src={solutionImage} className="w-full sm:w-64 h-36 object-cover opacity-80 group-hover/img:opacity-100 transition-all duration-500" />

                                            {/* Image Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex flex-col justify-end p-3 translate-y-2 group-hover/img:translate-y-0 transition-transform">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 truncate max-w-full">
                                                    {fileName || "Live Attachment"}
                                                </span>
                                            </div>

                                            {/* Actions on Hover */}
                                            <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-3 transition-all duration-300">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFullscreenImageUrl(
                                                            solutionImage,
                                                        );
                                                        setIsFullscreenImageOpen(
                                                            true,
                                                        );
                                                    }}
                                                    className="w-10 h-10 bg-slate-200 dark:bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-slate-900 dark:text-white transition-all scale-75 group-hover/img:scale-100">
                                                    <ZoomIn className="w-5 h-5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => { setSolutionImage(""); setFileName(""); }}
                                                    className="w-10 h-10 bg-red-500/20 hover:bg-red-500 backdrop-blur-md rounded-xl flex items-center justify-center text-white transition-all scale-75 group-hover/img:scale-100 border border-red-500/20 hover:border-transparent"
                                                    aria-label="Delete image"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                                <div className="flex-1 relative group overflow-hidden rounded-2xl">
                                    <input type="file" onChange={handleFileChange} accept="image/png,image/jpeg,image/gif,image/webp,application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                    <div className="w-full h-full min-h-[60px] px-6 border-2 border-dashed border-slate-200 dark:border-white/5 bg-white/[0.02] flex items-center justify-center gap-3 group-hover:bg-emerald-500/5 group-hover:border-emerald-500/30 transition-all duration-300">
                                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 group-hover:bg-emerald-500/20 transition-colors">
                                            <Upload className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-[0.2em] group-hover:text-emerald-400 transition-colors">
                                            {solutionImage ? "Change Attachment" : "Attach Visual or PDF"}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={handlePostOrUpdate}
                                    disabled={isPosting || (!solutionContent.trim() && !solutionImage)}
                                    className="px-10 py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] transition-all shadow-xl shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-3 active:scale-95 group/submit"
                                >
                                    {isPosting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                    )}
                                    {editingId ? "Finalize Update" : "Post Solution"}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full">
                            {(doubt.isSolved !== "solved" && (doubt.type !== 'teacher' || isTeacher)) && (
                                <button
                                    onClick={() => setShowSolutionForm(true)}
                                    className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl transition-all group flex items-center justify-center gap-2 active:scale-95 shrink-0 shadow-lg shadow-emerald-600/20"
                                >
                                    <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Post Solution</span>
                                </button>
                            )}
                            <div className="flex-1 flex flex-col gap-2 w-full">
                                {isChatPreviewMode ? (
                                    <div className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl py-4 px-6 text-slate-900 dark:text-white text-sm min-h-[54px] max-h-32 overflow-y-auto">
                                        <MarkdownRenderer content={chatText || "*Nothing to preview*"} />
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={chatText}
                                            onChange={(e) => setChatText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handlePost('comment');
                                                }
                                            }}
                                            placeholder="Ask for clarification or chat with peers..."
                                            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl py-4 flex-1 pl-6 pr-24 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all font-medium"
                                        />
                                        <div className="absolute right-2 top-2 flex items-center gap-1">
                                            <button 
                                                onClick={() => setIsChatPreviewMode(!isChatPreviewMode)}
                                                className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
                                                title="Preview Markdown"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handlePost('comment')}
                                                disabled={isPosting || !chatText.trim()}
                                                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-50"
                                            >
                                                {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {isChatPreviewMode && (
                                    <button 
                                        onClick={() => setIsChatPreviewMode(false)}
                                        className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-400 self-start px-2"
                                    >
                                        Back to Edit
                                    </button>
                                )}
                            </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Fullscreen Image Viewer */}
            {isFullscreenImageOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl animate-in fade-in duration-300"
                    onClick={() => setIsFullscreenImageOpen(false)}
                >
                    <button
                        onClick={() => setIsFullscreenImageOpen(false)}
                        className="absolute top-8 right-8 p-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full text-slate-900 dark:text-white transition-all hover:rotate-90 z-[210]"
                        aria-label="Close fullscreen view"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    <div className="relative w-full h-full p-12 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <div className="relative max-w-full max-h-full">
                            <img
                                src={fullscreenImageUrl}
                                alt="Fullscreen View"
                                className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 object-contain animate-in zoom-in-95 duration-300"
                            />
                            <div className="absolute -bottom-12 left-0 right-0 flex justify-center">
                                <div className="px-6 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full backdrop-blur-md">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">High Res Solution Preview</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <DeleteConfirmationDialog
                isOpen={replyToDelete !== null}
                onClose={(open) => {
                    if (!open) setReplyToDelete(null);
                }}
                onConfirm={() => {
                    if (replyToDelete) handleDeleteReply(replyToDelete);
                }}
                isDeleting={isDeletingReply}
                title="Delete Reply?"
                description="This action cannot be undone. The reply will be permanently removed."
                confirmText="Delete Reply"
            />
        </div>
    );
}