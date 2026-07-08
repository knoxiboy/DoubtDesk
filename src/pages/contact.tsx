import ContactForm from "@/components/marketing/ContactForm";

export const metadata = {
  title: "Contact",
  description: "Contact the DoubtDesk team — report bugs, request features, or ask questions.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 overflow-hidden transition-colors duration-500 relative">
      {/* Decorative Aurora Gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[300px] bg-gradient-to-b from-blue-500/10 dark:from-blue-500/5 to-transparent blur-3xl pointer-events-none z-0" />

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