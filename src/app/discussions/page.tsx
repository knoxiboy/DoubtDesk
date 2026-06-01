"use client";

import Link from "next/link";
import { useState } from "react";

import {
  MessageSquare,
  BrainCircuit,
  Users,
  Sparkles,
  BookOpen,
  ShieldCheck,
  ArrowRight,
  Flame,
  Plus,
} from "lucide-react";

import CreateThreadModal from "@/app/discussions/CreateThreadModal";
import DiscussionModal from "@/app/discussions/DiscussionModal";

interface Thread {
  id: number;
  title: string;
  author: string;
  category: string;
  replies: number;
  lastReply: string;
  description?: string;
}

const categories = [
  {
    title: "AI Doubts",
    description:
      "Get instant AI-assisted explanations and collaborative academic guidance.",
    icon: BrainCircuit,
  },
  {
    title: "Classroom Help",
    description:
      "Discuss classroom topics, assignments, and shared learning resources.",
    icon: Users,
  },
  {
    title: "Exam Preparation",
    description:
      "Exchange revision strategies, notes, and preparation roadmaps.",
    icon: BookOpen,
  },
  {
    title: "Feature Requests",
    description:
      "Suggest improvements and help shape the future of DoubtDesk.",
    icon: Sparkles,
  },
  {
    title: "Community Support",
    description:
      "Get onboarding help, troubleshooting guidance, and peer support.",
    icon: ShieldCheck,
  },
  {
    title: "Open Discussions",
    description:
      "Join active community threads and collaborate with peers.",
    icon: MessageSquare,
  },
];

const initialThreads: Thread[] = [
  {
    id: 1,
    title: "How do I prepare for DBMS viva effectively?",
    author: "Aarav",
    category: "Exam Help",
    replies: 12,
    lastReply: "2h ago",
    description:
      "I have my DBMS viva next week. Which topics should I focus on the most?",
  },
  {
    id: 2,
    title: "Can someone explain time complexity of DFS vs BFS?",
    author: "Neha",
    category: "DSA",
    replies: 18,
    lastReply: "35m ago",
    description:
      "I understand traversal basics but still get confused between DFS and BFS complexity.",
  },
  {
    id: 3,
    title: "Best resources for learning Operating Systems?",
    author: "Rahul",
    category: "Resources",
    replies: 7,
    lastReply: "5h ago",
    description:
      "Looking for beginner-friendly Operating Systems resources and playlists.",
  },
];

const activityFeed = [
  "Aarav replied to 'Operating System viva questions'",
  "Neha started a discussion in AI Solver",
  "Rahul marked a thread as solved",
  "Priya shared semester revision resources",
];

export default function DiscussionsPage() {
  const [threadList, setThreadList] =
    useState<Thread[]>(initialThreads);

  const [createOpen, setCreateOpen] = useState(false);

  const [selectedThread, setSelectedThread] =
    useState<Thread | null>(null);

  const [discussionOpen, setDiscussionOpen] =
    useState(false);

  const scrollToDiscussions = () => {
    document
      .getElementById("active-discussions")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCreateThread = (thread: Thread) => {
    setThreadList((prev) => [thread, ...prev]);
  };

  const handleOpenThread = (thread: Thread) => {
    setSelectedThread(thread);
    setDiscussionOpen(true);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white dark:bg-black text-slate-900 dark:text-zinc-100 transition-colors duration-500">

      {/* Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[420px] bg-gradient-to-b from-blue-500/10 dark:from-blue-500/[0.04] to-transparent blur-3xl" />

        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-cyan-500/10 dark:bg-cyan-500/[0.03] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24 flex flex-col gap-24">

        {/* Hero */}
        <section className="text-center space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">

          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            <MessageSquare className="h-4 w-4" />
            Community Discussions
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight">
            Learn Through{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 dark:from-blue-400 dark:via-cyan-300 dark:to-indigo-400 bg-clip-text text-transparent">
              Discussions
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-400 max-w-3xl mx-auto leading-relaxed">
            Ask questions, collaborate with students and teachers, share academic resources, and participate in meaningful community-driven discussions.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">

            <button
              type="button"
              aria-label="Browse active discussions"
              onClick={scrollToDiscussions}
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_35px_rgba(59,130,246,0.35)] active:scale-[0.98]"
            >
              Browse Discussions

              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
            </button>

            <Link
              href="/ask-ai"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-2xl border border-slate-300 dark:border-zinc-800 hover:border-blue-500/40 dark:hover:border-blue-500/40 bg-white/70 dark:bg-zinc-950/40 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(59,130,246,0.12)] dark:hover:shadow-[0_0_30px_rgba(59,130,246,0.08)]"
            >
              <BrainCircuit className="h-4 w-4 text-blue-500 transition-transform duration-300 group-hover:scale-110" />
              Ask AI
            </Link>
          </div>
        </section>

        {/* Categories */}
        <section className="space-y-12">

          <div className="text-center space-y-3">
            <h2 className="text-4xl font-black tracking-tight">
              Discussion Categories
            </h2>

            <p className="text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Explore topic-focused spaces designed for collaborative learning and peer support.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;

              return (
                <div
                  key={category.title}
                  className="
                  group rounded-3xl border border-slate-200 dark:border-zinc-900
                  bg-white/70 dark:bg-zinc-950/40
                  p-6 backdrop-blur-xl
                  hover:border-blue-500/50 dark:hover:border-blue-400/40
                  hover:bg-white dark:hover:bg-zinc-900/60
                  hover:-translate-y-2
                  hover:shadow-[0_10px_40px_rgba(59,130,246,0.12)]
                  dark:hover:shadow-[0_10px_40px_rgba(59,130,246,0.08)]
                  transition-all duration-300
                  "
                >
                  <div
                    className="
                    w-14 h-14 rounded-2xl
                    bg-blue-500/10 border border-blue-500/20
                    flex items-center justify-center mb-5
                    transition-all duration-300
                    group-hover:scale-110
                    group-hover:bg-blue-500
                    "
                  >
                    <Icon className="w-7 h-7 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors duration-300" />
                  </div>

                  <h3 className="text-xl font-bold mb-3">
                    {category.title}
                  </h3>

                  <p className="text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
                    {category.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Active Discussions */}
        <section
          id="active-discussions"
          className="space-y-10"
        >

          <div className="flex items-center justify-between gap-4 flex-wrap">

            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                Active Discussions
              </h2>

              <p className="mt-2 text-slate-600 dark:text-zinc-400">
                Browse ongoing community threads or start your own academic discussion.
              </p>
            </div>

            <button
              type="button"
              aria-label="Create new discussion thread"
              onClick={() => setCreateOpen(true)}
              className="group inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(59,130,246,0.35)] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
              Create Thread
            </button>
          </div>

          <div className="grid gap-5">

            {threadList.map((thread) => (
              <div
                key={thread.id}
                className="
                group rounded-3xl border border-slate-200 dark:border-zinc-900
                bg-white/70 dark:bg-zinc-950/40
                p-6 backdrop-blur-xl
                hover:border-blue-500/50 dark:hover:border-blue-400/40
                hover:bg-white dark:hover:bg-zinc-900/60
                hover:-translate-y-1.5
                hover:shadow-[0_10px_45px_rgba(59,130,246,0.14)]
                dark:hover:shadow-[0_10px_45px_rgba(59,130,246,0.08)]
                transition-all duration-300
                "
              >
                <div className="flex flex-col gap-5">

                  <div className="flex items-start justify-between gap-4 flex-wrap">

                    <div className="space-y-3">

                      <div className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {thread.category}
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                        {thread.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      aria-label={`Open discussion thread: ${thread.title}`}
                      onClick={() => handleOpenThread(thread)}
                      className="
                      px-4 py-2 rounded-xl
                      border border-slate-300 dark:border-zinc-800
                      hover:border-blue-500/50
                      hover:bg-blue-500
                      hover:text-white
                      text-sm font-medium
                      transition-all duration-300
                      hover:shadow-lg
                      "
                    >
                      Open Thread
                    </button>
                  </div>

                  <div className="flex items-center justify-between flex-wrap gap-4 text-sm">

                    <div className="flex items-center gap-3 text-slate-600 dark:text-zinc-400">

                      <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400">
                        {thread.author.charAt(0)}
                      </div>

                      <span>
                        Started by{" "}
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">
                          {thread.author}
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-slate-500 dark:text-zinc-500">
                      <span>{thread.replies} replies</span>
                      <span>Last reply {thread.lastReply}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      {/* Guidelines */}
      <section className="space-y-10">

        <div className="text-center space-y-3">
          <h2 className="text-4xl font-black tracking-tight">
            Community Guidelines
          </h2>

          <p className="text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Help us maintain a respectful and collaborative academic environment.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            "Respect every learner",
            "Keep discussions academic",
            "Avoid spam or abusive content",
            "Help peers learn collaboratively",
          ].map((rule) => (
            <div
              key={rule}
              className="
              rounded-2xl border border-slate-200 dark:border-zinc-900
              bg-white/70 dark:bg-zinc-950/40
              p-5 text-center backdrop-blur-xl
             hover:border-blue-500/50 dark:hover:border-blue-400/40
             hover:bg-white dark:hover:bg-zinc-900/60
              hover:-translate-y-2
              hover:shadow-[0_10px_40px_rgba(59,130,246,0.12)]
              dark:hover:shadow-[0_10px_40px_rgba(59,130,246,0.08)]
             transition-all duration-300">
              <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                {rule}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden rounded-[2rem] border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-10 md:p-14 text-center backdrop-blur-xl hover:shadow-[0_0_60px_rgba(59,130,246,0.12)] transition-all duration-500">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.15),transparent_40%)] pointer-events-none" />

        <div className="relative z-10 space-y-6">

          <h2 className="text-4xl md:text-5xl font-black tracking-tight">
            Start Your First Discussion
          </h2>

          <p className="max-w-2xl mx-auto text-slate-600 dark:text-zinc-400">
            Ask questions, collaborate with peers, and participate in academic conversations powered by the DoubtDesk community.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">

            <button
              type="button"
              aria-label="Create discussion thread"
              onClick={() => setCreateOpen(true)}
              className="
              px-6 py-3 rounded-2xl
              bg-blue-600 hover:bg-blue-700
              text-white font-semibold
              transition-all duration-300
              hover:scale-[1.03]
              hover:shadow-[0_0_35px_rgba(59,130,246,0.35)]
              active:scale-[0.98]
              "
            >
              Join Discussions
            </button>

            <Link
              href="/sign-up"
              className="px-6 py-3 rounded-2xl border border-slate-300 dark:border-zinc-800 hover:border-blue-500/40 bg-white/70 dark:bg-zinc-950/40 transition-all duration-300 hover:-translate-y-1"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>

      </div>

      <CreateThreadModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateThread}
      />

      <DiscussionModal
        open={discussionOpen}
        onClose={() => {
          setDiscussionOpen(false);
          setSelectedThread(null);
        }}
        thread={selectedThread}
      />
    </div>
  );
}