"use client";

const AVATARS = [
  { id: "default", emoji: "🧑", label: "Default" },
  { id: "student", emoji: "📚", label: "Student" },
  { id: "teacher", emoji: "🎓", label: "Teacher" },
  { id: "coder", emoji: "💻", label: "Coder" },
  { id: "scientist", emoji: "🔬", label: "Scientist" },
  { id: "artist", emoji: "🎨", label: "Artist" },
  { id: "gamer", emoji: "🎮", label: "Gamer" },
  { id: "ninja", emoji: "🥷", label: "Ninja" },
];

interface AvatarSelectorProps {
  selected: string;
  onSelect: (id: string) => void;
}

export default function AvatarSelector({ selected, onSelect }: AvatarSelectorProps) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-3">
        Choose Avatar
      </h3>
      <div className="grid grid-cols-4 gap-3">
        {AVATARS.map((avatar) => (
          <button
  key={avatar.id}
  onClick={() => onSelect(avatar.id)}
  aria-pressed={selected === avatar.id}
  aria-label={`Select ${avatar.label} avatar`}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200
              ${selected === avatar.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                : "border-slate-200 dark:border-zinc-800 hover:border-blue-300"
              }`}
          >
            <span className="text-3xl">{avatar.emoji}</span>
            <span className="text-xs font-medium text-slate-600 dark:text-zinc-400">
              {avatar.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}