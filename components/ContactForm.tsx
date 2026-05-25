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

    // Open the user's mail client with prefilled message
    window.location.href = mailto;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid gap-8 md:grid-cols-2 mb-8">
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-white/5">
          <h3 className="text-2xl font-semibold mb-3">Get in touch</h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            For bugs, feature requests, or general questions — send us a message and we'll reply as soon as possible.
          </p>

          <div className="flex flex-col gap-3 mt-4">
            <Link
              href="mailto:karankmt.tripathi@gmail.com"
              className="inline-flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
            >
              <Mail className="w-4 h-4 text-purple-600" />
              Email the team
            </Link>

            <Link
              href="https://github.com/knoxiboy/DoubtDesk/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
            >
              <Github className="w-4 h-4" />
              Report an issue on GitHub
            </Link>

            <Link
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
            >
              <Linkedin className="w-4 h-4 text-blue-600" />
              Follow on LinkedIn
            </Link>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-white/5"
        >
          <label className="block mb-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Your name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              placeholder="Jane Doe"
              required
            />
          </label>

          <label className="block mb-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Your email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-2 w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="block mb-3">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-2 w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              placeholder="Hi — regarding..."
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="mt-2 w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              placeholder="Write your message here..."
              required
            />
          </label>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-md hover:scale-105 transition-all duration-200"
            >
              Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
