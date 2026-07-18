import ContactForm from "@/components/marketing/ContactForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export const metadata = {
  title: "Contact",
  description: "Contact the DoubtDesk team — report bugs, request features, or ask questions.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 overflow-hidden transition-colors duration-500 relative">
      {/* Decorative Aurora Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[300px] bg-gradient-to-b from-blue-500/10 dark:from-blue-500/5 to-transparent blur-3xl pointer-events-none z-0" />
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-7xl px-6 z-20 flex justify-end">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white backdrop-blur-md shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <section className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent border border-border text-accent-foreground text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
            Reach out — we&apos;re happy to help
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-tight">
            Contact{" "}
            <span className="text-primary">
              DoubtDesk
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-muted-foreground text-sm font-medium leading-relaxed">
            Have a question, bug report, or suggestion? Use the form below or choose an alternate contact method.
          </p>
        </section>

        <ContactForm />
      </div>
    </div>
  );
}