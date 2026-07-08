"use client";
import { useState, useEffect } from "react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  useClerk,
  UserButton,
} from "@clerk/nextjs";
import {
  Map,
  MessageCircle,
  ArrowRight,
  LayoutGrid,
  Clipboard,
  Activity,
  Users,
  Globe,
} from "lucide-react";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import ShapeGrid from "@/components/marketing/ShapeGrid";
import { Inter, Staatliches } from "next/font/google";
import LiveCampusThreadPanel from "@/components/classroom/LiveCampusThreadPanel";
import { scrollToSection } from "@/lib/utils/scroll-to-section";

import TestimonialsMarquee from "@/components/marketing/TestimonialsMarquee"; //Testimonials marquee

const inter = Inter({ subsets: ["latin"] });
const staatliches = Staatliches({ weight: "400", subsets: ["latin"] });

export default function Home() {
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  useEffect(() => {
    const scrollFromHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      requestAnimationFrame(() => scrollToSection(hash, { updateHash: false }));
    };

    scrollFromHash();
    window.addEventListener("hashchange", scrollFromHash);
    return () => window.removeEventListener("hashchange", scrollFromHash);
  }, []);

  const { signOut } = useClerk();

  const features = [
    {
      slug: "collaborative-discussions",
      title: "Real-time collaborative discussions",
      description:
        "Share questions, answers, and classroom updates instantly across study groups.",
      icon: MessageCircle,
    },
    {
      slug: "classroom-management",
      title: "Smart classroom management",
      description:
        "Organize learning spaces, schedules, and teacher workflows with ease.",
      icon: LayoutGrid,
    },
    {
      slug: "notes-resource-sharing",
      title: "Notes and resource sharing",
      description:
        "Keep study materials, highlights, and shared guides organized in one hub.",
      icon: Clipboard,
    },
    {
      slug: "learning-roadmaps",
      title: "Learning roadmaps and guidance",
      description:
        "Follow curated study paths that keep learners focused on milestones.",
      icon: Map,
    },
    {
      slug: "ai-powered-doubt-solving",
      title: "AI-powered doubt solving",
      description:
        "Get instant, context-aware answers to questions with smart AI support.",
      icon: Activity,
    },
    {
      slug: "study-collaboration",
      title: "Organized study collaboration",
      description:
        "Coordinate projects, peer review, and group work with clear tools and structure.",
      icon: Users,
    },
  ];

  const howItWorks = [
    {
      title: "Join or create a classroom",
      description: "Teachers set up rooms, students join using invite codes.",
    },
    {
      title: "Ask doubts instantly",
      description: "Post questions using text or image and get AI + peer help.",
    },
    {
      title: "Get clear answers & insights",
      description:
        "AI explanations, teacher guidance, and analytics all in one place.",
    },
  ];

  const testimonials = [
    {
      id: "1",
      name: "Aarav Sharma",
      role: "B.Tech Student",
      institution: "DTU",
      avatarUrl: "/avatars/arav.png",
      quote:
        "DoubtDesk helped me resolve doubts 3x faster during exams. The AI explanations are incredibly clear.",
      rating: 5,
    },
    {
      id: "2",
      name: "Neha Verma",
      role: "CS Student",
      institution: "Punjab University",
      avatarUrl: "/avatars/neha.png",
      quote:
        "Everything is organized in one place. No more scrolling through endless chat groups.",
      rating: 5,
    },
    {
      id: "3",
      name: "Rohit Mehta",
      role: "Teaching Assistant",
      institution: "NIT Jalandhar",
      avatarUrl: "/avatars/rohit.png",
      quote:
        "Analytics help me quickly identify where students struggle the most.",
      rating: 5,
    },
    {
      id: "4",
      name: "Priya Singh",
      role: "MBA Student",
      institution: "IIM Indore",
      avatarUrl: "/avatars/priya.png",
      quote:
        "My exam preparation became much more efficient after switching to DoubtDesk.",
      rating: 5,
    },
    {
      id: "5",
      name: "Karan Gupta",
      role: "Engineering Student",
      institution: "PEC Chandigarh",
      avatarUrl: "/avatars/karan.png",
      quote:
        "Instant answers saved hours of searching through notes and forums.",
      rating: 5,
    },
    {
      id: "6",
      name: "Ananya Kapoor",
      role: "Professor",
      institution: "Chitkara University",
      avatarUrl: "/avatars/ananya.png",
      quote: "Managing classroom discussions has become significantly easier.",
      rating: 5,
    },
  ];

  const handleSignOut = async () => {
    await signOut({ redirectUrl: "/" });
  };

  return (
    <div
      className={`${inter.className} min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-50 flex flex-col selection:bg-blue-500/30 dark:selection:bg-[#5E8CFF]/30 transition-colors duration-500 overflow-x-hidden`}
    >
      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl animate-in fade-in-50 zoom-in-95 duration-200">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to sign out?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              You will need to log in again to access your classroom insights
              and doubt-solving history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all duration-200">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white border-none rounded-xl transition-all duration-200"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hero Section */}
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
              {/* Primary Header Typography */}
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
              {/* Description Subtext Stack */}
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
              {/* Call to Action Button Core Wrappers */}
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
            {/* Right Live Panel Graphic Column */}
            <div className="flex items-center justify-center xl:justify-end w-full pt-4 xl:pt-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 ease-out fill-mode-both">
              <div className="w-full max-w-md xl:max-w-full transition-transform duration-500 hover:scale-[1.01] rounded-[0.9rem]">
                <LiveCampusThreadPanel />
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          id="features"
          className="scroll-mt-20 px-4 sm:px-6 lg:px-8 py-20 relative z-10 border-t border-slate-200/60 dark:border-slate-900 bg-slate-100/40 dark:bg-black/20 transition-colors duration-500"
        >
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="max-w-3xl mx-auto text-center space-y-4">
              <div
                className={`${staatliches.className} text-sm tracking-[0.14em] text-blue-600 dark:text-blue-400 uppercase`}
              >
                Features
              </div>
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight transition-colors duration-300">
                Everything your classroom needs to solve doubts, stay aligned,
                and move faster.
              </h3>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed transition-colors duration-300">
                Built for modern study teams, DoubtDesk blends AI-powered doubt
                solving, shared resources, and smart classroom flows into a
                single polished platform.
              </p>
            </div>

            <div
              id="features-grid"
              className="grid gap-6 scroll-mt-20 sm:grid-cols-2 lg:grid-cols-3"
            >
              {features.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.slug}
                    id={`feature-${feature.slug}`}
                    style={{ animationDelay: `${i * 100}ms` }}
                    className="group relative scroll-mt-20 overflow-hidden rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-6 shadow-sm shadow-slate-200/60 dark:shadow-none hover:shadow-lg dark:hover:shadow-lg dark:hover:shadow-blue-500/10 hover:border-blue-300/60 dark:hover:border-blue-500/40 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shadow-inner transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-500/20">
                      <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                    </div>
                    <h4 className="mt-5 text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors duration-300">
                      {feature.title}
                    </h4>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-zinc-400 transition-colors duration-300">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works, Testimonials, etc. remain unchanged */}
        {/* How It Works Section */}
        <section
          id="how-it-works"
          className="scroll-mt-20 px-4 sm:px-6 lg:px-8 py-20 relative z-10 border-t border-slate-200/60 dark:border-zinc-900 transition-colors duration-500"
        >
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center space-y-3">
              <div
                className={`${staatliches.className} text-sm tracking-[0.14em] text-blue-600 dark:text-blue-400 uppercase`}
              >
                Process
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight transition-colors duration-300">
                How it works
              </h3>
              <p className="text-base text-slate-600 dark:text-zinc-400 max-w-md mx-auto transition-colors duration-300">
                Simple flow from doubt → solution → understanding
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-100 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 -z-10 transition-colors duration-300" />
              {howItWorks.map((step, index) => (
                <div
                  key={step.title}
                  style={{ animationDelay: `${index * 150}ms` }}
                  className="p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-900 bg-white dark:bg-zinc-950/40 backdrop-blur-sm hover:border-blue-400 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-all duration-500 flex flex-col items-center text-center space-y-4 group shadow-sm dark:shadow-none hover:shadow-lg hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-6 fill-mode-both"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 dark:bg-blue-500 text-white text-lg font-bold shadow-md shadow-blue-500/20 dark:shadow-blue-500/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500">
                    {index + 1}
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors duration-300">
                    {step.title}
                  </h4>
                  <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-400 transition-colors duration-300">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section
          id="testimonials"
          className="scroll-mt-20 px-4 sm:px-6 lg:px-8 py-20 relative z-10 border-t border-slate-200/60 dark:border-zinc-900 bg-slate-100/40 dark:bg-black/20 transition-colors duration-500"
        >
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="text-center space-y-3">
              <div
                className={`${staatliches.className} text-sm tracking-[0.14em] text-blue-600 dark:text-blue-400 uppercase`}
              >
                Testimonials
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight transition-colors duration-300">
                What students say
              </h3>
              <p className="text-base text-slate-600 dark:text-zinc-400 max-w-md mx-auto transition-colors duration-300">
                Real feedback from learners and educators
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t, index) => (
                <div
                  key={t.name}
                  style={{ animationDelay: `${index * 200}ms` }}
                  className="p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 backdrop-blur-md hover:border-blue-400 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900/60 transition-all duration-500 flex flex-col justify-between shadow-sm dark:shadow-none hover:shadow-xl hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-6 fill-mode-both"
                >
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed italic transition-colors duration-300">
                    “{t.quote}”
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800/60 flex flex-col">
                    <div className="text-slate-950 dark:text-slate-100 font-bold tracking-tight transition-colors duration-300">
                      {t.name}
                    </div>
                    <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 mt-0.5 transition-colors duration-300">
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
