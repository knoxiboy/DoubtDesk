"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname === "/dashboard";

  return (
    <>
      {!isDashboard && <Header />}
      <main className="flex-1">
        {children}
      </main>
      {!isDashboard && <Footer />}
    </>
  );
}