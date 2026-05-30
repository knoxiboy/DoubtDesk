"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  HelpCircle,
  Shield,
  Bot,
  Users,
  BookOpen,
  Wrench,
  Search,
  MessageCircleQuestion,
  ArrowLeft,
} from "lucide-react";

const faqSections = [
  {
    category: "Account & Authentication",
    icon: Shield,
    faqs: [
      {
        question: "How do I create a DoubtDesk account?",
        answer:
          "You can sign up using Clerk authentication through the Sign Up page. After authentication, complete the onboarding flow by selecting your university, academic year, and role.",
      },
      {
        question: "Can I use DoubtDesk anonymously?",
        answer:
          "Yes. DoubtDesk supports anonymous classroom posting where students are assigned randomized identifiers like Student_A7X to encourage participation without fear or hesitation.",
      },
    ],
  },
  {
    category: "AI Solver Features",
    icon: Bot,
    faqs: [
      {
        question: "How does the AI doubt solver work?",
        answer:
          "Students can type a question or upload an image of a handwritten problem. The AI generates step-by-step explanations, simplified breakdowns, and final answers using Groq-powered LLMs.",
      },
      {
        question: "Does DoubtDesk support mathematical equations?",
        answer:
          "Yes. DoubtDesk supports full LaTeX rendering using KaTeX for mathematics and science equations.",
      },
    ],
  },
  {
    category: "Classroom Usage",
    icon: Users,
    faqs: [
      {
        question: "How do I join a classroom?",
        answer:
          "Teachers generate unique classroom invite codes. Students can join classrooms by entering the code in the Join Classroom section.",
      },
      {
        question: "What are the different classroom channels?",
        answer:
          "Each classroom contains three channels: AI Solve, Community Board, and Teacher Lane for structured doubt-solving experiences.",
      },
    ],
  },
  {
    category: "Platform Features",
    icon: BookOpen,
    faqs: [
      {
        question: "Can teachers track student difficulties?",
        answer:
          "Yes. DoubtDesk provides analytics dashboards showing topic difficulty heatmaps, resolution rates, and peak student activity timelines.",
      },
      {
        question: "Are previous doubts saved?",
        answer:
          "Yes. AI chat sessions and classroom discussions are stored persistently for future reference and continued learning.",
      },
    ],
  },
  {
    category: "Troubleshooting & Safety",
    icon: Wrench,
    faqs: [
      {
        question: "Why was my post removed?",
        answer:
          "DoubtDesk uses AI-powered moderation to maintain a safe academic environment. Off-topic, abusive, or spam content may be automatically flagged or removed.",
      },
      {
        question: "What happens if community guidelines are violated?",
        answer:
          "The platform uses a strike-based moderation system with escalating temporary restrictions for repeated violations.",
      },
    ],
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const toggleFAQ = (id: string) => {
    setOpenIndex(openIndex === id ? null : id);
  };

  return (
    <div className="relative min-h-screen bg-white dark:bg-black text-slate-900 dark:text-zinc-100 transition-colors duration-500">
      
      {/* Immersive Background Ambient Lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 h-[500px] w-full max-w-7xl bg-gradient-to-b from-blue-500/10 dark:from-blue-500/[0.03] to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 py-16 md:py-24 flex flex-col gap-16">
        {/* Hero Headers Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 px-3.5 py-1 text-xs font-semibold tracking-wider uppercase text-blue-600 dark:text-blue-400">
            <HelpCircle className="h-3.5 w-3.5" />
            Help Center
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 dark:from-blue-400 dark:via-cyan-300 dark:to-indigo-400 bg-clip-text text-transparent">
              Questions
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-zinc-400 leading-relaxed">
            Find quick answers regarding virtual classrooms, smart analytics dashboards, and AI tools across your workspace.
          </p>
        </div>
        <div className="max-w-xl w-full mx-auto relative z-20 animate-in fade-in scale-in duration-500">
          <div className="relative flex items-center group">
            <Search className="absolute left-4 h-5 w-5 text-slate-400 dark:text-zinc-600 transition-colors duration-300 group-focus-within:text-blue-500" />
            <input
              type="text"
              placeholder="Search parameters or questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-950/30 pl-12 pr-4 py-3.5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 outline-none transition-all duration-300 focus:border-blue-500/40 dark:focus:border-blue-500/20 focus:bg-white dark:focus:bg-black"
            />
          </div>
        </div>

        {/* Clean Stack FAQ Grid Pipeline */}
        <div className="space-y-16 relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
          {faqSections.map((section, sectionIndex) => {
            const SectionIcon = section.icon;
            const filteredFaqs = section.faqs.filter((faq) =>
              faq.question.toLowerCase().includes(search.toLowerCase())
            );

            if (filteredFaqs.length === 0) return null;

            return (
              <div key={sectionIndex} className="space-y-4">
                
                {/* Structural Section Header Title */}
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-zinc-900">
                  <SectionIcon className="h-4 w-4 text-blue-600 dark:text-blue-400/80" />
                  <h2 className="text-base font-bold tracking-wide uppercase text-slate-800 dark:text-zinc-400">
                    {section.category}
                  </h2>
                </div>

                {/* Clean Borderless FAQ List Wrapper */}
                <div className="divide-y divide-slate-100 dark:divide-zinc-900/60">
                  {filteredFaqs.map((faq, faqIndex) => {
                    const id = `${sectionIndex}-${faqIndex}`;
                    const isOpen = openIndex === id;

                    return (
                      <div key={faqIndex} className="group transition-colors duration-200">
                        <button
                          onClick={() => toggleFAQ(id)}
                          className="flex w-full items-center justify-between gap-4 py-4 text-left outline-none"
                        >
                          <span className="text-[15px] sm:text-[16px] font-medium text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                            {faq.question}
                          </span>
                          <ChevronDown className={`h-4 w-4 text-slate-400 dark:text-zinc-600 transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180 text-blue-500 dark:text-blue-400" : ""}`} />
                        </button>

                        {/* Dropdown Answer Block */}
                        <div
                          className={`grid transition-all duration-300 ease-in-out ${
                            isOpen ? "grid-rows-[1fr] opacity-100 mb-4" : "grid-rows-[0fr] opacity-0"
                          }`}
                        >
                          <div className="overflow-hidden">
                            <p className="text-[14px] sm:text-[15px] text-slate-500 dark:text-zinc-400 leading-relaxed pr-6">
                              {faq.answer}
                            </p>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>

        {/* Minimal Bottom CTA Panel Card */}
        <div className="mt-4 rounded-2xl border border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-950/20 p-8 text-center backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <MessageCircleQuestion className="h-6 w-6 text-blue-500 dark:text-blue-400 mx-auto mb-3" />
          <h3 className="mb-1 text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Still need assistance?
          </h3>
          <p className="mx-auto max-w-lg text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
            If your question isn&apos;t addressed here, submit your query directly to the live classroom streams or launch an instant AI query session.
          </p>
        </div>

      </div>
    </div>
  );
}