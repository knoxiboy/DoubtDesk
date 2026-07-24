"use client";

import Link from "next/link";
import {
  ChevronLeft,
  Github,
  Shield,
  Users,
  BookOpen,
  Lightbulb,
  Flag,
  Scale,
} from "lucide-react";

const sections = [
  { id: "code-of-conduct", label: "Code of Conduct", icon: Shield },
  { id: "platform-guidelines", label: "Platform Guidelines", icon: BookOpen },
  { id: "academic-integrity", label: "Academic Integrity", icon: Scale },
  { id: "contributing", label: "Contributing", icon: Users },
  { id: "ai-usage", label: "AI Usage", icon: Lightbulb },
  { id: "reporting", label: "Reporting & Enforcement", icon: Flag },
];

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Back to DoubtDesk</span>
          </Link>

          <a
            href="https://github.com/knoxiboy/DoubtDesk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-all text-sm font-medium border border-slate-200 dark:border-zinc-700"
          >
            <Github className="w-4 h-4" />
            Star on GitHub
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 mb-6">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold tracking-tighter text-slate-900 dark:text-white mb-4">
            Community Guidelines
          </h1>
          <p className="text-xl text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Together, we build a respectful, collaborative, and intellectually
            honest learning environment powered by AI.
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="flex flex-wrap gap-3 mb-16 justify-center">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-blue-500 rounded-2xl text-sm font-medium transition-all hover:shadow-md"
              >
                <Icon className="w-4 h-4 text-blue-600" />
                {section.label}
              </a>
            );
          })}
        </div>

        {/* Code of Conduct */}
        <section id="code-of-conduct" className="mb-24 scroll-mt-20">
          <div className="flex items-center gap-4 mb-8">
            <Shield className="w-9 h-9 text-blue-600" />
            <h2 className="text-3xl font-semibold tracking-tight">
              Code of Conduct
            </h2>
          </div>
          <div className="prose dark:prose-invert max-w-none prose-slate prose-headings:font-semibold prose-p:text-slate-600 dark:prose-p:text-zinc-400">
            <p className="text-lg leading-relaxed">
              We pledge to make participation in the DoubtDesk community a
              harassment-free experience for everyone.
            </p>

            <h3>Our Standards</h3>
            <div className="grid md:grid-cols-2 gap-8 mt-8">
              <div className="bg-green-50 dark:bg-emerald-950/50 border border-green-200 dark:border-emerald-900 p-6 rounded-2xl">
                <h4 className="font-semibold text-green-700 dark:text-emerald-400 mb-3">
                  ✅ Positive Behaviors
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>• Using welcoming and inclusive language</li>
                  <li>• Being respectful of differing viewpoints</li>
                  <li>• Gracefully accepting constructive criticism</li>
                  <li>• Focusing on collective learning</li>
                  <li>• Showing empathy and support</li>
                </ul>
              </div>

              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 p-6 rounded-2xl">
                <h4 className="font-semibold text-red-700 dark:text-red-400 mb-3">
                  ❌ Unacceptable Behaviors
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>• Harassment, discrimination, or hate speech</li>
                  <li>• Sexualized language or advances</li>
                  <li>• Trolling, insults, or personal attacks</li>
                  <li>• Sharing private information without consent</li>
                  <li>• Disruptive or harmful conduct</li>
                </ul>
              </div>
            </div>

            <p className="mt-8">
              This Code of Conduct applies across all DoubtDesk spaces including
              the platform, GitHub, Discord, and any official representation of
              the project.
            </p>
          </div>
        </section>

        {/* Platform Guidelines */}
        <section id="platform-guidelines" className="mb-24 scroll-mt-20">
          <div className="flex items-center gap-4 mb-8">
            <BookOpen className="w-9 h-9 text-blue-600" />
            <h2 className="text-3xl font-semibold tracking-tight">
              Platform Guidelines
            </h2>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <ul className="space-y-6 text-lg">
              <li>
                <strong>Be Respectful:</strong> Treat every member with
                courtesy. Constructive criticism is welcome; personal attacks
                are not.
              </li>
              <li>
                <strong>Stay On Topic:</strong> Keep discussions relevant to the
                classroom, subject, or doubt being solved.
              </li>
              <li>
                <strong>No Spam:</strong> Avoid repetitive messages,
                self-promotion, or irrelevant links.
              </li>
              <li>
                <strong>Protect Privacy:</strong> Do not share personal
                information of others without explicit permission.
              </li>
              <li>
                <strong>Use Appropriate Language:</strong> Maintain professional
                and academic tone suitable for educational environments.
              </li>
            </ul>
          </div>
        </section>

        {/* Academic Integrity */}
        <section id="academic-integrity" className="mb-24 scroll-mt-20">
          <div className="flex items-center gap-4 mb-8">
            <Scale className="w-9 h-9 text-blue-600" />
            <h2 className="text-3xl font-semibold tracking-tight">
              Academic Integrity
            </h2>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <p>
              DoubtDesk is a learning tool. We expect all users to uphold the
              highest standards of academic honesty.
            </p>
            <ul className="space-y-4 mt-6">
              <li>
                Use AI Solver and community discussions to{" "}
                <strong>understand</strong> concepts, not to copy answers.
              </li>
              <li>
                Properly cite sources and acknowledge help received from peers
                or AI.
              </li>
              <li>
                Do not share complete solutions in public rooms when the goal is
                individual assessment.
              </li>
              <li>Respect your institution’s academic policies.</li>
            </ul>
          </div>
        </section>

        {/* AI Usage */}
        <section id="ai-usage" className="mb-24 scroll-mt-20">
          <div className="flex items-center gap-4 mb-8">
            <Lightbulb className="w-9 h-9 text-amber-600" />
            <h2 className="text-3xl font-semibold tracking-tight">
              Responsible AI Usage
            </h2>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <p>
              Our AI features are designed to support learning. Please use them
              responsibly:
            </p>
            <ul>
              <li>Verify AI-generated answers with reliable sources.</li>
              <li>Do not rely solely on AI for graded assignments.</li>
              <li>Report inaccurate or harmful AI responses.</li>
            </ul>
          </div>
        </section>

        {/* Contributing */}
        <section id="contributing" className="mb-24 scroll-mt-20">
          <div className="flex items-center gap-4 mb-8">
            <Users className="w-9 h-9 text-blue-600" />
            <h2 className="text-3xl font-semibold tracking-tight">
              Contributing to DoubtDesk
            </h2>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <p>
              Thank you for considering contributing! Please read our full{" "}
              <a
                href="https://github.com/knoxiboy/DoubtDesk/blob/main/CONTRIBUTING.md"
                className="text-blue-600 hover:underline"
              >
                Contributing Guide
              </a>{" "}
              on GitHub.
            </p>

            <div className="mt-8 p-8 bg-gradient-to-br from-slate-100 to-white dark:from-zinc-900 dark:to-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl">
              <h3 className="text-xl font-semibold mb-4">Quick Start</h3>
              <div className="grid md:grid-cols-2 gap-6 text-sm">
                <div>
                  <p className="font-medium mb-2">Must Do Before PR</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Star the repository</li>
                    <li>
                      Comment <code>/assign</code> on an issue
                    </li>
                    <li>Wait for official assignment</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-2">Branch Convention</p>
                  <p>
                    <code>feat/</code>, <code>fix/</code>, <code>docs/</code>,{" "}
                    <code>refactor/</code>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reporting & Enforcement */}
        <section id="reporting" className="scroll-mt-20">
          <div className="flex items-center gap-4 mb-8">
            <Flag className="w-9 h-9 text-blue-600" />
            <h2 className="text-3xl font-semibold tracking-tight">
              Reporting Violations
            </h2>
          </div>
          <div className="prose dark:prose-invert max-w-none">
            <p>
              If you experience or witness behavior that violates our
              guidelines, please report it immediately to the maintainers.
            </p>
            <p className="mt-4">
              Contact:{" "}
              <a
                href="https://github.com/knoxiboy"
                className="text-blue-600 hover:underline"
              >
                @knoxiboy
              </a>{" "}
              or use the{" "}
              <Link href="/contact" className="text-blue-600 hover:underline">
                Contact Form
              </Link>
              .
            </p>
            <p className="mt-6 text-sm text-slate-500 dark:text-zinc-500">
              All reports are handled confidentially and reviewed promptly.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
