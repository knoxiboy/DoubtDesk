import { howItWorks } from "./landingContent";

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 px-4 sm:px-6 lg:px-8 py-20 relative z-10 border-t border-slate-200/60 dark:border-zinc-900 transition-colors duration-500"
    >
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-3">
          <div className="text-sm tracking-[0.14em] text-blue-600 dark:text-blue-400 uppercase">
            Process
          </div>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight transition-colors duration-300">
            How it works
          </h3>
          <p className="text-base text-slate-600 dark:text-zinc-400 max-w-md mx-auto transition-colors duration-300">
            Simple flow from doubt → solution → understanding
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-blue-100 via-indigo-100 to-blue-100 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 -z-10 transition-colors duration-300" />

          {howItWorks.map((step, index) => (
            <div
              key={step.title}
              style={{ animationDelay: `${index * 150}ms` }}
              className="p-6 rounded-3xl border border-slate-200/80 dark:border-zinc-900 bg-white dark:bg-zinc-950/40 backdrop-blur-sm hover:border-blue-400 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition-all duration-500 flex flex-col items-center text-center space-y-4 group shadow-sm dark:shadow-none hover:shadow-lg hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-6 fill-mode-both"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 dark:bg-blue-500 text-white text-lg font-bold shadow-md shadow-blue-500/20 dark:shadow-blue-500/10 transition-all duration-500 group-hover:scale-110 group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500">
                {index + 1}
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors duration-300">
                {step.title}
              </h4>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-400 transition-colors duration-300">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

