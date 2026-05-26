"use client";

import { useState, useEffect } from "react";
import {
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
import { ThemeToggle } from "@/components/ThemeToggle";
import ShapeGrid from "@/components/ShapeGrid";
import { Inter, Staatliches } from "next/font/google";
import LiveCampusThreadPanel from "@/components/LiveCampusThreadPanel";

const inter = Inter({ subsets: ["latin"] });
const staatliches = Staatliches({ weight: "400", subsets: ["latin"] });

export default function Home() {
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
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
  const { signOut } = useClerk();

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

  const handleSignOut = async () => {
    await signOut({ redirectUrl: '/' });
  };

  return (
    <div className={`${inter.className} min-h-screen bg-background text-foreground flex flex-col selection:bg-[#5E8CFF]/30 transition-colors duration-300`}>
      {/* Navbar */}
      <header className="sticky inset-x-0 top-0 z-50 bg-background/88 supports-[backdrop-filter]:bg-background/72 backdrop-blur-xl overflow-visible transition-colors duration-300">
        <div className="absolute inset-x-0 bottom-0 h-px bg-border shadow-[0_0_10px_rgba(139,184,255,0.18)]" />
        <div className="max-w-7xl mx-auto h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 md:px-[clamp(24px,5vw,64px)]">
          <Link href="/" className="flex items-center gap-1 sm:gap-2 hover:opacity-90 transition-opacity shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_rgba(94,140,255,0.25)] ring-1 ring-[#AABFFF]/35">
              <img src="/logo.png" alt="DoubtDesk logo" className="h-5 w-5 object-contain" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground transition-colors drop-shadow-[0_0_10px_rgba(170,191,255,0.15)]">
              DoubtDesk
            </h1>
          </Link>

          <div className="hidden sm:flex items-center gap-3">
            <button
            onClick={()=> {
              document.getElementById("features")
              ?.scrollIntoView({ behavior:"smooth"});
            }}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all duration-300 hover:text-blue-600 dark:hover:text-[#AABFFF] hover:drop-shadow-[0_0_8px_rgba(170,191,255,0.2)]"
            >
              Features
            </button>
            <button
              onClick={()=> {
              document.getElementById("how-it-works")
              ?.scrollIntoView({ behavior:"smooth"});
            }}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all duration-300 hover:text-blue-600 dark:hover:text-[#AABFFF] hover:drop-shadow-[0_0_8px_rgba(170,191,255,0.2)] "
            >
              How It Works
            </button>
            <button
              onClick={()=> {
              document.getElementById("testimonials")
              ?.scrollIntoView({ behavior:"smooth"});
            }}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all duration-300 hover:text-blue-600 dark:hover:text-[#AABFFF] hover:drop-shadow-[0_0_8px_rgba(170,191,255,0.2)]"
            >
              Testimonial
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <SignedOut>
              <Link href="/sign-in">
                <button className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white rounded-xl text-sm font-semibold border border-slate-200 dark:border-white/10 transition-all hover:shadow-[0_0_16px_rgba(255,255,255,0.08)]">
                  Sign In
                </button>
              </Link>

              <Link href="/sign-up">
                <button className="px-5 py-2.5 bg-[#5E8CFF] hover:bg-[#8BB8FF] text-white rounded-xl text-sm font-semibold shadow-[0_0_14px_rgba(94,140,255,0.28)] transition-all">
                  Join DoubtDesk
                </button>
              </Link>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-4">
                <Link href="/rooms" className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                  Classrooms
                </Link>
                <Link href="/profile" className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
                  Profile
                </Link>
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-10 h-10 border border-white/20 shadow-sm"
                    }
                  }}
                />
              </div>
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              You will need to log in again to access your classroom insights and doubt-solving history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white border-none"
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                with{' '}
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
                <SignedIn>
                  <Link href="/rooms" className="w-full sm:w-auto">
                    <button className="group min-w-[15rem] px-8 py-7.5 bg-white text-slate-950 rounded-[1.15rem] text-base font-bold border border-slate-200/80 shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:bg-slate-100 hover:border-slate-300 transition-all w-full flex items-center justify-center gap-2">
                      <span className={`${staatliches.className} uppercase tracking-[0.08em]`}>Open Classroom</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                </SignedIn>
                <SignedOut>
                  <Link href="/sign-up" className="w-full sm:w-auto">
                    <button className="group min-w-[15rem] px-8 py-4.5 bg-white text-slate-950 rounded-[1.15rem] text-base font-bold border border-slate-200/80 shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:bg-slate-100 hover:border-slate-300 transition-all w-full sm:w-auto flex items-center justify-center gap-2">
                      <span className={`${staatliches.className} uppercase tracking-[0.08em]`}>Open Classroom</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                </SignedOut>
              </div>
            </div>

            <div className="flex items-center justify-center xl:justify-end xl:pt-16">
              {/* Replace or enhance the right-side card with the new Live Campus Thread panel */}
              <LiveCampusThreadPanel />
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

            <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F2F5FF]">
              How it works
            </h3>

            <p className="mt-4 text-slate-700 dark:text-slate-300/80">
              Simple flow from doubt → solution → understanding
            </p>

            <div className="mt-12 grid md:grid-cols-3 gap-6">
              {howItWorks.map((step, index) => (
                <div
                  key={step.title}
                  className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] backdrop-blur-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
                >
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#5E8CFF] text-white flex items-center justify-center font-bold shadow-[0_0_18px_rgba(94,140,255,0.45)] ring-1 ring-[#8BB8FF]/40">
                    {index + 1}
                  </div>

                  <h4 className="text-lg font-semibold text-slate-900 dark:text-[#F2F5FF]">
                    {step.title}
                  </h4>

                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-300/80">
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
            <div className={`${staatliches.className} mb-4 text-sm tracking-[0.16em] text-blue-700 dark:text-[#AABFFF]/70 uppercase`}>
              Testimonials
            </div>
            <h3 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-[#F2F5FF]">
              What students say
            </h3>

            <p className="mt-4 text-slate-700 dark:text-slate-300/80">
              Real feedback from learners and educators
            </p>

            <div className="mt-12 grid md:grid-cols-3 gap-6 text-left">
              {testimonials.map((t) => (
                <div
                  key={t.name}
                  className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] backdrop-blur-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
                >
                  <p className="text-slate-700 dark:text-slate-300/80 text-sm leading-7">
                    “{t.text}”
                  </p>

                  <div className="mt-5">
                    <div className="text-slate-900 dark:text-[#F2F5FF] font-semibold">
                      {t.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>
      </main>
      {/*Here's Your Previous Footer. I have just commented it in case */}
      {/* Scroll to Top Button */}
      {scrollProgress > 5 && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
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
      )}
      {/* Footer
      <footer className="border-t border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-950/50 py-5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500 dark:text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-slate-900 dark:text-white font-bold text-sm">D</div>
            <span className="font-bold text-slate-900 dark:text-white">DoubtDesk</span>
          </div>
          <p className="text-sm">© 2026 DoubtDesk. Engineered for Excellence.</p>
          <div className="flex items-center gap-6">
            <a href="mailto:divysaxena2402@gmail.com" className="hover:text-blue-400 transition-colors" title="Email">
              <Mail className="w-5 h-5" />
            </a>
            <a href="https://linkedin.com/in/divyasaxena24/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors" title="LinkedIn">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="https://github.com/divysaxena24" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors" title="GitHub">
              <Github className="w-5 h-5" />
            </a>
          </div>
          <div className="flex gap-6 text-sm">
          </div>
        </div>
      </footer> */}
    </div>
  );
}
