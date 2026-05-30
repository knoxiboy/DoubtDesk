"use client";

import { useEffect, useState } from "react";

import CommentItem from "./CommentItem";

interface Comment {
  id: number;
  author: string;
  text: string;
  replies: Comment[];
}

interface Thread {
  id: number;
  title: string;
  description?: string;
  category: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  thread: Thread | null;
}

const initialComments: Comment[] = [
  {
    id: 1,
    author: "Teacher",
    text: "You should focus on normalization and SQL queries first.",
    replies: [],
  },
];

export default function DiscussionModal({
  open,
  onClose,
  thread,
}: Props) {
  const [commentText, setCommentText] = useState("");

  const [comments, setComments] =
    useState<Comment[]>(initialComments);

  useEffect(() => {
    setComments(initialComments);
    setCommentText("");
  }, [thread?.id]);

  if (!open || !thread) return null;

  const addComment = () => {
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: Date.now(),
      author: "Student",
      text: commentText.trim(),
      replies: [],
    };

    setComments((prev) => [...prev, newComment]);

    setCommentText("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">

      <div className="min-h-screen flex items-start justify-center p-6">

        <div
          className="
          w-full max-w-4xl rounded-3xl
          border border-slate-200 dark:border-zinc-800
          bg-white dark:bg-zinc-950
          p-8 space-y-8
          shadow-2xl
          animate-in fade-in zoom-in-95 duration-300
          "
        >

          <div className="flex items-start justify-between gap-4">

            <div>

              <div className="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500 mb-3">
                {thread.category}
              </div>

              <h2 className="text-3xl font-black text-slate-900 dark:text-white">
                {thread.title}
              </h2>

              <p className="mt-3 text-slate-600 dark:text-zinc-400 leading-relaxed">
                {thread.description ||
                  "Open academic discussion thread."}
              </p>
            </div>

            <button
              type="button"
              aria-label="Close discussion modal"
              onClick={onClose}
              className="
              p-2 rounded-lg
              text-slate-500 hover:text-red-500
              hover:bg-red-500/10
              text-xl
              transition-colors duration-200
              "
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">

            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              aria-label="Write a comment"
              rows={4}
              className="
              w-full rounded-2xl
              border border-slate-300 dark:border-zinc-800
              bg-white dark:bg-zinc-900
              p-4
              outline-none
              resize-none
              transition-all duration-200
              focus:border-blue-500
              focus:ring-2 focus:ring-blue-500/20
              "
            />

            <div className="flex items-center gap-4">

              <button
                type="button"
                onClick={addComment}
                className="
                px-5 py-3 rounded-2xl
                bg-blue-600 hover:bg-blue-700
                text-white font-semibold
                transition-all duration-300
                hover:scale-[1.02]
                active:scale-[0.98]
                hover:shadow-[0_0_25px_rgba(59,130,246,0.35)]
                "
              >
                Post Comment
              </button>

              <button
                type="button"
                onClick={() => setCommentText("")}
                className="
                px-5 py-3 rounded-2xl
                border border-slate-300 dark:border-zinc-700
                text-slate-700 dark:text-zinc-300
                font-medium
                hover:border-red-400
                hover:text-red-500
                transition-all duration-200
                "
              >
                Clear
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}