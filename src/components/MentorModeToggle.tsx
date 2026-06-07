"use client";

import { AIMode } from "@/types/mentor";

interface Props {
  mode: AIMode;
  onChange: (mode: AIMode) => void;
}

export function MentorModeToggle({ mode, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-slate-800 p-1 text-sm">
      <button
        // FIXED: Added explicit button type to prevent accidental form submissions
        type="button"
        onClick={() => onChange("direct")}
        className={`rounded-md px-3 py-1.5 transition-all ${
          mode === "direct"
            ? "bg-blue-600 text-white shadow"
            : "text-slate-400 hover:text-white"
        }`}
      >
        Direct Answer
      </button>
      <button
        // FIXED: Added explicit button type to prevent accidental form submissions
        type="button"
        onClick={() => onChange("socratic")}
        className={`rounded-md px-3 py-1.5 transition-all ${
          mode === "socratic"
            ? "bg-blue-600 text-white shadow"
            : "text-slate-400 hover:text-white"
        }`}
      >
        {/* FIXED: Wrapped the emoji in a span with aria-label for accessibility/linter satisfaction */}
        <span role="img" aria-label="teacher">🧑‍🏫</span> Mentor Mode
      </button>
    </div>
  );
}
