import React from "react";

// Use IBM Plex Mono or Space Mono via Tailwind font stack or custom font import
// This panel is styled to blend into the hero grid, with deep navy, sharp corners, thin borders, minimal glow, and subtle blur.

export default function LiveCampusThreadPanel() {
  return (
    <aside
      className="w-full max-w-md xl:max-w-[25rem] bg-[#0B1530]/80 border border-white/10 rounded-[0.9rem] shadow-none backdrop-blur-[2.5px] px-7 py-6 flex flex-col gap-5 font-mono text-[15px] text-[#E6ECF7]"
      style={{ fontFamily: 'IBM Plex Mono, Space Mono, ui-monospace, monospace' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs tracking-widest text-[#AABFFF]/80 font-semibold uppercase">LIVE CAMPUS THREAD</span>
        <span className="ml-auto flex items-center gap-1 text-xs text-[#8BB8FF] font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-[#8BB8FF] animate-pulse" />
          live
        </span>
      </div>
      <div className="flex items-center gap-2 text-[#B6C6E3] text-sm font-semibold">
        <span>Wave Optics</span>
        <span className="mx-2 h-1 w-1 rounded-full bg-[#8BB8FF]/60" />
        <span className="text-[#8BB8FF] font-bold">23 active</span>
      </div>
      <blockquote className="relative pl-4 border-l-2 border-[#8BB8FF]/30 text-[#E6ECF7] text-base font-medium leading-snug mb-1">
        Why does destructive interference produce dark fringes?
        <span className="absolute left-0 top-0 h-full w-0.5 bg-[#8BB8FF]/10 rounded" />
      </blockquote>
      <div className="flex items-center gap-2 text-xs text-[#AABFFF]/80">
        <span className="relative flex items-center">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8BB8FF] animate-pulse mr-1" />
          AI summary available
        </span>
        <span className="mx-2 h-1 w-1 rounded-full bg-[#8BB8FF]/30" />
        <span>12 replies ongoing</span>
      </div>
      <div className="border-t border-white/7 mt-2 mb-1 opacity-60" />
      <ul className="flex flex-col gap-1.5 text-xs text-[#B6C6E3] font-mono">
        <li className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8BB8FF]/60" />
          New DBMS notes uploaded
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8BB8FF]/60" />
          CN lecture summarized
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8BB8FF]/60" />
          Placement roadmap updated
        </li>
      </ul>
      <div className="mt-2 flex items-center gap-2 text-xs text-[#8BB8FF]/70 font-mono">
        <span className="animate-blink inline-block w-2 h-2 rounded-full bg-[#8BB8FF]" />
        <span className="tracking-widest">_</span>
      </div>
      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.2; }
        }
        .animate-blink {
          animation: blink 1.1s steps(1, end) infinite;
        }
      `}</style>
    </aside>
  );
}
