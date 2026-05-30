"use client";

import { useState } from "react";
import { Github, Linkedin, Mail } from "lucide-react";
import Link from "next/link";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const to = "karankmt.tripathi@gmail.com";
    const mailSubject = encodeURIComponent(subject || `Contact from ${name || "Visitor"}`);
    const bodyLines = [
      `Name: ${name}`,
      `Email: ${email}`,
      "",
      message,
    ];

    const mailto = `mailto:${to}?subject=${mailSubject}&body=${encodeURIComponent(
      bodyLines.join("\n")
    )}`;

    window.location.href = mailto;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 text-slate-900 dark:text-zinc-100 min-h-screen relative overflow-hidden transition-colors duration-500 bg-white dark:bg-black">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-500/10 dark:from-purple-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 dark:bg-emerald-500/[0.02] blur-[120px] rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none z-0" />

      <div className="grid gap-8 md:grid-cols-5 relative z-10">
        <div className="md:col-span-2 flex flex-col justify-between p-6 rounded-2xl border border-slate-200 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/30 backdrop-blur-xl shadow-xl shadow-slate-200/5 dark:shadow-none">
          <div className="space-y-4">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Get in touch</h3>
            <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium leading-relaxed">
              For bugs, feature requests, or general questions — send us a message and we will reply as soon as possible.
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-8 w-full">
            <Link
              href="mailto:karankmt.tripathi@gmail.com"
              className="inline-flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/20 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900/60 font-semibold text-sm transition-all duration-300 shadow-sm"
            >
              <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Email the team
            </Link>

            <Link
              href="https://github.com/knoxiboy/DoubtDesk/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/20 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900/60 font-semibold text-sm transition-all duration-300 shadow-sm"
            >
              <Github className="w-4 h-4 text-slate-900 dark:text-white" />
              Report an issue on GitHub
            </Link>

            <Link
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/20 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900/60 font-semibold text-sm transition-all duration-300 shadow-sm"
            >
              <Linkedin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Follow on LinkedIn
            </Link>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="md:col-span-3 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/30 backdrop-blur-xl shadow-xl shadow-slate-200/5 dark:shadow-none space-y-5"
        >
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1">Your name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 transition-all font-medium text-sm"
              placeholder="Jane Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1">Your email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 transition-all font-medium text-sm"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 transition-all font-medium text-sm"
              placeholder="Hi — regarding..."
            />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-purple-500/50 transition-all font-medium text-sm resize-none"
              placeholder="Write your message here..."
              required
            />
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-lg shadow-blue-600/10 active:scale-[0.98]"
             aria-label="Submit">
              Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}