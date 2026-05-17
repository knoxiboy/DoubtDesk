"use client";

import { useState } from "react";
import { SignInButton, SignUpButton, SignedIn, SignedOut, useClerk, UserButton } from "@clerk/nextjs";
import { FileText, Map, MessageCircle, FileEdit, ArrowRight, Mail, Linkedin, Github } from "lucide-react";
import Link from "next/link";
import { Inter, Staatliches, IBM_Plex_Mono } from "next/font/google";
import ShapeGrid from "@/components/ShapeGrid";
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

const inter = Inter({ subsets: ["latin"] });
const staatliches = Staatliches({ subsets: ["latin"], weight: "400" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"] });

export default function Home() {
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut({ redirectUrl: '/' });
  };

  return (
    <div className={`${inter.className} min-h-screen bg-background text-foreground flex flex-col selection:bg-[#5E8CFF]/30 transition-colors duration-300`}>
      {/* Navbar */}
      <header className="fixed inset-x-0 top-0 z-50 bg-background/88 supports-[backdrop-filter]:bg-background/72 backdrop-blur-xl relative overflow-visible transition-colors duration-300">
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

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <SignedOut>
              <div className="flex items-center gap-3">
                <SignInButton mode="modal" forceRedirectUrl="/rooms">
                  <button className="group relative overflow-hidden px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-white/10 bg-white/[0.04]
                          backdrop-blur-md text-white font-semibold text-sm tracking-wide transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 hover:shadow-[0_0_24px_rgba(255,255,255,0.08)] hover:-translate-y-0.5
                          active:scale-[0.98]">
                      {/* Glow Effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-white/0 via-white/10 to-white/0 blur-xl" />

                      <span className="relative z-10 flex items-center gap-2">
                        Sign In
                      </span>
                  </button>
                </SignInButton>

                <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="group relative overflow-hidden px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#5E8CFF] to-[#7AA2FF] text-white
                          text-sm font-semibold tracking-wide transition-all duration-300 shadow-[0_0_18px_rgba(94,140,255,0.30)] hover:shadow-[0_0_30px_rgba(94,140,255,0.50)]
                          hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[0.98]">
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                          transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-12"/>
                    <div className="absolute inset-0 bg-[#8BB8FF]/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <span className="relative z-10 flex items-center gap-2">
                      Join DoubtDesk
                      <span className="transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
                    </span>
                  </button>
                </SignUpButton>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-4">
                <Link href="/rooms" className="hidden sm:block px-4 py-2 text-sm font-semibold text-slate-400 hover:text-[#AABFFF] transition-all hover:drop-shadow-[0_0_8px_rgba(170,191,255,0.2)]">
                  Classrooms
                </Link>
                <Link href="/profile" className="hidden sm:block px-4 py-2 text-sm font-semibold text-slate-400 hover:text-[#AABFFF] transition-all hover:drop-shadow-[0_0_8px_rgba(170,191,255,0.2)]">
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
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              You will need to log in again to access your classroom insights and doubt-solving history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
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
      <main className="flex-1 pt-[128px] relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <ShapeGrid
            speed={0.45}
            squareSize={42}
            direction="diagonal"
            borderColor="rgba(139, 184, 255, 0.10)"
            hoverFillColor="rgba(94, 140, 255, 0.2)"
            shape="square"
            hoverTrailAmount={5}
            className="opacity-90"
          />
          <div className="absolute inset-0 bg-[#020617]/36" />
        </div>
        <section className="px-6 pb-12 relative z-10 pt-3 md:pt-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-12 xl:gap-16 items-start">
            <div className="text-left">
              <h2 className="max-w-[12ch] text-4xl sm:text-5xl lg:text-6xl xl:text-[4.2rem] font-black text-[#F2F5FF] tracking-tight leading-[1.04] mb-6">
                Empower <br />
                Your Learning <br />
                with{' '}
                <span className={`${staatliches.className} uppercase tracking-[0.08em] text-[#8BB8FF] drop-shadow-[0_0_10px_rgba(120,184,255,0.56)]`}>
                  Collaborative AI.
                </span>
              </h2>

              <div className="max-w-2xl mb-10">
                <div className={`${staatliches.className} mb-3 text-sm tracking-[0.16em] text-[#AABFFF]/80 uppercase`}>
                  Collaborative classrooms
                </div>
                <p className="text-xl text-slate-300/90 leading-relaxed">
                  Built for collaborative classrooms, instant doubt solving, and smarter learning.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                <SignedIn>
                  <Link href="/rooms" className="w-full sm:w-auto">
                    <button className="group px-10 py-5 bg-[#5E8CFF] text-white rounded-2xl text-lg font-bold hover:bg-[#8BB8FF] hover:shadow-[0_0_24px_rgba(94,140,255,0.35)] transition-all w-full flex items-center justify-center gap-2">
                      <span className={`${staatliches.className} uppercase tracking-[0.08em]`}>Open Classroom</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                </SignedIn>
                <SignedOut>
                  <SignUpButton mode="modal" forceRedirectUrl="/rooms">
                    <button className="group px-10 py-5 bg-white text-slate-950 rounded-2xl text-lg font-bold hover:bg-slate-200 transition-all w-full sm:w-auto flex items-center justify-center gap-2">
                      <span className={`${staatliches.className} uppercase tracking-[0.08em]`}>Open Classroom</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </SignUpButton>
                </SignedOut>
              </div>
            </div>

            <div className="pt-2 xl:pt-3">
              <div className={`${staatliches.className} mb-6 text-sm tracking-[0.16em] text-[#AABFFF]/40 uppercase`}>
                Live campus feed
              </div>
              <div className={`${ibmPlexMono.className} space-y-4 text-base sm:text-lg text-slate-200/85`}>
                <div className="flex items-start gap-3">
                  <span className="text-[#AABFFF]/85 font-semibold">&gt;</span>
                  <p><span className="text-[#8BB8FF]">23</span> students discussing Operating Systems</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#AABFFF]/85 font-semibold">&gt;</span>
                  <p><span className="text-[#8BB8FF]">12</span> new notes uploaded</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#AABFFF]/85 font-semibold">&gt;</span>
                  <p><span className="text-[#8BB8FF]">4</span> active placement roadmaps</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
{/*Here's Your Previous Footer. I have just commented it in case */}
      {/* Footer
      <footer className="border-t border-white/5 bg-slate-950/50 py-5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">D</div>
            <span className="font-bold text-white">DoubtDesk</span>
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
