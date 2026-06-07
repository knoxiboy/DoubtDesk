"use client";

import { useEffect, useState } from "react";
import { Circle, Sparkles } from "lucide-react";
import { Space_Mono, Staatliches } from "next/font/google";

const staatliches = Staatliches({ weight: "400", subsets: ["latin"] });
const spaceMono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"] });

const liveUpdates = [
  "New DBMS notes uploaded",
  "CN lecture summarized",
  "Placement roadmap updated",
];

export default function ChatPreviewCard() {
  const [updateIndex, setUpdateIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setUpdateIndex((current) => (current + 1) % liveUpdates.length);
    }, 2600);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full max-w-[30rem] overflow-hidden border border-[rgba(125,162,255,0.14)] bg-[#050B16]/82 text-[#F3F6FF] shadow-[0_20px_48px_rgba(2,6,23,0.28)] backdrop-blur-[6px]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent_20%,transparent_82%,rgba(125,162,255,0.05))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(148,163,184,0.55)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.55)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:repeating-linear-gradient(to_bottom,rgba(148,163,184,0.55)_0,rgba(148,163,184,0.55)_1px,transparent_1px,transparent_4px)]" />

      <style jsx>{`
        @keyframes cursorBlink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0.18;
          }
        }

        @keyframes softPulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.55;
          }
          50% {
            transform: scale(1.12);
            opacity: 0.95;
          }
        }

        @keyframes fadeSwitch {
          0%,
          100% {
            opacity: 0.75;
            transform: translateY(0px);
          }
          50% {
            opacity: 1;
            transform: translateY(-1px);
          }
        }
      `}</style>

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className={`${staatliches.className} text-[0.72rem] tracking-[0.22em] text-[#AABFFF]/78 uppercase`}>
              Live Campus Thread
            </div>
            <div className="mt-2 text-xl font-semibold tracking-tight text-[#F3F6FF]">
              Wave Optics
            </div>
            <div className={`${spaceMono.className} mt-1 text-[0.78rem] tracking-[0.16em] text-slate-400`}>
              23 active
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-[rgba(125,162,255,0.14)] bg-white/[0.03] px-3 py-1 text-[0.7rem] uppercase tracking-[0.18em] text-slate-300">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[#7DA2FF]"
              style={{ animation: "softPulse 1.8s ease-in-out infinite" }}
            />
            Live
          </div>
        </div>

        <div className="mt-5 border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 text-[0.72rem] tracking-[0.18em] text-slate-400 uppercase">
            <span>Discussion preview</span>
            <span className={`${spaceMono.className} text-[0.68rem] tracking-[0.18em] text-[#8BB8FF]`}>
              syncing
              <span className="inline-block w-1.5 align-middle" style={{ animation: "cursorBlink 1s steps(1,end) infinite" }}>
                |
              </span>
            </span>
          </div>

          <div className="mt-4 space-y-3">
            <p className={`${spaceMono.className} text-[0.9rem] leading-7 tracking-[-0.01em] text-[#F3F6FF]`}>
              &gt; Why does destructive interference produce dark fringes?
            </p>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <div className="text-sm font-medium text-slate-200">
                  AI summary available
                </div>
                <div className={`${spaceMono.className} mt-1 text-[0.75rem] tracking-[0.16em] text-slate-400`}>
                  12 replies ongoing
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-[rgba(125,162,255,0.16)] bg-[rgba(125,162,255,0.06)] px-3 py-2 text-[0.72rem] text-[#AABFFF]">
                <Sparkles className="h-3.5 w-3.5 opacity-65" />
                Thread summarizing
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 border-t border-white/10 pt-4">
          {liveUpdates.map((update, index) => {
            const isActive = index === updateIndex;

            return (
              <div
                key={update}
                className={`flex items-center gap-3 border border-transparent px-0 py-1.5 text-sm transition-all duration-300 ${
                  isActive ? "text-[#F3F6FF]" : "text-slate-400"
                }`}
                style={{ animation: isActive ? "fadeSwitch 2.6s ease-in-out infinite" : undefined }}
              >
                <Circle className={`h-2.5 w-2.5 ${isActive ? "fill-[#7DA2FF] text-[#7DA2FF]" : "text-slate-500/70"}`} />
                <span className={`${spaceMono.className} text-[0.78rem] tracking-[0.08em]`}>
                  {update}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-[0.72rem] tracking-[0.18em] text-slate-400 uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7DA2FF]/70" style={{ animation: "softPulse 2s ease-in-out infinite" }} />
          Quiet academic activity stream
        </div>
      </div>
    </div>
  );
}
