"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScrollToTopProps {
    threshold?: number;
    className?: string;
}

export default function ScrollToTop({ threshold = 300, className }: ScrollToTopProps) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setVisible(window.scrollY > threshold);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();

        return () => window.removeEventListener("scroll", handleScroll);
    }, [threshold]);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <button
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className={cn(
                "fixed bottom-6 right-6 z-50",
                "flex items-center justify-center",
                "w-12 h-12 rounded-full",
                "bg-blue-600/80 dark:bg-blue-500/80",
                "border border-blue-500/30 dark:border-blue-400/30",
                "text-white shadow-lg shadow-blue-600/30",
                "transition-all duration-300",
                "hover:bg-blue-600 hover:scale-110",
                "active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                "backdrop-blur-md",
                visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4 pointer-events-none",
                className
            )}
        >
            <ChevronUp className="w-5 h-5" />
        </button>
    );
}