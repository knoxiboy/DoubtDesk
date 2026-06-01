"use client";

import { useState } from "react";

interface Comment {
  id: number;
  author: string;
  text: string;
  replies?: Comment[];
}

interface Props {
  comment: Comment;
}

export default function CommentItem({ comment }: Props) {
  const [replyText, setReplyText] = useState("");
  const [replies, setReplies] = useState<Comment[]>(
    comment.replies || []
  );
  const [showReply, setShowReply] = useState(false);

  const addReply = () => {
    if (!replyText.trim()) return;

    const newReply: Comment = {
      id: Date.now(),
      author: "Student",
      text: replyText.trim(),
      replies: [],
    };

    setReplies((prev) => [...prev, newReply]);

    setReplyText("");
    setShowReply(false);
  };

  return (
    <div className="border-l border-blue-500/30 pl-4 ml-2 space-y-4">

      <div
        className="
        rounded-2xl border border-slate-200 dark:border-zinc-800
        bg-white/70 dark:bg-zinc-950/40
        p-4
        transition-all duration-300
        hover:border-blue-500/40
        hover:-translate-y-1
        hover:shadow-[0_8px_30px_rgba(59,130,246,0.12)]
        dark:hover:shadow-[0_8px_30px_rgba(59,130,246,0.08)]
        "
      >

        <div className="flex items-center gap-2 mb-3">

          <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-bold text-blue-500">
            {comment.author.charAt(0)}
          </div>

          <span className="font-semibold text-slate-800 dark:text-zinc-200">
            {comment.author}
          </span>
        </div>

        <p className="text-slate-700 dark:text-zinc-300 text-sm leading-relaxed">
          {comment.text}
        </p>

        <button
          type="button"
          aria-label={`Reply to ${comment.author}`}
          onClick={() => setShowReply((prev) => !prev)}
          className="
          mt-3 text-sm text-blue-500 hover:text-blue-600
          transition-colors duration-200
          font-medium
          "
        >
          Reply
        </button>

        {showReply && (
          <div className="mt-4 space-y-3">

            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              aria-label="Write a reply"
              rows={3}
              className="
              w-full rounded-xl border border-slate-300 dark:border-zinc-800
              bg-white dark:bg-zinc-900
              p-3 text-sm
              outline-none
              transition-colors duration-200
              focus:border-blue-500
              focus:ring-2 focus:ring-blue-500/20
              "
            />

            <div className="flex items-center gap-3">

              <button
                type="button"
                onClick={addReply}
                className="
                px-4 py-2 rounded-xl
                bg-blue-600 hover:bg-blue-700
                text-white text-sm font-medium
                transition-all duration-300
                hover:scale-[1.02]
                active:scale-[0.98]
                "
              >
                Post Reply
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowReply(false);
                  setReplyText("");
                }}
                className="
                px-4 py-2 rounded-xl
                border border-slate-300 dark:border-zinc-700
                text-sm font-medium
                hover:border-red-400
                hover:text-red-500
                transition-all duration-200
                "
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {replies.length > 0 && (
        <div className="space-y-4">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
            />
          ))}
        </div>
      )}
    </div>
  );
}