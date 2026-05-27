"use client"

import Link from "next/link"
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
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative overflow-hidden border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 transition-colors duration-300">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
        {/* Top Section */}
        <div className="flex flex-col lg:flex-row lg:justify-between gap-14 pb-12 border-b border-slate-300 dark:border-white/10">
          {/* Brand Section */}
          <div className="max-w-md">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(37,99,235,0.15)] transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                D
              </div>

              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 tracking-tight transition-colors duration-300">
                DoubtDesk
              </span>
            </Link>
            <p className="mt-6 text-sm leading-7 text-slate-600 dark:text-slate-400 max-w-md">
              Simplifying classroom doubt solving with AI-powered collaboration,
              smart discussions, and interactive virtual learning spaces.
            </p>
          </div>

          <nav aria-label="Footer navigation" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
            {footerSections.map((section) => (
              <div key={section.title}>
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-5">
                  {section.title}
                </h4>

                <ul className="space-y-4">
                  {section.links.map((link) => {
                    const isExternal =
                      link.href.startsWith("http") ||
                      link.href.startsWith("mailto:")
                    const isCommunity = section.title === "Community"
                    const Icon = isCommunity
                      ? communityIcons[link.label as keyof typeof communityIcons]
                      : null

                    return (
                      <li key={link.label}>
                        {isExternal ? (
                          <a
                            href={link.href}
                            target={link.href.startsWith("http") ? "_blank" : undefined}
                            rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                            className="group inline-flex items-center gap-2 text-sm text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400"
                          >
                            {Icon ? (
                              <Icon className="w-4 h-4 shrink-0 text-blue-500 dark:text-blue-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 shrink-0 text-blue-500 dark:text-blue-400 opacity-90 transition-transform duration-300 group-hover:translate-x-1" />
                            )}
                            <span>{link.label}</span>
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            className="group inline-flex items-center gap-2 text-sm text-slate-600 transition-all duration-300 hover:translate-x-1 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400"
                          >
                            {Icon ? (
                              <Icon className="w-4 h-4 shrink-0 text-blue-500 dark:text-blue-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 shrink-0 text-blue-500 dark:text-blue-400 opacity-90 transition-transform duration-300 group-hover:translate-x-1" />
                            )}
                            <span>{link.label}</span>
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => {
              const isExternalLink = social.href.startsWith("http")

              return (
                <a
                  key={social.label}
                  href={social.href}
                  target={isExternalLink ? "_blank" : undefined}
                  rel={isExternalLink ? "noopener noreferrer" : undefined}
                  aria-label={social.ariaLabel ?? social.label}
                  className={`group p-3 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-400 transition-all duration-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 hover:-translate-y-1 hover:scale-110 ${social.hoverColor}`}
                >
                  <social.icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                </a>
              )
            })}
          </div>

          <div className="text-center md:text-right">
            <p className="text-sm text-slate-600 dark:text-slate-500">
              Copyright {currentYear} DoubtDesk. Built for collaborative AI-powered learning.
            </p>
          </div>
        </div>

        <div className="absolute top-0 left-0 right-0 h-px bg-slate-200 dark:bg-white/10" />
      </div>
    </footer>
  )
}
