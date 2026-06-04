"use client";

import React, { useState, useEffect } from "react";

export default function LiveCampusThreadPanel() {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside
      className="w-full bg-white/40 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-[0.9rem] shadow-xl shadow-slate-900/5 dark:shadow-none backdrop-blur-[12px] supports-[backdrop-filter]:backdrop-blur-[12px] px-7 py-6 flex flex-col gap-5 text-[15px] text-slate-700 dark:text-[#E6ECF7] transition-all duration-500 hover:border-blue-400/50 dark:hover:border-[#8BB8FF]/30"
      style={{ fontFamily: 'IBM Plex Mono, Space Mono, ui-monospace, monospace' }}
    >
      {/* Top Meta Details Row */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs tracking-widest text-slate-500 dark:text-[#AABFFF]/80 font-semibold uppercase">LIVE CAMPUS THREAD</span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-blue-600 dark:text-[#8BB8FF] font-medium tracking-wide">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 dark:bg-[#8BB8FF] animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)] dark:shadow-[0_0_8px_rgba(139,184,255,0.6)]" />
          live
        </span>
      </div>

      {/* Classroom Status Identifier */}
      <div className="flex items-center gap-2 text-slate-600 dark:text-[#B6C6E3] text-sm font-semibold">
        <span className="text-slate-900 dark:text-[#E6ECF7]">Wave Optics</span>
        <span className="mx-2 h-1 w-1 rounded-full bg-blue-500/30 dark:bg-[#8BB8FF]/60" />
        <span className="text-blue-600 dark:text-[#8BB8FF] font-bold tracking-wide">23 active</span>
      </div>

      {/* Main Blockquote Panel Question */}
      <blockquote className="relative pl-4 border-l-2 border-blue-500/40 dark:border-[#8BB8FF]/40 text-slate-900 dark:text-[#E6ECF7] text-base font-medium leading-snug mb-1 font-sans tracking-wide">
        Why does destructive interference produce dark fringes?
      </blockquote>

      {/* Metadata Indicators Row */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#AABFFF]/80">
        <span className="relative flex items-center">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-[#8BB8FF] animate-pulse mr-1.5" />
          AI summary available
        </span>
        <span className="mx-2 h-1 w-1 rounded-full bg-slate-300 dark:bg-[#8BB8FF]/30" />
        <span>12 replies ongoing</span>
      </div>

      {/* Clean Native Decorative Rule */}
      <div className="border-t border-slate-200/60 dark:border-white/5 my-1 w-full" />

      {/* Active Bullet Stream Items */}
      <ul className="flex flex-col gap-2 text-xs text-slate-600 dark:text-[#B6C6E3]">
        <li className="flex items-center gap-2.5 transition-colors duration-200 hover:text-slate-900 dark:hover:text-[#E6ECF7]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500/50 dark:bg-[#8BB8FF]/60 shadow-[0_0_4px_rgba(59,130,246,0.2)] dark:shadow-[0_0_4px_rgba(139,184,255,0.3)]" />
          New DBMS notes uploaded
        </li>
        <li className="flex items-center gap-2.5 transition-colors duration-200 hover:text-slate-900 dark:hover:text-[#E6ECF7]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500/50 dark:bg-[#8BB8FF]/60 shadow-[0_0_4px_rgba(59,130,246,0.2)] dark:shadow-[0_0_4px_rgba(139,184,255,0.3)]" />
          CN lecture summarized
        </li>
        <li className="flex items-center gap-2.5 transition-colors duration-200 hover:text-slate-900 dark:hover:text-[#E6ECF7]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500/50 dark:bg-[#8BB8FF]/60 shadow-[0_0_4px_rgba(59,130,246,0.2)] dark:shadow-[0_0_4px_rgba(139,184,255,0.3)]" />
          Placement roadmap updated
        </li>
      </ul>

      {/* Ticker System Terminal Indicator Line */}
      <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600/70 dark:text-[#8BB8FF]/70">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-[#8BB8FF] animate-pulse shadow-[0_0_6px_rgba(59,130,246,0.4)] dark:shadow-[0_0_6px_rgba(139,184,255,0.8)]" />
        <span className="tracking-widest transition-all duration-150">{dots || "_"}</span>
      </div>
    </aside>
  );
}