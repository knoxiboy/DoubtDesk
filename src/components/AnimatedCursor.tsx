"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export default function AnimatedCursor() {
  const [hovering, setHovering] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springConfig = {
    damping: 30,
    stiffness: 250,
    mass: 0.6,
  };

  const cursorX = useSpring(mouseX, springConfig);
  const cursorY = useSpring(mouseY, springConfig);

  useEffect(() => {
    if ("ontouchstart" in window) return;

    const moveCursor = (e: MouseEvent) => {
      mouseX.set(e.clientX - 12);
      mouseY.set(e.clientY - 12);

      const target = e.target as HTMLElement;

      const isInteractive =
        target.closest("button") ||
        target.closest("a") ||
        target.closest("[role='button']");

      setHovering(!!isInteractive);
    };

    window.addEventListener("mousemove", moveCursor);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
    };
  }, [mouseX, mouseY]);

  if (
  prefersReducedMotion ||
  (typeof window !== "undefined" && "ontouchstart" in window)
) {
  return null;
}

  return (
    <>
      {/* Glow */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9998] h-20 w-20 rounded-full bg-blue-500/20 blur-3xl"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: "-35%",
          translateY: "-35%",
          scale: hovering ? 1.8 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 120,
          damping: 20,
        }}
      />

      {/* Main Cursor */}
      <motion.div
        className="pointer-events-none fixed top-0 left-0 z-[9999] flex items-center justify-center"
        style={{
          x: cursorX,
          y: cursorY,
        }}
      >
        <motion.div
          animate={{
            scale: hovering ? 1.8 : 1,
            borderColor: hovering
              ? "rgba(96,165,250,0.9)"
              : "rgba(255,255,255,0.7)",
          }}
          transition={{
            duration: 0.2,
          }}
          className="h-6 w-6 rounded-full border border-white/70 bg-white/5 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.35)]"
        />

        {/* Dot */}
        <motion.div
          animate={{
            scale: hovering ? 0 : 1,
          }}
          className="absolute h-1.5 w-1.5 rounded-full bg-white"
        />
      </motion.div>
    </>
  );
}
