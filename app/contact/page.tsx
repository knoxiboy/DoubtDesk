import ContactForm from "@/components/ContactForm";

export const metadata = {
  title: "Contact",
  description: "Contact the DoubtDesk team — report bugs, request features, or ask questions.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden transition-colors duration-300">
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/20 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-400/10 dark:bg-cyan-500/10 blur-3xl rounded-full" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 dark:border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm mb-6">
            Reach out — we're happy to help
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-4">
            Contact{' '}
            <span className="bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 bg-clip-text text-transparent">
              DoubtDesk
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-slate-600 dark:text-slate-300 text-lg md:text-xl leading-relaxed">
            Have a question, bug report, or suggestion? Use the form below or choose an alternate contact method.
          </p>
        </section>

        <ContactForm />
      </div>
    </div>
  );
}
