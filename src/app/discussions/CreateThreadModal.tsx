"use client";

import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (thread: any) => void;
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

    onCreate({
      id: Date.now(),
      title,
      description,
      author: anonymous ? "Anonymous" : "Student",
      category: "General",
      replies: 0,
      lastReply: "Just now",
    });

    setTitle("");
    setDescription("");
    setAnonymous(false);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">

      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 space-y-6">

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black">
            Create Thread
          </h2>

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-red-500"
          >
            ✕
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Thread title"
          className="w-full rounded-2xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 outline-none focus:border-blue-500"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your discussion..."
          rows={5}
          className="w-full rounded-2xl border border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 outline-none focus:border-blue-500"
        />

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={() => setAnonymous(!anonymous)}
          />

          Post anonymously
        </label>

        <button
          onClick={handleCreate}
          className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-300 hover:scale-[1.02]"
        >
          Create Discussion
        </button>
      </div>
    </div>
  );
}