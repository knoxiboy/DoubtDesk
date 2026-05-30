"use client";

import { useState } from "react";

interface Thread {
  id: number;
  title: string;
  description: string;
  author: string;
  category: string;
  replies: number;
  lastReply: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (thread: Thread) => void;
}

export default function CreateThreadModal({
  open,
  onClose,
  onCreate,
}: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  if (!open) return null;

  const handleCreate = () => {
    if (!title.trim()) return;

    const newThread: Thread = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim(),
      author: anonymous ? "Anonymous" : "Student",
      category: "General",
      replies: 0,
      lastReply: "Just now",
    };

    onCreate(newThread);

    setTitle("");
    setDescription("");
    setAnonymous(false);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">

      <div
        className="
        w-full max-w-2xl rounded-3xl
        border border-slate-200 dark:border-zinc-800
        bg-white dark:bg-zinc-950
        p-8 space-y-6
        shadow-2xl
        animate-in fade-in zoom-in-95 duration-300
        "
      >

        <div className="flex items-center justify-between">

          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            Create Thread
          </h2>

          <button
            type="button"
            aria-label="Close create thread modal"
            onClick={onClose}
            className="
            p-2 rounded-lg
            text-slate-500 hover:text-red-500
            hover:bg-red-500/10
            transition-colors duration-200
            "
          >
            ✕
          </button>
        </div>

        <div className="space-y-5">

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thread title"
            aria-label="Thread title"
            className="
            w-full rounded-2xl
            border border-slate-300 dark:border-zinc-800
            bg-white dark:bg-zinc-900
            p-4
            outline-none
            transition-all duration-200
            focus:border-blue-500
            focus:ring-2 focus:ring-blue-500/20
            "
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your discussion..."
            aria-label="Thread description"
            rows={5}
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

          <label className="flex items-center gap-3 text-sm text-slate-700 dark:text-zinc-300">

            <input
              type="checkbox"
              checked={anonymous}
              onChange={() => setAnonymous((prev) => !prev)}
              aria-label="Post anonymously"
              className="h-4 w-4 accent-blue-600"
            />

            Post anonymously
          </label>
        </div>

        <div className="flex items-center gap-4">

          <button
            type="button"
            onClick={handleCreate}
            className="
            flex-1 py-4 rounded-2xl
            bg-blue-600 hover:bg-blue-700
            text-white font-semibold
            transition-all duration-300
            hover:scale-[1.02]
            active:scale-[0.98]
            hover:shadow-[0_0_25px_rgba(59,130,246,0.35)]
            "
          >
            Create Discussion
          </button>

          <button
            type="button"
            onClick={onClose}
            className="
            px-6 py-4 rounded-2xl
            border border-slate-300 dark:border-zinc-700
            text-slate-700 dark:text-zinc-300
            font-medium
            hover:border-red-400
            hover:text-red-500
            transition-all duration-200
            "
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}