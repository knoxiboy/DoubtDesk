"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCcw, LayoutDashboard } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[70vh] bg-[#030712] flex items-center justify-center p-6 relative overflow-hidden text-slate-200 font-sans rounded-2xl">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#33415522_1px,transparent_1px),linear-gradient(to_bottom,#33415522_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="backdrop-blur-xl bg-slate-900/40 border border-slate-700/50 rounded-3xl p-8 sm:p-10 shadow-[0_0_50px_rgba(220,38,38,0.1)] flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-widest mb-6">
            <AlertTriangle className="w-3.5 h-3.5" />
            Dashboard Error
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-3">
            Couldn't load your dashboard
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed mb-8">
            {error.message || "Something went wrong while loading dashboard data."}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <button onClick={reset} className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-500 ease-out" />
              <div className="relative flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 border border-slate-700/50 group-hover:border-cyan-500/50 rounded-xl text-white font-medium text-sm transition-all duration-300 ease-out">
                <RefreshCcw className="w-4 h-4 text-cyan-400" />
                Try Again
              </div>
            </button>

            <Link href="/dashboard" className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-600 to-slate-500 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500 ease-out" />
              <div className="relative flex items-center justify-center gap-2 px-6 py-3 bg-slate-800/50 border border-slate-700/50 group-hover:border-slate-500/50 rounded-xl text-slate-300 group-hover:text-white font-medium text-sm transition-all duration-300 ease-out">
                <LayoutDashboard className="w-4 h-4" />
                Reload Dashboard
              </div>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
