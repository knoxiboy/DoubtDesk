import { testimonials } from "./landingContent";

export default function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="scroll-mt-20 px-4 sm:px-6 lg:px-8 py-20 relative z-10 border-t border-slate-200/60 dark:border-zinc-900 bg-slate-100/40 dark:bg-black/20 transition-colors duration-500"
    >
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-3">
          <div className="text-sm tracking-[0.14em] text-blue-600 dark:text-blue-400 uppercase">
            Testimonials
          </div>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight transition-colors duration-300">
            What students say
          </h3>
          <p className="text-base text-slate-600 dark:text-zinc-400 max-w-md mx-auto transition-colors duration-300">
            Real feedback from learners and educators
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, index) => (
            <div
              key={t.name}
              style={{ animationDelay: `${index * 200}ms` }}
              className="p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 backdrop-blur-md hover:border-blue-400 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900/60 transition-all duration-500 flex flex-col justify-between shadow-sm dark:shadow-none hover:shadow-xl hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-6 fill-mode-both"
            >
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed italic transition-colors duration-300">
                “{t.quote}”
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800/60 flex flex-col">
                <div className="text-slate-950 dark:text-slate-100 font-bold tracking-tight transition-colors duration-300">
                  {t.name}
                </div>
                <div className="text-xs font-medium text-slate-400 dark:text-zinc-500 mt-0.5 transition-colors duration-300">
                  {t.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

