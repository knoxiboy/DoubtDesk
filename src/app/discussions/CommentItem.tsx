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
  const [replies, setReplies] = useState(comment.replies || []);
  const [showReply, setShowReply] = useState(false);

  const addReply = () => {
    if (!replyText.trim()) return;

    const newReply = {
      id: Date.now(),
      author: "Anonymous",
      text: replyText,
      replies: [],
    };

    setReplies([...replies, newReply]);
    setReplyText("");
    setShowReply(false);
  };

  return (
    <div className="border-l border-blue-500/30 pl-4 ml-2 space-y-4">

      <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/40 p-4 transition-all duration-300 hover:border-blue-500/40 hover:-translate-y-1">
        
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-bold text-blue-500">
            {comment.author.charAt(0)}
          </div>

          <span className="font-semibold">
            {comment.author}
          </span>
        </div>

        <p className="text-slate-700 dark:text-zinc-300 text-sm">
          {comment.text}
        </p>

        <button
          onClick={() => setShowReply(!showReply)}
          className="mt-3 text-sm text-blue-500 hover:text-blue-600"
        >
          Reply
        </button>

        {showReply && (
          <div className="mt-4 space-y-3">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="w-full rounded-xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 text-sm outline-none focus:border-blue-500"
            />

            <button
              onClick={addReply}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              Post Reply
            </button>
          </div>
        )}
      </div>

      {replies.length > 0 && (
        <div className="space-y-4">
          {replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} />
          ))}
        </div>
      )}
    </div>
  );
}