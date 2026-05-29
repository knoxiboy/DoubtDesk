"use client";

import { useState } from "react";
import CommentItem from "./CommentItem";

interface Props {
  open: boolean;
  onClose: () => void;
  thread: any;
}

export default function DiscussionModal({
  open,
  onClose,
  thread,
}: Props) {
  const [commentText, setCommentText] = useState("");

  const [comments, setComments] = useState([
    {
      id: 1,
      author: "Teacher",
      text: "You should focus on normalization and SQL queries first.",
      replies: [],
    },
  ]);

  if (!open || !thread) return null;

  const addComment = () => {
    if (!commentText.trim()) return;

    setComments([
      ...comments,
      {
        id: Date.now(),
        author: "Student",
        text: commentText,
        replies: [],
      },
    ]);

    setCommentText("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto">

      <div className="min-h-screen flex items-start justify-center p-6">

        <div className="w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 space-y-8">

          <div className="flex items-start justify-between gap-4">

            <div>
              <div className="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500 mb-3">
                {thread.category}
              </div>

              <h2 className="text-3xl font-black">
                {thread.title}
              </h2>

              <p className="mt-3 text-slate-600 dark:text-zinc-400">
                {thread.description || "Open academic discussion thread."}
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-slate-500 hover:text-red-500 text-xl"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">

            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              rows={4}
              className="w-full rounded-2xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 outline-none focus:border-blue-500"
            />

            <button
              onClick={addComment}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              Post Comment
            </button>
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