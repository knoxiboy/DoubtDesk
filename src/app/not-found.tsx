"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Terminal, ArrowLeft, LayoutDashboard, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6" />
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6 relative overflow-hidden text-slate-200 font-sans">
      {/* Background Animated Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#33415522_1px,transparent_1px),linear-gradient(to_bottom,#33415522_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Floating Ambient Lights */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/30 rounded-full blur-[120px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.25, 0.1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[140px] pointer-events-none"
      />

      {/* Floating Particles (Knowledge Fragments) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: ["110vh", "-10vh"],
              x: [0, Math.sin(i) * 50],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: Math.random() * 15 + 15,
              repeat: Infinity,
              delay: Math.random() * 10,
              ease: "linear",
            }}
            className="absolute bottom-0 w-1 h-1 bg-cyan-400/50 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)] blur-[0.5px]"
            style={{
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-2xl"
      >
        {/* Glass Card */}
        <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-700/50 rounded-3xl p-8 sm:p-14 shadow-[0_0_50px_rgba(8,112,184,0.15)] flex flex-col items-center text-center relative overflow-hidden">
          
          {/* Subtle Glitch overlay */}
          <motion.div 
            animate={{ opacity: [0, 0.03, 0, 0.05, 0] }}
            transition={{ duration: 5, repeat: Infinity, times: [0, 0.1, 0.2, 0.3, 1] }}
            className="absolute inset-0 bg-cyan-500/10 pointer-events-none mix-blend-overlay"
          />

          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest mb-10"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            System Error / Missing Route
          </motion.div>

          {/* 404 Floating Number */}
          <div className="relative mb-8 select-none">
            <motion.h1
              animate={{ y: [-8, 8, -8] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="text-[120px] sm:text-[160px] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-600 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] relative z-10"
            >
              404
            </motion.h1>
            {/* Outline Glow Duplicate (Depth) */}
            <motion.h1
              animate={{ y: [-4, 4, -4], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              className="absolute inset-0 text-[120px] sm:text-[160px] font-black leading-none tracking-tighter text-transparent blur-md pointer-events-none bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-600 z-0 scale-105"
              aria-hidden="true"
            >
              404
            </motion.h1>
          </div>

          {/* Title & Description */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="space-y-4 mb-10 relative z-10"
          >
            <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Knowledge Node Not Found
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              The resource you’re looking for may have been moved, removed, or never existed in this learning space.
            </p>
          </motion.div>

          {/* Terminal Search Effect */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="w-full max-w-sm mx-auto mb-10 bg-[#050505]/80 backdrop-blur-md rounded-lg p-4 border border-slate-800/80 shadow-inner flex items-center gap-3 text-left overflow-hidden relative z-10"
          >
            <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-blue-600 opacity-80" />
            <Terminal className="w-4 h-4 text-cyan-500 shrink-0 ml-1" />
            <div className="font-mono text-[11px] sm:text-xs text-cyan-400/80 w-full flex">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "linear", delay: 1.2 }}
                className="overflow-hidden whitespace-nowrap border-r-[2px] border-cyan-500 pr-1 animate-pulse"
              >
                &gt; Searching knowledge base... not found
              </motion.div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 w-full justify-center relative z-10"
          >
            <Link href="/dashboard" className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-500 ease-out" />
              <div className="relative flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 border border-slate-700/50 group-hover:border-cyan-500/50 rounded-xl text-white font-medium text-sm transition-all duration-300 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                Go to Dashboard
              </div>
            </Link>
            
            <Link href="/rooms" className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-600 to-slate-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500 ease-out" />
              <div className="relative flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-800/50 border border-slate-700/50 group-hover:border-slate-500/50 rounded-xl text-slate-300 group-hover:text-white font-medium text-sm transition-all duration-300 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <ArrowLeft className="w-4 h-4" />
                Return to Classrooms
              </div>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
