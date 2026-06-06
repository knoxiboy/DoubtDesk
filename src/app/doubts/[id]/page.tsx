"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  ThumbsUp,
  CheckCircle,
  AlertTriangle,
  Clock,
  Bookmark,
  Loader2,
  Send,
  ZoomIn,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import type { Doubt, Tag } from "@/types";

interface Reply {
  id: number;
  doubtId: number;
  userName: string;
  userEmail?: string | null;
  type: "comment" | "solution";
  content?: string | null;
  imageUrl?: string | null;
  upvotes: number;
  hasUpvoted?: boolean;
  createdAt: string;
}

interface DoubtDetail {
  doubt: Doubt & {
    tags?: Tag[];
    replyCount?: number;
    hasLiked?: boolean;
    hasBookmarked?: boolean;
  };
  replies: Reply[];
}

export default function DoubtDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isSignedIn } = useUser();

  const [data, setData] = useState<DoubtDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasBookmarked, setHasBookmarked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isPostingReply, setIsPostingReply] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const fetchDoubt = useCallback(async () => {
    setIsLoading(true);
    setNotFound(false);
    setError(null);
    try {
      const res = await fetch(`/api/doubts/${id}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to load" }));
        throw new Error(body.error || "Failed to load doubt");
      }
      const result: DoubtDetail = await res.json();
      setData(result);
      setLikes(result.doubt.likes ?? 0);
      setHasLiked(result.doubt.hasLiked ?? false);
      setHasBookmarked(result.doubt.hasBookmarked ?? false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDoubt();
  }, [fetchDoubt]);

  const handleLike = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to like");
      return;
    }
    setIsLiking(true);
    const prevLiked = hasLiked;
    setHasLiked(!prevLiked);
    setLikes((l) => (prevLiked ? l - 1 : l + 1));
    try {
      const userName = localStorage.getItem("anonymous_user");
      const res = await fetch(`/api/doubts/action/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", userName }),
      });
      if (!res.ok) {
        setHasLiked(prevLiked);
        setLikes((l) => (prevLiked ? l + 1 : l - 1));
        const body = await res.json();
        toast.error(body.error || "Failed to like");
      }
    } catch {
      setHasLiked(prevLiked);
      setLikes((l) => (prevLiked ? l + 1 : l - 1));
      toast.error("Failed to like");
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to bookmark");
      return;
    }
    setIsBookmarking(true);
    const prev = hasBookmarked;
    setHasBookmarked(!prev);
    try {
      const res = await fetch(`/api/doubts/${id}/bookmark`, {
        method: prev ? "DELETE" : "POST",
      });
      if (!res.ok) {
        setHasBookmarked(prev);
        toast.error("Failed to update bookmark");
      } else {
        toast.success(prev ? "Bookmark removed" : "Added to bookmarks!");
      }
    } catch {
      setHasBookmarked(prev);
      toast.error("Failed to update bookmark");
    } finally {
      setIsBookmarking(false);
    }
  };

  const handlePostReply = async () => {
    if (!replyText.trim()) return;
    setIsPostingReply(true);
    const userName = localStorage.getItem("anonymous_user") || "Anonymous";
    try {
      const res = await fetch("/api/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doubtId: parseInt(id),
          userName,
          type: "comment",
          content: replyText.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        toast.error(body.error || "Failed to post reply");
        return;
      }
      setReplyText("");
      toast.success("Reply posted!");
      fetchDoubt();
    } catch {
      toast.error("Failed to post reply");
    } finally {
      setIsPostingReply(false);
    }
  };

  const handleUpvote = async (replyId: number) => {
    try {
      const res = await fetch(`/api/doubts/${id}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId }),
      });
      if (res.ok) {
        fetchDoubt();
      } else {
        const body = await res.json();
        toast.error(body.error || "Failed to upvote");
      }
    } catch {
      toast.error("Failed to upvote");
    }
  };

  const handleAccept = async (replyId: number) => {
    try {
      const res = await fetch(`/api/doubts/${id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId }),
      });
      if (res.ok) {
        toast.success("Answer accepted!");
        fetchDoubt();
      } else {
        const body = await res.json();
        toast.error(body.error || "Failed to accept answer");
      }
    } catch {
      toast.error("Failed to accept answer");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Doubt not found
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            This doubt may have been deleted or you may not have access to it.
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl text-red-500">!</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Error
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {error || "Failed to load the doubt."}
          </p>
          <button
            onClick={fetchDoubt}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { doubt, replies } = data;
  const solutions = replies.filter((r) => r.type === "solution");
  const comments = replies.filter((r) => r.type === "comment");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-semibold">Back</span>
        </button>

        <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                <span className="text-lg font-black text-blue-400">
                  {doubt.userName?.slice(-1)?.toUpperCase() || "?"}
                </span>
              </div>
              <div>
                <h3 className="text-slate-900 dark:text-white font-bold tracking-tight text-sm">
                  {doubt.userName || "Anonymous"}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                  {new Date(doubt.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {doubt.isSolved === "solved" ? (
                <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                    Solved
                  </span>
                </div>
              ) : doubt.isSolved === "in-progress" ? (
                <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-amber-500" />
                  <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                    In Progress
                  </span>
                </div>
              ) : (
                <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">
                    Unsolved
                  </span>
                </div>
              )}
              <div className="px-3 py-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full">
                <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">
                  {doubt.subject}
                </span>
              </div>
            </div>
          </div>

          {doubt.content && (
            <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">
                {doubt.content}
              </p>
            </div>
          )}

          {(doubt.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
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
              onClick={() => setFullscreenImage(doubt.imageUrl!)}
              className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 aspect-video mb-6 cursor-zoom-in group"
            >
              <img
                src={doubt.imageUrl}
                alt="Doubt"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <ZoomIn className="w-8 h-8 text-white/50" />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-slate-200 dark:border-white/5">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all ${
                hasLiked
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5"
              }`}
            >
              <ThumbsUp
                className={`w-4 h-4 ${isLiking ? "animate-pulse" : ""} ${
                  hasLiked ? "fill-blue-400" : ""
                }`}
              />
              <span className="text-xs font-black">{likes}</span>
            </button>

            {isSignedIn && (
              <button
                onClick={handleBookmark}
                disabled={isBookmarking}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all ${
                  hasBookmarked
                    ? "bg-purple-600/20 text-purple-400 border border-purple-500/30"
                    : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5"
                }`}
              >
                <Bookmark
                  className={`w-4 h-4 ${isBookmarking ? "animate-pulse" : ""} ${
                    hasBookmarked ? "fill-purple-400" : ""
                  }`}
                />
                <span className="text-xs font-black">
                  {hasBookmarked ? "Bookmarked" : "Bookmark"}
                </span>
              </button>
            )}

            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-2xl border border-white/5 ml-auto">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-black text-slate-400">
                {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </span>
            </div>
          </div>
        </div>

        {solutions.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Solutions
            </h2>
            <div className="space-y-4">
              {solutions.map((reply) => (
                <div
                  key={reply.id}
                  className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-emerald-600/20 rounded-xl flex items-center justify-center shrink-0">
                      <span className="text-sm font-black text-emerald-400">
                        {reply.userName?.slice(-1)?.toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {reply.userName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(reply.createdAt).toLocaleDateString()}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-full">
                          Solution
                        </span>
                      </div>
                      {reply.content && (
                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                          <MarkdownRenderer content={reply.content} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            Comments ({comments.length})
          </h2>

          <div className="space-y-4 mb-8">
            {comments.map((reply) => (
              <div
                key={reply.id}
                className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-600/10 rounded-xl flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-blue-400">
                      {reply.userName?.slice(-1)?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {reply.userName}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(reply.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {reply.content && (
                      <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownRenderer content={reply.content} />
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <button
                        onClick={() => handleUpvote(reply.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold ${
                          reply.hasUpvoted
                            ? "bg-blue-600/20 text-blue-400"
                            : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>{reply.upvotes}</span>
                      </button>
                      {doubt.isSolved !== "solved" && (
                        <button
                          onClick={() => handleAccept(reply.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300"
                          title="Accept as solution"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Accept
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-center text-slate-500 dark:text-slate-500 text-sm py-8">
                No comments yet. Be the first to reply!
              </p>
            )}
          </div>

          {isSignedIn && (
            <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl p-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a comment..."
                    rows={3}
                    className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:outline-none border border-slate-200 dark:border-white/10 rounded-xl p-3"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handlePostReply();
                      }
                    }}
                  />
                </div>
                <button
                  onClick={handlePostReply}
                  disabled={!replyText.trim() || isPostingReply}
                  className="self-end p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                >
                  {isPostingReply ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {fullscreenImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <button
            className="absolute top-8 right-8 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-[110]"
            onClick={() => setFullscreenImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <div
            className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fullscreenImage}
              alt="Full view"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
