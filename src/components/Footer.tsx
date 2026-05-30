"use client"

import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import {
  Github,
  Linkedin,
  Mail,
  ChevronRight,
  Users,
  MessageSquare,
} from "lucide-react"

const footerSections = [
  {
    title: "Platform",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Virtual Campus", href: "/rooms" },
      { label: "Public Doubts", href: "/public-rooms" },
      { label: "Bookmarks", href: "/bookmarks" },
      { label: "AI Solver", href: "/ask-ai" },
      { label: "Analytics", href: "/dashboard/analytics" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms of Service", href: "/terms-of-service" },
      { label: "About", href: "/about" },
      { label: "FAQs", href: "/faq" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "GitHub", href: "https://github.com/knoxiboy/DoubtDesk" },
      { label: "Contributors", href: "/contributors" },
      { label: "Report Issue", href: "https://github.com/knoxiboy/DoubtDesk/issues" },
      { label: "Contact", href: "mailto:karankmt.tripathi@gmail.com" },
    ],
  },
]

const communityIcons = {
  GitHub: Github,
  Contributors: Users,
  "Report Issue": MessageSquare,
  Contact: Mail,
} as const

const socialLinks = [
  {
    icon: Linkedin,
    href: "https://www.linkedin.com/",
    label: "LinkedIn",
    ariaLabel: "Visit DoubtDesk on LinkedIn",
    hoverColor: "hover:text-blue-500 dark:hover:text-blue-400",
  },
  {
    icon: Github,
    href: "https://github.com/knoxiboy/DoubtDesk",
    label: "GitHub",
    ariaLabel: "Visit the DoubtDesk GitHub repository",
    hoverColor: "hover:text-slate-900 dark:hover:text-slate-300",
  },
  {
    icon: Mail,
    href: "mailto:karankmt.tripathi@gmail.com",
    label: "Email",
    ariaLabel: "Email the DoubtDesk team",
    hoverColor: "hover:text-purple-500 dark:hover:text-purple-400",
  },
]

export default function Footer() {
  const currentYear = new Date().getFullYear();


  const socialLinks = [
    {
      icon: Linkedin,
      href: "https://www.linkedin.com/",
      label: "Visit DoubtDesk on LinkedIn",
      hoverColor: "hover:text-blue-500 dark:hover:text-blue-400",
    },
    {
      icon: Github,
      href: "https://github.com/knoxiboy/DoubtDesk",
      label: "Visit DoubtDesk on GitHub",
      hoverColor: "hover:text-slate-900 dark:hover:text-slate-300",
    },
    {
      icon: Mail,
      href: "mailto:karankmt.tripathi@gmail.com",
      label: "Send the DoubtDesk team an email",
      hoverColor: "hover:text-purple-500 dark:hover:text-purple-400",
    },
  ];

  return (
    <footer
      aria-label="Footer navigation"
      className="relative overflow-hidden border-t border-slate-200 dark:border-zinc-900 bg-gradient-to-b from-slate-100 via-white to-slate-100 dark:from-black dark:via-black dark:to-zinc-950 transition-colors duration-500"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10 dark:from-blue-600/5 dark:to-purple-600/5 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-500/10 dark:bg-purple-500/5 blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-12 pb-6" >
        
        <div className="flex flex-col lg:flex-row lg:justify-between items-start gap-10 lg:gap-14 pb-10 border-b border-slate-300 dark:border-zinc-900">
          

          <div className="max-w-sm w-full shrink-0">
            <Link href="/" className="inline-flex items-center gap-3 mb-4 group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                <Image
                  src="/logo.png"
                  alt="DoubtDesk logo"
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </div>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 tracking-tight transition-colors duration-300">
                DoubtDesk
              </span>
            </Link>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-zinc-400">
              Simplifying classroom doubt solving with AI-powered collaboration, smart discussions, and interactive virtual learning spaces.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 w-full lg:max-w-2xl">
            
            <div className="flex flex-col gap-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 dark:text-zinc-200">
                Platform
              </h4>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
                <li>
                  <Link href="/" className="group flex items-center gap-1.5 transition-transform duration-200 hover:translate-x-0.5 hover:text-blue-500 dark:hover:text-blue-400">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Home</span>
                  </Link>
                </li>
                <li>
                  <Link href="/rooms" className="group flex items-center gap-1.5 transition-transform duration-200 hover:translate-x-0.5 hover:text-blue-500 dark:hover:text-blue-400">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Virtual Campus</span>
                  </Link>
                </li>
                <li>
                  <Link href="/ask-ai" className="group flex items-center gap-1.5 transition-transform duration-200 hover:translate-x-0.5 hover:text-blue-500 dark:hover:text-blue-400">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>AI Solver</span>
                  </Link>
                </li>
                <li>
                  <Link href="/public-rooms" className="group flex items-center gap-1.5 transition-transform duration-200 hover:translate-x-0.5 hover:text-blue-500 dark:hover:text-blue-400">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Public Doubts</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="group flex items-center gap-1.5 transition-transform duration-200 hover:translate-x-0.5 hover:text-blue-500 dark:hover:text-blue-400">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Dashboard</span>
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/analytics" className="group flex items-center gap-1.5 transition-transform duration-200 hover:translate-x-0.5 hover:text-blue-500 dark:hover:text-blue-400">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Analytics</span>
                  </Link>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 dark:text-zinc-200">
                Resources
              </h4>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
                <li>
                  <Link href="/bookmarks" className="group flex items-center gap-1.5 transition-transform duration-200 hover:translate-x-0.5 hover:text-blue-500 dark:hover:text-blue-400">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Bookmarks</span>
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="group flex items-center gap-1.5 transition-transform duration-200 hover:translate-x-0.5 hover:text-blue-500 dark:hover:text-blue-400">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>FAQs</span>
                  </Link>
                </li>
                <li>
                  <a href="mailto:karankmt.tripathi@gmail.com" className="group flex items-center gap-1.5 transition-transform duration-200 hover:translate-x-0.5 hover:text-blue-500 dark:hover:text-blue-400">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Contact</span>
                  </a>
                </li>
                <li>
                  <Link href="/terms-of-service" className="group flex items-center gap-1.5 transition-transform duration-200 hover:translate-x-0.5 hover:text-blue-500 dark:hover:text-blue-400">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Terms of Service</span>
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="group flex items-center gap-1.5 transition-transform duration-200 hover:translate-x-0.5 hover:text-blue-500 dark:hover:text-blue-400">
                    <ChevronRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>Privacy Policy</span>
                  </Link>
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-4 col-span-2 md:col-span-1">
              <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-900 dark:text-zinc-200">
                Community
              </h4>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
                <li>
                  <Link href="/about" className="group flex items-center gap-2 transition-transform duration-200 hover:translate-x-0.5 hover:text-blue-500 dark:hover:text-blue-400">
                    <Users className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>About</span>
                  </Link>
                </li>
                <li>
                  <Link href="/contributors" className="group flex items-center gap-2 transition-transform duration-200 hover:translate-x-0.5 hover:text-blue-500 dark:hover:text-blue-400">
                    <Users className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Contributors</span>
                  </Link>
                </li>
                <li>
                  <a href="https://github.com/knoxiboy/DoubtDesk/issues" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2 transition-transform duration-200 hover:translate-x-0.5 hover:text-blue-500 dark:hover:text-blue-400">
                    <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>Report Tracker</span>
                  </a>
                </li>
              </ul>
            </div>

          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
          
          <div className="flex items-center gap-3.5 order-2 sm:order-1">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className={`group p-2.5 rounded-xl border border-slate-300 dark:border-zinc-800 bg-slate-200/60 dark:bg-zinc-900/40 text-slate-700 dark:text-zinc-400 backdrop-blur-sm transition-all duration-300 hover:bg-slate-300/60 dark:hover:bg-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700 hover:-translate-y-0.5 ${social.hoverColor}`}
              >
                <social.icon className="w-4 h-4" />
              </a>
            ))}
          </div>

          <div className="order-1 sm:order-2">
            <p className="text-xs text-slate-500 dark:text-zinc-500 leading-relaxed font-medium">
              © {currentYear} DoubtDesk. Built for collaborative AI-powered learning.
            </p>
          </div>

        </div>

        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 dark:via-blue-500/20 to-transparent" />
      </div>
    </footer>
  );
}
