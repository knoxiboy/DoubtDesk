import Link from "next/link";
import {
  BrainCircuit,
  Users,
  ShieldCheck,
  BarChart3,
  Globe,
  Sparkles,
  ArrowRight,
  Github,
} from "lucide-react";

const features = [
  {
    title: "AI Doubt Solver",
    description:
      "Get instant step-by-step explanations for academic doubts using powerful AI models.",
    icon: BrainCircuit,
  },
  {
    title: "Virtual Classrooms",
    description:
      "Create and join collaborative classrooms with dedicated doubt-solving channels.",
    icon: Users,
  },
  {
    title: "Classroom Analytics",
    description:
      "Track weak topics, activity trends, and student engagement with smart analytics.",
    icon: BarChart3,
  },
  {
    title: "Safe Learning Space",
    description:
      "AI-powered moderation keeps discussions academic, respectful, and productive.",
    icon: ShieldCheck,
  },
  {
    title: "Community Discussions",
    description:
      "Students and teachers can collaboratively solve doubts and share insights.",
    icon: Globe,
  },
  {
    title: "Modern Learning Experience",
    description:
      "Fast, responsive, and beautifully designed platform optimized for every device.",
    icon: Sparkles,
  },
];

const techStack = [
  "Next.js",
  "TypeScript",
  "Tailwind CSS",
  "Clerk",
  "Groq AI",
  "Neon PostgreSQL",
  "Drizzle ORM",
  "shadcn/ui",
  "KaTeX",
  "Inngest",
];

export const metadata = {
  title: "About",
  description: "Learn more about DoubtDesk - an AI-powered educational platform.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-hidden transition-colors duration-300">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/20 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-400/10 dark:bg-cyan-500/10 blur-3xl rounded-full" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        {/* Hero Section */}
        <section className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/20 dark:border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            AI-Powered Collaborative Learning Platform
          </div>

          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            About{" "}
            <span className="bg-gradient-to-r from-blue-500 via-cyan-500 to-indigo-500 bg-clip-text text-transparent">
              DoubtDesk
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-slate-600 dark:text-slate-300 text-lg md:text-xl leading-relaxed">
            DoubtDesk helps students solve academic doubts instantly using AI,
            collaborative classrooms, and interactive learning tools — while
            giving teachers deeper insights into classroom learning patterns.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <Link
              href="/sign-up"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:scale-105 transition-all duration-300 font-medium text-white shadow-lg shadow-blue-500/20"
            >
              Get Started
            </Link>

            <Link
              href="/faq"
              className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all duration-300 font-medium"
            >
              Explore FAQs
            </Link>
          </div>
        </section>

        {/* Mission Section */}
        <section className="mb-24">
          <div className="grid lg:grid-cols-2 gap-10">
            <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-white/5 backdrop-blur-xl shadow-sm dark:shadow-none">
              <h2 className="text-3xl font-bold mb-5">Our Mission</h2>

              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg">
                Many students hesitate to ask doubts in classrooms, and existing
                discussion platforms often become chaotic or inaccessible.
                DoubtDesk aims to bridge this gap by combining AI-powered doubt
                solving with structured classroom collaboration.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-blue-200 dark:border-slate-800 bg-gradient-to-br from-blue-100/70 to-cyan-100/70 dark:from-blue-500/10 dark:to-cyan-500/10 backdrop-blur-xl shadow-sm dark:shadow-none">
              <h2 className="text-3xl font-bold mb-5">Our Vision</h2>

              <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-lg">
                We envision a future where every student has instant access to
                personalized academic support, regardless of location, language,
                or classroom limitations.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mb-24">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold mb-4">Key Features</h2>

            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Everything students and teachers need for smarter collaborative
              learning.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="group p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-white/5 backdrop-blur-xl hover:border-blue-500/50 dark:hover:border-cyan-400/60 hover:-translate-y-2 hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-cyan-500/20 transition-all duration-300"  >
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
                    <Icon className="w-7 h-7 text-blue-500 dark:text-blue-400" />
                  </div>

                  <h3 className="text-xl font-semibold mb-3">
                    {feature.title}
                  </h3>

                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tech Stack */}
        <section className="mb-24">
          <div className="p-10 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-white/5 backdrop-blur-xl shadow-sm dark:shadow-none">
            <h2 className="text-4xl font-bold text-center mb-10">
              Built With Modern Technologies
            </h2>

            <div className="flex flex-wrap justify-center gap-4">
              {techStack.map((tech) => (
                <div
                  key={tech}
                 className="px-5 py-3 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 hover:border-blue-500/50 dark:hover:border-cyan-400/60 hover:text-blue-600 dark:hover:text-cyan-300 hover:-translate-y-1 hover:shadow-md hover:shadow-blue-500/10 dark:hover:shadow-cyan-500/20 transition-all duration-300"      >
                  {tech}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Open Source Section */}
        <section className="mb-24">
          <div className="relative overflow-hidden p-10 rounded-3xl border border-blue-200 dark:border-blue-500/20 bg-gradient-to-br from-blue-100/70 to-cyan-100/70 dark:from-blue-500/10 dark:to-cyan-500/10 backdrop-blur-xl shadow-sm dark:shadow-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_40%)]" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-sm mb-6">
                <Github className="w-4 h-4" />
                Open Source & Community Driven
              </div>

              <h2 className="text-4xl font-bold mb-5">
                Built By Contributors, For Students
              </h2>

              <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed max-w-3xl mb-8">
                DoubtDesk is an open-source platform actively improved by
                contributors and developers through collaborative community
                efforts. We believe accessible education technology should be
                open, inclusive, and continuously evolving.
              </p>

              <Link
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-semibold hover:scale-105 transition-all duration-300"
              >
                View GitHub Repository
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-center">
          <div className="p-10 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-white/5 backdrop-blur-xl shadow-sm dark:shadow-none">
            <h2 className="text-4xl font-bold mb-5">
              Built for Students & Teachers Everywhere
            </h2>

            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg mb-8">
              Join the growing community of learners, contributors, and educators
              building the future of collaborative AI-powered education.
            </p>

            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:scale-105 transition-all duration-300 font-semibold text-white shadow-lg shadow-blue-500/20"
            >
              Join DoubtDesk
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}