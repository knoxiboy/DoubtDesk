import ContactForm from "@/components/ContactForm";

export const metadata = {
  title: "Contact",
  description: "Contact the DoubtDesk team — report bugs, request features, or ask questions.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-zinc-100 overflow-hidden transition-colors duration-500">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/10 dark:from-purple-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 dark:bg-emerald-500/[0.02] blur-[120px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <section className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/5 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest backdrop-blur-sm">
            Reach out — we&apos;re happy to help
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
            Contact{" "}
            <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              DoubtDesk
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-slate-500 dark:text-zinc-400 text-sm font-medium leading-relaxed">
            Have a question, bug report, or suggestion? Use the form below or choose an alternate contact method.
          </p>
        </section>

        <ContactForm />
      </div>
    </div>
  );
}