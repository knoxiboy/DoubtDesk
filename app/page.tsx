"use client";

import { useState } from "react";
import { SignInButton, SignUpButton, SignedIn, SignedOut, useClerk } from "@clerk/nextjs";
import { Sparkles, FileText, Map, MessageCircle, FileEdit, ArrowRight, Mail, Linkedin, Github } from "lucide-react";
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

export default function Home() {
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut({ redirectUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col selection:bg-blue-500/30">
      {/* Navbar */}
      <header className="fixed w-full bg-slate-950/80 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              D
            </div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-purple-500">
              DoubtDesk
            </h1>
          </Link>

          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/rooms">
                <button className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold border border-white/10 transition-all">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all">
                  Join DoubtDesk
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <button
                onClick={() => setShowSignOutDialog(true)}
                className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-semibold border border-red-500/20 transition-colors"
              >
                Logout
              </button>
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
              You will need to log in again to access your career insights and roadmaps.
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
      <main className="flex-1 pt-24 mt-6 relative overflow-hidden">
        <section className="px-6 pb-12 relative z-10">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 text-blue-400 rounded-full text-sm font-medium mb-6 border border-blue-500/20 animate-fade-in backdrop-blur-md">
              <Sparkles className="w-4 h-4" />
              AI-Powered Career Intelligence
            </div>

            <h2 className="text-6xl md:text-8xl font-black text-white tracking-tight leading-[1.1] mb-6">
              Navigate Your Career with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
                Precision AI.
              </span>
            </h2>

            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              DoubtDesk is your personal AI career wingman. From resume analysis to custom learning roadmaps, we provide the tools you need to level up your professional life.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
              <SignedIn>
                <Link href="/rooms" className="w-full sm:w-auto">
                  <button className="group px-10 py-5 bg-blue-600 text-white rounded-2xl text-lg font-bold hover:bg-blue-700 hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all w-full flex items-center justify-center gap-2">
                    Open Classroom
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
              </SignedIn>
              <SignedOut>
                <SignUpButton mode="modal" forceRedirectUrl="/rooms">
                  <button className="group px-10 py-5 bg-white text-slate-950 rounded-2xl text-lg font-bold hover:bg-slate-200 transition-all w-50 flex items-center justify-center gap-2">
                    Get Started Free
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </SignUpButton>
              </SignedOut>
            </div>

          </div>
        </section>

        {/* Dynamic Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[150px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[150px] rounded-full"></div>
          <div className="absolute top-[30%] right-[10%] w-[30%] h-[30%] bg-cyan-600/10 blur-[120px] rounded-full"></div>

          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        </div>
      </main>

      {/* Features Section */}
      <section className="px-6 py-20 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Resume Analysis</h3>
              <p className="text-slate-400 leading-relaxed">Get instant feedback on your resume with AI-powered analysis and personalized improvement suggestions.</p>
            </div>

            <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Map className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Learning Roadmaps</h3>
              <p className="text-slate-400 leading-relaxed">Get personalized learning paths tailored to your career goals and current skill level.</p>
            </div>

            <div className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all group">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Doubt Resolution</h3>
              <p className="text-slate-400 leading-relaxed">Stuck on a concept? Get clear explanations from our AI tutor trained on educational content.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950/50 py-5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">D</div>
            <span className="font-bold text-white">DoubtDesk</span>
          </div>
          <p className="text-sm">© 2026 DoubtDesk. Engineered for Excellence.</p>
          <div className="flex items-center gap-6">
            <a href="mailto:divysaxena2402@gmail.com" className="hover:text-blue-400 transition-colors" aria-label="Email">
              <Mail className="w-5 h-5" />
            </a>
            <a href="https://linkedin.com/in/divyasaxena24/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors" aria-label="LinkedIn">
              <Linkedin className="w-5 h-5" />
            </a>
            <a href="https://github.com/knoxiboy" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors" aria-label="GitHub">
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}