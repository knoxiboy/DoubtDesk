"use client";

/**
 * components/MentorModeToggle.tsx
 *
 * An accessible toggle that switches the AI between "Direct Answer"
 * and "Mentor Mode (Socratic Hinting)".
 *
 * Props:
 *   mode      -- current AIMode value ("direct" | "mentor")
 *   onChange  -- called when the user flips the toggle
 *   disabled  -- disable the toggle while a request is in-flight
 *
 * Matches DoubtDesk's dark slate theme (slate-950 bg, blue-500 accent).
 */

import type { AIMode } from "@/types/ai-chat";

interface MentorModeToggleProps {
  mode: AIMode;
  onChange: (mode: AIMode) => void;
  disabled?: boolean;
}

export function MentorModeToggle({
  mode,
  onChange,
  disabled = false,
}: MentorModeToggleProps) {
  const isMentor = mode === "mentor";

  function handleToggle() {
    if (disabled) return;
    onChange(isMentor ? "direct" : "mentor");
  }

  return (
    <div
      className="flex items-center gap-3 select-none"
      title={
        isMentor
          ? "Mentor Mode: AI guides you with hints"
          : "Direct Mode: AI answers immediately"
      }
    >
      {/* Label */}
      <span className="text-sm font-medium text-slate-300 hidden sm:block">
        {isMentor ? "Mentor Mode" : "Direct Answer"}
      </span>

      {/* Toggle pill */}
      <button
        type="button"
        role="switch"
        aria-checked={isMentor}
        aria-label="Toggle Mentor Mode"
        disabled={disabled}
        onClick={handleToggle}
        className={[
          "relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent",
          "transition-colors duration-200 ease-in-out",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
          isMentor ? "bg-blue-500" : "bg-slate-600",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        {/* Thumb */}
        <span
          aria-hidden="true"
          className={[
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg",
            "ring-0 transition-transform duration-200 ease-in-out",
            isMentor ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>

      {/* Mode badge */}
      <span
        className={[
          "text-xs font-semibold px-2 py-0.5 rounded-full transition-colors",
          isMentor
            ? "bg-blue-500/20 text-blue-400"
            : "bg-slate-700 text-slate-400",
        ].join(" ")}
      >
        {isMentor ? "Hints" : "Answer"}
      </span>
    </div>
  );
}
