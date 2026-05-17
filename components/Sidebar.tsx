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
    School,
    Bookmark
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'Virtual Campus', icon: School, href: '/rooms' },
    { name: 'Bookmarks', icon: Bookmark, href: '/bookmarks' },
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
          fixed lg:sticky lg:top-0 lg:h-screen shrink-0 inset-y-0 left-0 z-40
          w-64 bg-background border-r border-border
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo Section */}
                    <div className="flex items-center justify-between px-6 border-b border-border h-20">
                        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                                D
                            </div>
                            <h1 className="text-xl font-bold text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 tracking-tight transition-colors">
                                DoubtDesk
                            </h1>
                        </Link>
                        <button
                            onClick={onClose}
                            className="lg:hidden p-2 text-muted-foreground hover:bg-accent rounded-lg"
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
                                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                            }
                                        `}
                                    >
                                        <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-blue-400' : 'text-muted-foreground group-hover:text-foreground'}`} />
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
                                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">
                                    Community
                                </h2>
                                <div className="h-px w-full bg-border"></div>
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
                                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                        }
                                    `}
                                >
                                    <div className="p-1.5 rounded-lg bg-muted border border-border transition-colors">
                                        <MessageSquare className={`w-4 h-4 ${pathname === '/public-rooms' ? 'text-blue-400' : 'text-muted-foreground'}`} />
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
                                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                                        }
                                    `}
                                >
                                    <div className="p-1.5 rounded-lg bg-muted border border-border transition-colors">
                                        <Zap className={`w-4 h-4 ${pathname === '/ask-ai' ? 'text-cyan-400 fill-cyan-400/20' : 'text-muted-foreground group-hover:text-cyan-400 transition-colors'}`} />
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
                    <div className="p-4 border-t border-border space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground">Theme</span>
                            <ThemeToggle />
                        </div>
                        <div className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-widest">
                            © 2026 DoubtDesk
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}
