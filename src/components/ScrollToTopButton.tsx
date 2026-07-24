"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { getScrollBehavior } from "@/lib/utils/scroll-to-section";

type ScrollToTopButtonProps = {
  showProgress?: boolean;
  /** Scroll progress % (0–100) to show button when showProgress is true */
  progressThreshold?: number;
  /** Pixel scroll offset to show button when showProgress is false */
  scrollThreshold?: number;
};

export default function ScrollToTopButton({
  showProgress = false,
  progressThreshold = 5,
  scrollThreshold = 300,
}: ScrollToTopButtonProps) {
  const pathname = usePathname();
  const showProgressOnHome = showProgress || pathname === "/";
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);

      if (showProgressOnHome) {
        setIsVisible(progress > progressThreshold);
      } else {
        setIsVisible(scrollTop > scrollThreshold);
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [showProgressOnHome, progressThreshold, scrollThreshold]);

  if (!isVisible) return null;

  const circumference = 2 * Math.PI * 24;
  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: getScrollBehavior() });

  const focusRingClass =
    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";

  if (showProgressOnHome) {
    return (
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className={cn(
          "fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full",
          focusRingClass
        )}
      >
        <svg
          className="absolute top-0 left-0 h-14 w-14 -rotate-90"
          viewBox="0 0 56 56"
          aria-hidden
        >
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            className="stroke-primary/20"
            strokeWidth="3"
          />
          <circle
            cx="28"
            cy="28"
            r="24"
            fill="none"
            className="stroke-primary transition-all duration-150"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={
              circumference * (1 - scrollProgress / 100)
            }
          />
        </svg>
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg backdrop-blur-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            "dark:border-white/10 dark:bg-card dark:shadow-black/20"
          )}
        >
          <ArrowUp className="h-5 w-5" />
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={cn(
        "fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-background text-foreground shadow-lg transition-all",
        "hover:-translate-y-1 hover:bg-accent hover:text-accent-foreground",
        focusRingClass,
        "dark:border-white/10 dark:bg-card dark:shadow-black/20"
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
