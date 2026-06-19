import { ArrowRight, Globe } from "lucide-react";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Staatliches } from "next/font/google";
import ShapeGrid from "@/components/ShapeGrid";
import LiveCampusThreadPanel from "@/components/LiveCampusThreadPanel";

const staatliches = Staatliches({ weight: "400", subsets: ["latin"] });


export default function HeroSection() {
  return (
    <main className="flex-1 relative overflow-hidden scroll-smooth">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <ShapeGrid
          speed={0.45}
          squareSize={42}
          direction="diagonal"
          borderColor="rgba(143, 172, 243, 0.2)"
          hoverFillColor="rgba(182, 201, 248, 0.08)"
          shape="square"
          hoverTrailAmount={5}
          className="opacity-100 dark:opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 via-transparent to-transparent dark:from-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_70%_60%,rgba(99,102,241,0.05),transparent_40%)] dark:bg-[radial-gradient(circle_at_26%_24%,rgba(125,162,255,0.12),transparent_28%),radial-gradient(circle_at_72%_42%,rgba(170,191,255,0.05),transparent_26%)]" />
      </div>
      <section className="px-4 sm:px-6 lg:px-20 pt-32 pb-20 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-12 xl:gap-16 items-center">
          <div className="text-center xl:text-left space-y-8 animate-in fade-in slide-in-from-left-6 duration-700 ease-out">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.05] max-w-xl sm:max-w-2xl mx-auto xl:mx-0 transition-colors duration-300">
              Empower <br />
              Your Learning <br />
              with{" "}
              <span
                className={`${staatliches.className} uppercase tracking-[0.04em] bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 dark:from-[#8BB8FF] dark:to-[#AABFFF] bg-clip-text text-transparent bg-[size:200%_auto] animate-[shine_5s_linear_infinite]`}
              >
                Collaborative AI.
              </span>
            </h2>

            <div className="space-y-2 max-w-md sm:max-w-xl mx-auto xl:mx-0 transition-all duration-300">
              <div
                className={`${staatliches.className} text-xs tracking-[0.16em] text-blue-600 dark:text-blue-400 uppercase font-medium`}
              >
                Collaborative classrooms
              </div>
              <p className="text-base sm:text-lg text-slate-500 dark:text-zinc-400 leading-relaxed transition-colors duration-300">
                Built for collaborative classrooms, instant doubt solving, and
                smarter learning.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center xl:justify-start gap-4 transition-all duration-300 max-w-md sm:max-w-none mx-auto xl:mx-0">
              <SignedIn>
                <Link href="/rooms" className="w-full sm:w-auto">
                  <button className="group w-full sm:w-auto px-10 py-5 bg-[#5E8CFF] text-white rounded-2xl text-lg font-bold hover:bg-[#8BB8FF] hover:shadow-[0_0_24px_rgba(94,140,255,0.35)] transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                    <span
                      className={`${staatliches.className} uppercase tracking-[0.08em]`}
                    >
                      Open Classroom
                    </span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                  </button>
                </Link>
              </SignedIn>

              <SignedOut>
                <Link href="/sign-up" className="w-full sm:w-auto">
                  <button className="group w-full sm:w-auto px-10 py-5 bg-white text-slate-950 rounded-2xl text-lg font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                    <span
                      className={`${staatliches.className} uppercase tracking-[0.08em]`}
                    >
                      Open
                    </span>
                    <span>Classroom</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" />
                  </button>
                </Link>
              </SignedOut>

              <Link href="/public-rooms" className="w-full sm:w-auto">
                <button className="group w-full sm:w-auto px-10 py-5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white rounded-2xl text-lg font-bold border border-slate-200 dark:border-white/10 transition-all hover:shadow-[0_0_20px_rgba(94,140,255,0.15)] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                  <span
                    className={`${staatliches.className} uppercase tracking-[0.08em]`}
                  >
                    Explore Community
                  </span>
                  <Globe className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-[#8BB8FF] group-hover:rotate-12 transition-transform duration-300" />
                </button>
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center xl:justify-end w-full pt-4 xl:pt-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 ease-out fill-mode-both">
            <div className="w-full max-w-md xl:max-w-full transition-transform duration-500 hover:scale-[1.01] rounded-[0.9rem]">
              <LiveCampusThreadPanel />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

