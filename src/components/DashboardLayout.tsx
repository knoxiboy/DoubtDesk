"use client";

import { useState } from "react";
import { SignedIn, UserButton, useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Menu, LogOut, User } from "lucide-react";
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
import NotificationBell from "@/components/NotificationBell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  const { signOut } = useClerk();
  const pathname = usePathname();

  const pageInfo: Record<
    string,
    { title: string; description: string }
  > = {
    "/dashboard": {
      title: "Dashboard",
      description: "Welcome back to DoubtDesk",
    },
    "/rooms": {
      title: "Virtual Campus",
      description: "Collaborate and learn with your campus community",
    },
    "/public-rooms": {
      title: "Public Doubts",
      description: "Explore and solve doubts with the community",
    },
    "/bookmarks": {
      title: "Bookmarks",
      description: "Your saved doubts and threads",
    },
    "/ask-ai": {
      title: "AI Solver",
      description: "Ask questions to the AI assistant",
    },
    "/profile": {
      title: "Profile",
      description: "Manage your user profile and settings",
    },
  };

  const currentPage =
    Object.entries(pageInfo).find(([route]) => pathname.startsWith(route))?.[1] ||
    pageInfo["/dashboard"];

  const handleSignOut = async () => {
    await signOut({ redirectUrl: "/" });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-black text-slate-900 dark:text-zinc-100 transition-colors duration-500">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex flex-1 min-w-0 flex-col relative z-10">
        <header className="sticky top-0 z-20 flex h-16 md:h-20 shrink-0 items-center border-b border-slate-100 dark:border-zinc-900/60 bg-white/80 dark:bg-black/80 backdrop-blur-xl transition-colors duration-500">
          <div className="flex flex-1 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all duration-300"
                aria-label="Open sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="hidden md:flex flex-col">
                <h1 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {currentPage.title}
                </h1>
                <p className="text-xs font-medium text-slate-400 dark:text-zinc-500">
                  {currentPage.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-4">

              <SignedIn>
                <div className="flex items-center gap-3">
                  <NotificationBell />
                </div>
              </SignedIn>
            </div>
          </div>
        </header>

        <AlertDialog
          open={showSignOutDialog}
          onOpenChange={setShowSignOutDialog}
        >
          <AlertDialogContent className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-900 text-slate-900 dark:text-zinc-100 rounded-2xl max-w-sm p-6 shadow-2xl">
            <AlertDialogHeader className="space-y-2">
              <AlertDialogTitle className="text-xl font-bold tracking-tight">
                Are you sure you want to sign out?
              </AlertDialogTitle>

              <AlertDialogDescription className="text-slate-500 dark:text-zinc-400 text-xs font-medium leading-relaxed">
                You will need to log in again to access your dashboard and AI tools.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter className="gap-2 pt-2">
              <AlertDialogCancel className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-xl font-bold text-xs uppercase tracking-wider py-2.5">
                Cancel
              </AlertDialogCancel>

              <AlertDialogAction
                onClick={handleSignOut}
                className="border-none bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider py-2.5 shadow-md shadow-red-600/10 transition-all"
              >
                Sign Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <main className="flex-1 overflow-y-auto bg-slate-50/30 dark:bg-zinc-950/10 scrollbar-none transition-colors duration-500">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}