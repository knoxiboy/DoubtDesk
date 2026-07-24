"use client";

import { useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import {
  Inter,
  // Keeping only Inter here since other sections use their own fonts.
  // (Next/font modules are safe to instantiate per component.)
} from "next/font/google";

import ScrollToTopButton from "@/components/layout/ScrollToTopButton";
import { scrollToSection } from "@/lib/utils/scroll-to-section";

import SignOutDialog from "@/components/landing/SignOutDialog";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const { signOut } = useClerk();

  useEffect(() => {
    const scrollFromHash = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      requestAnimationFrame(() =>
        scrollToSection(hash, { updateHash: false })
      );
    };

    scrollFromHash();
    window.addEventListener("hashchange", scrollFromHash);
    return () => window.removeEventListener("hashchange", scrollFromHash);
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirectUrl: "/" });
  };

  return (
    <div
      className={`${inter.className} min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-50 flex flex-col selection:bg-blue-500/30 dark:selection:bg-[#5E8CFF]/30 transition-colors duration-500 overflow-x-hidden`}
    >
      <SignOutDialog
        open={showSignOutDialog}
        onOpenChange={setShowSignOutDialog}
        onSignOut={handleSignOut}
      />

      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />

      <ScrollToTopButton />
    </div>
  );
}

