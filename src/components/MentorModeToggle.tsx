"use client";

import { AIMode } from "@/types/mentor";

interface Props {
  mode: AIMode;
  onChange: (mode: AIMode) => void;
}

export function MentorModeToggle({ mode, onChange }: Props) {
  return (
    /* Accessibility: 
      - Added role="group" and an explicit aria-label so screen readers 
        understand that these buttons are related and belong to a toggle group.
    */
    <div 
      role="group" 
      aria-label="AI response mode selector" 
      className="flex items-center gap-1 rounded-lg bg-slate-800 p-1 text-sm"
    >
      <button
        type="button"
        onClick={() => onChange("direct")}
        // EXPOSED STATE: Dynamic boolean value tells assistive tech if this option is selected
        aria-pressed={mode === "direct"}
        className={`rounded-md px-3 py-1.5 transition-all ${
          mode === "direct"
            ? "bg-blue-600 text-white shadow"
            : "text-slate-400 hover:text-white"
        }`}
      >
        Direct Answer
      </button>
      
      <button
        type="button"
        onClick={() => onChange("socratic")}
        // EXPOSED STATE: Dynamic boolean value tells assistive tech if this option is selected
        aria-pressed={mode === "socratic"}
        className={`rounded-md px-3 py-1.5 transition-all ${
          mode === "socratic"
            ? "bg-blue-600 text-white shadow"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <span role="img" aria-label="teacher">🧑‍🏫</span> Mentor Mode
      </button>
    </div>
  );
}
