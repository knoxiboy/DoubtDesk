"use client"

import { Github, Linkedin, Mail } from "lucide-react"
import Link from "next/link"

export default function Footer() {
    const currentYear = new Date().getFullYear()

    const footerSections = [
        {
            title: "Platform",
            links: [
                { label: "Dashboard", href: "/dashboard" },
                { label: "Virtual Campus", href: "/rooms" },
                { label: "AI Solver", href: "/ai" },
                { label: "Analytics", href: "/analytics" },
            ],
        },
        {
            title: "Resources",
            links: [
                { label: "Privacy Policy", href: "/privacy-policy" },
                { label: "Terms of Service", href: "/terms-of-service" },
                { label: "Leaderboard", href: "/leaderboard" },
                { label: "Help Center", href: "/help" },
            ],
        },
        {
            title: "Community",
            links: [
                { label: "GitHub", href: "https://github.com/knoxiboy/DoubtDesk" },
                { label: "Contributors", href: "/contributors" },
                { label: "Discussions", href: "/discussions" },
                { label: "Contact", href: "/contact" },
            ],
        },
    ]

    const socialLinks = [
        {
            icon: Linkedin,
            href: "https://www.linkedin.com/",
            label: "LinkedIn",
            hoverColor: "hover:text-blue-500 dark:hover:text-blue-400",
        },
        {
            icon: Github,
            href: "https://github.com/knoxiboy/DoubtDesk",
            label: "GitHub",
            hoverColor: "hover:text-slate-900 dark:hover:text-slate-300",
        },
        {
            icon: Mail,
            href: "mailto:karankmt.tripathi@gmail.com",
            label: "Email",
            hoverColor: "hover:text-purple-500 dark:hover:text-purple-400",
        },
    ]

    return (
        <footer className="relative overflow-hidden border-t border-slate-200 dark:border-white/10 bg-gradient-to-b from-slate-100 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors duration-300">

            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10 dark:from-blue-600/5 dark:to-purple-600/5 pointer-events-none" />

            <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/10 dark:bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />

            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-500/10 dark:bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">

                {/* Top Section */}
                <div className="flex flex-col lg:flex-row lg:justify-between gap-14 pb-12 border-b border-slate-300 dark:border-white/10">

                    {/* Brand Section */}
                    <div className="max-w-md">
                        <Link href="/" className="inline-flex items-center gap-3 mb-5 group">

                            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                                D
                            </div>

                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 tracking-tight transition-colors duration-300">
                                DoubtDesk
                            </span>
                        </Link>

                        <p className="text-sm leading-7 text-slate-600 dark:text-slate-400">
                            Simplifying classroom doubt solving with AI-powered collaboration,
                            smart discussions, and interactive virtual learning spaces.
                        </p>
                    </div>

                    {/* Footer Links */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">

                        {footerSections.map((section) => (
                            <div key={section.title}>

                                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-900 dark:text-white mb-5">
                                    {section.title}
                                </h4>

                                <ul className="space-y-4">

                                    {section.links.map((link) => (
                                        <li key={link.label}>
                                            <Link
                                                href={link.href}
                                                className="relative inline-flex text-sm text-slate-600 dark:text-slate-400 transition-all duration-300 hover:text-blue-500 dark:hover:text-blue-400 hover:translate-x-1 after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-blue-500 dark:after:bg-blue-400 after:transition-all after:duration-300 hover:after:w-3/4"
                                            >
                                                {link.label}
                                            </Link>
                                        </li>
                                    ))}

                                </ul>
                            </div>
                        ))}

                    </div>
                </div>

                {/* Bottom Section */}
                <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6">

                    {/* Social Icons */}
                    <div className="flex items-center gap-4">

                        {socialLinks.map((social) => (
                            <Link
                                key={social.label}
                                href={social.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={social.label}
                                className={`group p-3 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-200/80 dark:bg-white/5 text-slate-700 dark:text-slate-400 backdrop-blur-sm transition-all duration-300 hover:bg-slate-300/80 dark:hover:bg-white/10 hover:border-slate-400 dark:hover:border-white/20 hover:-translate-y-1 hover:scale-110 ${social.hoverColor}`}
                            >
                                <social.icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                            </Link>
                        ))}

                    </div>

                    {/* Copyright */}
                    <div className="text-center md:text-right">
                        <p className="text-sm text-slate-600 dark:text-slate-500">
                            © {currentYear} DoubtDesk. Built for collaborative AI-powered learning.
                        </p>
                    </div>
                </div>

                {/* Top Glow Line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 dark:via-blue-500/30 to-transparent" />

            </div>
        </footer>
    )
}