"use client";

import {
  Activity,
  ArrowRight,
  Clipboard,
  LayoutGrid,
  Map,
  MessageCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Inter, Staatliches } from "next/font/google";

import ChatPreviewCard from "./ChatPreviewCard";
import ShapeGrid from "./ShapeGrid";
import { ThemeToggle } from "./ThemeToggle";

const inter = Inter({ subsets: ["latin"] });
const staatliches = Staatliches({ weight: "400", subsets: ["latin"] });

export default function ChatHome() {
  const features = [
    {
      title: "Real-time collaborative discussions",
      description: "Share questions, answers, and classroom updates instantly across study groups.",
      icon: MessageCircle,
    },
    {
      title: "Smart classroom management",
      description: "Organize learning spaces, schedules, and teacher workflows with ease.",
      icon: LayoutGrid,
    },
    {
      title: "Notes and resource sharing",
      description: "Keep study materials, highlights, and shared guides organized in one hub.",
      icon: Clipboard,
    },
    {
      title: "Learning roadmaps and guidance",
      description: "Follow curated study paths that keep learners focused on milestones.",
      icon: Map,
    },
    {
      title: "AI-powered doubt solving",
      description: "Get instant, context-aware answers to questions with smart AI support.",
      icon: Activity,
    },
    {
      title: "Organized study collaboration",
      description: "Coordinate projects, peer review, and group work with clear tools and structure.",
      icon: Users,
    },
  ];

  const howItWorks = [
    {
      title: "Join or create a classroom",
      description: "Teachers set up rooms, students join using invite codes."
    },
    {
      title: "Ask doubts instantly",
      description: "Post questions using text or image and get AI + peer help."
    },
    {
      title: "Get clear answers & insights",
      description: "AI explanations, teacher guidance, and analytics all in one place."
    }
  ];

  const testimonials = [
    {
      name: "Aarav Sharma",
      role: "B.Tech Student",
      text: "DoubtDesk made it so easy to clear my doubts during exam prep. The AI explanations are super clear."
    },
    {
      name: "Neha Verma",
      role: "CS Student",
      text: "No more messy WhatsApp groups. Everything is structured and easy to follow."
    },
    {
      name: "Rohit Mehta",
      role: "Teaching Assistant",
      text: "Analytics help me understand where students struggle the most."
    }
  ];

  return (
    <div className={`${inter.className} min-h-screen bg-background text-foreground flex flex-col selection:bg-[#5E8CFF]/30 transition-colors duration-300`}>
      {/* Navbar */}
      <header className="sticky inset-x-0 top-0 z-50 bg-background/88 supports-[backdrop-filter]:bg-background/72 backdrop-blur-xl overflow-visible transition-colors duration-300">
        <div className="absolute inset-x-0 bottom-0 h-px bg-border shadow-[0_0_10px_rgba(139,184,255,0.18)]" />
        <div className="max-w-7xl mx-auto h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 md:px-[clamp(24px,5vw,64px)]">
          <Link href="/" className="flex items-center gap-1 sm:gap-2 hover:opacity-90 transition-opacity shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#5E8CFF] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_rgba(94,140,255,0.25)] ring-1 ring-[#AABFFF]/35">
              D
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground transition-colors drop-shadow-[0_0_10px_rgba(170,191,255,0.15)]">
              DoubtDesk
            </h1>
          </Link>

          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all duration-300 hover:text-blue-600 dark:hover:text-[#AABFFF] hover:drop-shadow-[0_0_8px_rgba(170,191,255,0.2)]"
            >
              Features
            </button>
            <button
              onClick={() => {
                document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all duration-300 hover:text-blue-600 dark:hover:text-[#AABFFF] hover:drop-shadow-[0_0_8px_rgba(170,191,255,0.2)] "
            >
              How It Works
            </button>
            <button
              onClick={() => {
                document.getElementById("testimonials")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all duration-300 hover:text-blue-600 dark:hover:text-[#AABFFF] hover:drop-shadow-[0_0_8px_rgba(170,191,255,0.2)]"
            >
              Testimonial
            </button>
            <Link
              href="/chat/peer-to-peer"
              className="whitespace-nowrap px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all duration-300 hover:text-blue-600 dark:hover:text-[#AABFFF] hover:drop-shadow-[0_0_8px_rgba(170,191,255,0.2)]"
            >
              Peer to Peer Discussion
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Link href="/chat">
              <button className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white rounded-xl text-sm font-semibold border border-slate-200 dark:border-white/10 transition-all hover:shadow-[0_0_16px_rgba(255,255,255,0.08)]">
                Sign In
              </button>
            </Link>
            <Link href="/chat">
              <button className="px-5 py-2.5 bg-[#5E8CFF] hover:bg-[#8BB8FF] text-white rounded-xl text-sm font-semibold shadow-[0_0_14px_rgba(94,140,255,0.28)] transition-all">
                Join DoubtDesk
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 pt-[128px] relative overflow-hidden scroll-smooth">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <ShapeGrid
            speed={0.45}
            squareSize={42}
            direction="diagonal"
            borderColor="rgba(125, 162, 255, 0.08)"
            hoverFillColor="rgba(125, 162, 255, 0.14)"
            shape="square"
            hoverTrailAmount={5}
            className="opacity-60"
          />
          <div className="absolute inset-0 bg-[#020617]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_26%_24%,rgba(125,162,255,0.16),transparent_28%),radial-gradient(circle_at_72%_42%,rgba(170,191,255,0.08),transparent_26%),linear-gradient(to_bottom,rgba(2,6,23,0.08),rgba(2,6,23,0.22))]" />
          <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:28px_28px]" />
        </div>
        <section className="px-6 pb-12 relative z-10 pt-3 md:pt-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-12 xl:gap-16 items-start">
            <div className="text-left pt-2 sm:pt-4 xl:pt-10">
              <h2 className="max-w-[11ch] text-4xl sm:text-5xl lg:text-6xl xl:text-[4.5rem] font-black text-[#F3F6FF] tracking-[-0.04em] leading-[0.96] mb-7 sm:mb-8">
                Empower <br />
                Your Learning <br />
                with{" "}
                <span className={`${staatliches.className} uppercase tracking-[0.05em] bg-gradient-to-r from-[#8BB8FF] to-[#AABFFF] bg-clip-text text-transparent`}>
                  Collaborative AI.
                </span>
              </h2>

              <div className="max-w-xl mb-10 sm:mb-11">
                <div className={`${staatliches.className} mb-3 text-sm tracking-[0.18em] text-[#94A3B8] uppercase`}>
                  Collaborative classrooms
                </div>
                <p className="max-w-[28rem] text-lg sm:text-xl text-[#94A3B8] leading-[1.75]">
                  A live student collaboration system for doubts, notes, and shared progress across campus groups.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                <Link href="/chat" className="w-full sm:w-auto">
                  <button className="group min-w-[15rem] px-8 py-4.5 bg-white text-slate-950 rounded-[1.15rem] text-base font-bold border border-slate-200/80 shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:bg-slate-100 hover:border-slate-300 transition-all w-full sm:w-auto flex items-center justify-center gap-2">
                    <span className={`${staatliches.className} uppercase tracking-[0.08em]`}>Open Classroom</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
              </div>
            </div>

            <div className="flex items-center justify-center xl:justify-end xl:pt-16">
              <ChatPreviewCard />
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 px-6 py-16 md:py-20 relative z-10">
          <div className="absolute inset-x-0 top-10 h-40 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10 blur-3xl pointer-events-none" />
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mx-auto text-center">
              <div className={`${staatliches.className} mb-4 text-sm tracking-[0.16em] text-blue-700 dark:text-[#AABFFF]/70 uppercase`}>
                Features
              </div>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-[#F2F5FF] tracking-tight leading-tight">
                Everything your classroom needs to solve doubts, stay aligned, and move faster.
              </h3>
              <p className="mt-5 text-base sm:text-lg text-slate-700 dark:text-slate-300/85 leading-8">
                Built for modern study teams, DoubtDesk blends AI-powered doubt solving, shared resources, and smart classroom flows into a single polished platform.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-6 shadow-2xl shadow-slate-950/10 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-500/10 dark:bg-[#5E8CFF]/10 text-blue-600 dark:text-[#8BB8FF] shadow-[0_0_18px_rgba(94,140,255,0.18)] transition-colors duration-300 group-hover:bg-blue-500/15 dark:group-hover:bg-[#5E8CFF]/15">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h4 className="mt-6 text-xl font-semibold text-slate-900 dark:text-[#F2F5FF] tracking-tight">
                      {feature.title}
                    </h4>
                    <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300/80">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="scroll-mt-24 px-6 py-20 relative z-10">
          <div className="max-w-7xl mx-auto text-center">
            <h3 className="text-3xl sm:text-4xl font-bold text-[#F2F5FF]">
              How it works
            </h3>

            <p className="mt-4 text-slate-300/80">
              Simple flow from doubt â†’ solution â†’ understanding
            </p>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              {howItWorks.map((step, index) => (
                <div
                  key={step.title}
                  className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] transition"
                >
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#5E8CFF] text-white flex items-center justify-center font-bold shadow-[0_0_18px_rgba(94,140,255,0.45)] ring-1 ring-[#8BB8FF]/40">
                    {index + 1}
                  </div>

                  <h4 className="text-lg font-semibold text-[#F2F5FF]">
                    {step.title}
                  </h4>

                  <p className="mt-2 text-sm text-slate-300/80">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="scroll-mt-24 px-6 py-20 relative z-10">
          <div className="max-w-7xl mx-auto text-center">
            <div className={`${staatliches.className} mb-4 text-sm tracking-[0.16em] text-[#AABFFF]/70 uppercase`}>
              Testimonials
            </div>
            <h3 className="text-3xl sm:text-4xl font-bold text-[#F2F5FF]">
              What students say
            </h3>

            <p className="mt-4 text-slate-300/80">
              Real feedback from learners and educators
            </p>

            <div className="mt-12 grid md:grid-cols-3 gap-6 text-left">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] transition"
                >
                  <p className="text-slate-300/80 text-sm leading-7">
                    â€œ{t.text}â€
                  </p>

                  <div className="mt-5">
                    <div className="text-[#F2F5FF] font-semibold">
                      {t.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {t.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
