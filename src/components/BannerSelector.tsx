"use client";

const BANNERS = [
  { id: "none", label: "No Banner", gradient: "bg-slate-100 dark:bg-zinc-900" },
  { id: "ocean", label: "Ocean", gradient: "bg-gradient-to-r from-blue-400 to-cyan-400" },
  { id: "sunset", label: "Sunset", gradient: "bg-gradient-to-r from-orange-400 to-pink-500" },
  { id: "forest", label: "Forest", gradient: "bg-gradient-to-r from-green-400 to-emerald-600" },
  { id: "galaxy", label: "Galaxy", gradient: "bg-gradient-to-r from-purple-600 to-indigo-700" },
  { id: "fire", label: "Fire", gradient: "bg-gradient-to-r from-red-500 to-orange-500" },
];

interface BannerSelectorProps {
  selected: string;
  onSelect: (id: string) => void;
}

export default function BannerSelector({ selected, onSelect }: BannerSelectorProps) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-3">
        Choose Banner
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {BANNERS.map((banner) => (
          <button
            key={banner.id}
            onClick={() => onSelect(banner.id)}
            className={`relative h-16 rounded-xl border-2 transition-all duration-200 ${banner.gradient}
              ${selected === banner.id
                ? "border-blue-500 scale-[1.02]"
                : "border-slate-200 dark:border-zinc-700 hover:border-blue-300"
              }`}
          >
            <span className="absolute bottom-1 left-2 text-xs font-bold text-white drop-shadow">
              {banner.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}