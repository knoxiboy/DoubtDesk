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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white">

      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">

        <div className="absolute top-0 left-0 h-[400px] w-[400px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="absolute bottom-0 right-0 h-[350px] w-[350px] rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-20">

        {/* Back to Home Button */}
        <div className="mb-8 flex justify-start">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-blue-700"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Hero */}
        <div className="mb-16 text-center">

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300 backdrop-blur-sm">
            <HelpCircle className="h-4 w-4" />
            Help Center & Guidance
          </div>

          <h1 className="mb-6 bg-gradient-to-r from-white via-blue-200 to-cyan-300 bg-clip-text text-5xl font-black tracking-tight text-transparent md:text-6xl">
            Frequently Asked Questions
          </h1>

          <p className="mx-auto max-w-3xl text-lg leading-8 text-slate-300">
            Find answers to common questions about classrooms, AI solving,
            authentication, moderation, analytics, and platform usage across
            DoubtDesk.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-14">

          <div className="relative mx-auto max-w-2xl">

            <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="
                w-full
                rounded-2xl
                border
                border-white/10
                bg-white/[0.04]
                px-6
                py-4
                text-white
                placeholder:text-slate-400
                backdrop-blur-xl
                outline-none
                transition-all
                duration-300

                focus:border-blue-500/40
                focus:ring-2
                focus:ring-blue-500/20
            "
            />
          </div>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-10">

          {faqSections.map((section, sectionIndex) => {
            const SectionIcon = section.icon;

            return (
              <div key={sectionIndex}>

                {/* Category Header */}
                <div className="mb-5 flex items-center gap-3">

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 shadow-lg shadow-blue-500/10">
                    <SectionIcon className="h-5 w-5 text-blue-300" />
                  </div>

                  <h2 className="text-2xl font-bold text-white">
                    {section.category}
                  </h2>
                </div>

                {/* FAQ Items */}
                <div className="space-y-4">

                  {section.faqs
                    .filter((faq) =>
                        faq.question.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((faq, faqIndex) => {
                    const id = `${sectionIndex}-${faqIndex}`;
                    const isOpen = openIndex === id;

                    return (
                      <div
                        key={faqIndex}
                        className="
                          group
                          overflow-hidden
                          rounded-3xl
                          border
                          border-white/10
                          bg-white/[0.03]
                          backdrop-blur-xl
                          transition-all
                          duration-300

                          hover:border-blue-500/30
                        "
                      >

                        <button
                          onClick={() => toggleFAQ(id)}
                          className="
                            flex
                            w-full
                            items-center
                            justify-between
                            gap-4
                            px-6
                            py-5
                            text-left
                          "
                        >
                          <span className="text-lg font-semibold text-white">
                            {faq.question}
                          </span>

                          <ChevronDown
                            className={`
                              h-5
                              w-5
                              text-blue-300
                              transition-transform
                              duration-300
                              ${isOpen ? "rotate-180" : ""}
                            `}
                          />
                        </button>

                        <div
                          className={`
                            grid
                            transition-all
                            duration-300

                            ${
                              isOpen
                                ? "grid-rows-[1fr] opacity-100"
                                : "grid-rows-[0fr] opacity-0"
                            }
                          `}
                        >
                          <div className="overflow-hidden">

                            <div className="border-t border-white/10 px-6 py-5 text-slate-300 leading-8">
                              {faq.answer}
                            </div>

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

        {/* Bottom Card */}
        <div className="mt-16 rounded-3xl border border-blue-500/10 bg-blue-500/[0.03] p-8 text-center backdrop-blur-xl">

          <h3 className="mb-3 text-2xl font-bold text-white">
            Still Need Help?
          </h3>

          <p className="mx-auto max-w-2xl leading-7 text-slate-300">
            If your question is not answered here, you can ask directly inside
            the community board or use the AI Solver for instant academic
            assistance.
          </p>
        </div>
      </div>
    </div>
  );
}