"use client"

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Wrench,
    History,
    CreditCard,
    User,
    Menu,
    X,
    Users,
    MessageSquare,
    BookOpen,
    Code,
    MoreHorizontal,
    Zap,
    School
} from 'lucide-react'

const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Virtual Campus', icon: School, href: '/rooms' },
]

interface SidebarProps {
    isOpen: boolean
    onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname()

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-slate-950 border-r border-white/5
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo Section */}
                    <div className="flex items-center justify-between px-6 border-b border-white/5 h-20">
                        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                                D
                            </div>
                            <h1 className="text-xl font-bold text-blue-400 hover:text-blue-300 tracking-tight transition-colors">
                                DoubtDesk
                            </h1>
                        </Link>
                        <button
                            onClick={onClose}
                            className="lg:hidden p-2 text-slate-400 hover:bg-white/5 rounded-lg"
                            aria-label="Close sidebar"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Navigation Menu */}
                    <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
                        <div className="space-y-1.5">
                            {menuItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={onClose}
                                        className={`
                                            flex items-center gap-3 px-4 py-3 rounded-xl
                                            transition-all duration-200 group
                                            ${isActive
                                                ? 'bg-blue-600/10 text-blue-400'
                                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                            }
                                        `}
                                    >
                                        <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                        <span className="text-sm font-medium">{item.name}</span>
                                        {isActive && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                                        )}
                                    </Link>
                                )
                            })}
                        </div>

                        {/* Public Doubt Rooms Section */}
                        <div className="space-y-4">
                            <div className="px-4">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
                                    Community
                                </h2>
                                <div className="h-px w-full bg-white/5"></div>
                            </div>
                            
                            <div className="space-y-1">
                                <Link
                                    href="/public-rooms"
                                    onClick={onClose}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl
                                        transition-all duration-200 group
                                        ${pathname === '/public-rooms'
                                            ? 'bg-blue-600/10 text-blue-400'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }
                                    `}
                                >
                                    <div className={`p-1.5 rounded-lg bg-slate-900 border border-white/5 group-hover:border-white/10 transition-colors`}>
                                        <MessageSquare className={`w-4 h-4 ${pathname === '/public-rooms' ? 'text-blue-400' : 'text-slate-500'}`} />
                                    </div>
                                    <span className="text-sm font-medium">Public Doubts</span>
                                    {pathname === '/public-rooms' && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    )}
                                </Link>
                            </div>
                        </div>

                        {/* AI Tools Section */}
                        <div className="space-y-4">
                            <div className="px-4">
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500 mb-2 flex items-center gap-1.5">
                                    <Zap className="w-3 h-3" />
                                    AI Power Tools
                                </h2>
                                <div className="h-px w-full bg-cyan-500/20"></div>
                            </div>
                            
                            <div className="space-y-1">
                                <Link
                                    href="/ask-ai"
                                    onClick={onClose}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl
                                        transition-all duration-200 group
                                        ${pathname === '/ask-ai'
                                            ? 'bg-cyan-600/10 text-cyan-400'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }
                                    `}
                                >
                                    <div className={`p-1.5 rounded-lg bg-slate-900 border border-white/5 group-hover:border-white/10 transition-colors`}>
                                        <Zap className={`w-4 h-4 ${pathname === '/ask-ai' ? 'text-cyan-400 fill-cyan-400/20' : 'text-slate-500 group-hover:text-cyan-400 transition-colors'}`} />
                                    </div>
                                    <span className="text-sm font-medium">Ask AI Solver</span>
                                    {pathname === '/ask-ai' && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                                    )}
                                </Link>
                            </div>
                        </div>
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/5">
                        <div className="text-[10px] text-slate-600 text-center font-bold uppercase tracking-widest">
                            © 2026 DoubtDesk
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}
