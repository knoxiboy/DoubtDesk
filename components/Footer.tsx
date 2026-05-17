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
                { label: "Privacy Policy", href: "/privacy-policy" },
                { label: "Terms of Service", href: "/terms-of-service" },
            ],
        },
    ]

    const socialLinks = [
        {
            icon: Linkedin,
            href: "https://www.linkedin.com/",
            label: "LinkedIn",
            hoverColor: "hover:text-blue-400",
        },
        {
            icon: Github,
            href: "https://github.com/knoxiboy/DoubtDesk",
            label: "GitHub",
            hoverColor: "hover:text-slate-300",
        },
        {
            icon: Mail,
            href: "mailto:karankmt.tripathi@gmail.com",
            label: "Email",
            hoverColor: "hover:text-purple-400",
        },
    ]

    return (
        <footer className="relative overflow-hidden border-t border-white/10 bg-linear-to-b from-slate-950 via-slate-950 to-slate-900">
            <div className="absolute inset-0 bg-linear-to-r from-blue-600/5 via-transparent to-purple-600/5 pointer-events-none" />
            <div className="absolute top-0 left-1/4 w-72 h-72 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-500/10 blur-3xl rounded-full pointer-events-none" />

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-16">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12 pb-12 border-b border-white/5">

                    <div className="max-w-md">
                        <Link href="/" className="inline-flex items-center gap-3 mb-5 group">
                            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                                D
                            </div>

                            <span className="text-2xl font-bold text-blue-400 hover:text-blue-300 tracking-tight transition-colors">
                                DoubtDesk
                            </span>
                        </Link>

                        <p className="text-sm leading-7 text-slate-400">
                            Simplifying classroom doubt solving with AI.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-10">
                        {footerSections.map((section) => (
                            <div key={section.title}>
                                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white mb-5">
                                    {section.title}
                                </h4>

                                <ul className="space-y-4">
                                    {section.links.map((link) => (
                                        <li key={link.label}>
                                            <Link
                                                href={link.href}
                                                className="text-sm text-slate-400 transition-all duration-300 hover:text-blue-400 hover:translate-x-1 inline-flex"
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

                <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        {socialLinks.map((social) => (
                            <Link
                                key={social.label}
                                href={social.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={social.label}
                                className={`group p-3 rounded-xl border border-white/10 bg-white/5 text-slate-400 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 ${social.hoverColor}`}
                            >
                                <social.icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                            </Link>
                        ))}
                    </div>

                    <div className="text-center md:text-right">
                        <p className="text-sm text-slate-500">
                            © {currentYear} DoubtDesk
                        </p>
                    </div>
                </div>

                <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-blue-500/20 to-transparent" />
            </div>

            <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-blue-500/30 to-transparent" />
        </footer>
    )
}