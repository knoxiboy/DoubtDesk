"use client";

import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    const isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: 0,
      behavior: isReducedMotion ? "auto" : "smooth",
    });
  };

  if (scrollProgress <= 5) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-8 right-8 z-50 w-14 h-14 flex items-center justify-center"
      aria-label="Scroll to top"
    >
      <svg className="absolute top-0 left-0 w-14 h-14 -rotate-90" viewBox="0 0 56 56">
        <circle
          cx="28" cy="28" r="24"
          fill="none"
          stroke="rgba(94,140,255,0.15)"
          strokeWidth="3"
        />
        <circle
          cx="28" cy="28" r="24"
          fill="none"
          stroke="#5E8CFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 24}`}
          strokeDashoffset={`${2 * Math.PI * 24 * (1 - scrollProgress / 100)}`}
          className="transition-all duration-150"
        />
      </svg>
      <div className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-slate-800 transition-colors">
        ↑
      </div>
    </button>
  );
}
