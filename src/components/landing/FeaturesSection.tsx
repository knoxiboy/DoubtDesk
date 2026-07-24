import { features } from "./landingContent";
import { Staatliches } from "next/font/google";

const staatliches = Staatliches({ weight: "400", subsets: ["latin"] });

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-20 px-4 sm:px-6 lg:px-8 py-20 relative z-10 border-t border-slate-200/60 dark:border-slate-900 bg-slate-100/40 dark:bg-black/20 transition-colors duration-500"
    >
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div
            className={`${staatliches.className} text-sm tracking-[0.14em] text-blue-600 dark:text-blue-400 uppercase`}
          >
            Features
          </div>
          <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight leading-tight transition-colors duration-300">
            Everything your classroom needs to solve doubts, stay aligned,
            and move faster.
          </h3>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed transition-colors duration-300">
            Built for modern study teams, DoubtDesk blends AI-powered doubt
            solving, shared resources, and smart classroom flows into a
            single polished platform.
          </p>
        </div>

        <div
          id="features-grid"
          className="grid gap-6 scroll-mt-20 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.slug}
                id={`feature-${feature.slug}`}
                style={{ animationDelay: `${i * 100}ms` }}
                className="group relative scroll-mt-20 overflow-hidden rounded-3xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/40 p-6 shadow-sm shadow-slate-200/60 dark:shadow-none hover:shadow-lg dark:hover:shadow-lg dark:hover:shadow-blue-500/10 hover:border-blue-300/60 dark:hover:border-blue-500/40 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shadow-inner transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-500/20">
                  <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <h4 className="mt-5 text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors duration-300">
                  {feature.title}
                </h4>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-zinc-400 transition-colors duration-300">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

