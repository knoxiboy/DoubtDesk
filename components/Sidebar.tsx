"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    X,
    School,
    Bookmark,
    MessageSquare,
    Zap,
    BarChart3
} from 'lucide-react'

import { ThemeToggle } from '@/components/ThemeToggle'
import { useAppUser } from '@/app/provider'

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
    const { appUser } = useAppUser()

    const linkClasses = (isActive: boolean) =>
        `
        relative flex items-center gap-3 px-4 py-3.5 rounded-2xl
        transition-all duration-300 ease-out group
        hover:translate-x-1
        hover:shadow-[0_0_20px_rgba(59,130,246,0.08)]
        ${isActive
            ? `
                bg-gradient-to-r from-blue-600/15 to-cyan-500/10
                text-blue-400
                border border-blue-500/20
                shadow-sm
                before:absolute before:left-0 before:top-2
                before:h-8 before:w-1 before:rounded-r-full
                before:bg-blue-400
              `
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        }
    `

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed lg:sticky lg:top-0 lg:h-screen shrink-0
                    inset-y-0 left-0 z-40
                    w-72
                    bg-background/80
                    backdrop-blur-xl
                    border-r border-border/60
                    shadow-xl
                    transform transition-all duration-300 ease-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                <div className="flex flex-col h-full">

                    {/* Logo */}
                    <div className="flex items-center justify-between px-6 border-b border-border/60 h-20">
                        <Link
                            href="/"
                            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
                        >
                            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_rgba(37,99,235,0.25)]">
                                D
                            </div>

                            <div className="flex flex-col leading-tight">
                                <h1 className="text-xl font-bold tracking-tight text-blue-500 dark:text-blue-400">
                                    DoubtDesk
                                </h1>
                                <span className="text-[11px] text-muted-foreground font-medium">
                                    AI Learning Platform
                                </span>
                            </div>
                        </Link>

                        <button
                            onClick={onClose}
                            className="lg:hidden p-2 rounded-xl text-muted-foreground hover:bg-accent transition-colors"
                            aria-label="Close sidebar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto">

                        {/* Main Navigation */}
                        <div className="space-y-2">
                            {menuItems.map((item) => {
                                const Icon = item.icon

                                const isActive =
                                    pathname === item.href ||
                                    (item.href === '/rooms' &&
                                        pathname.startsWith('/rooms/'))

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={onClose}
                                        className={linkClasses(isActive)}
                                    >
                                        <Icon
                                            className={`
                                                w-5 h-5 transition-colors
                                                ${isActive
                                                    ? 'text-blue-400'
                                                    : 'text-muted-foreground group-hover:text-foreground'
                                                }
                                            `}
                                        />

                                        <span className="text-sm font-semibold">
                                            {item.name}
                                        </span>

                                        {isActive && (
                                            <div className="ml-auto w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.7)]" />
                                        )}
                                    </Link>
                                )
                            })}
                        </div>

                        {/* Community Section */}
                        <div className="space-y-4">
                            <div className="px-4">
                                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">
                                    Community
                                </h2>

                                <div className="h-px w-full bg-border/60"></div>
                            </div>

                            <div className="space-y-2">
                                <Link
                                    href="/public-rooms"
                                    onClick={onClose}
                                    className={linkClasses(pathname === '/public-rooms')}
                                >
                                    <div className="p-1.5 rounded-lg bg-muted border border-border/60">
                                        <MessageSquare className="w-4 h-4" />
                                    </div>

                                    <span className="text-sm font-semibold">
                                        Public Doubts
                                    </span>
                                </Link>
                            </div>
                        </div>

                        {/* AI Tools */}
                        <div className="space-y-4">
                            <div className="px-4">
                                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-500 mb-3 flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5" />
                                    AI Tools
                                </h2>

                                <div className="h-px w-full bg-cyan-500/20"></div>
                            </div>

                            <div className="space-y-2">
                                <Link
                                    href="/ask-ai"
                                    onClick={onClose}
                                    className={linkClasses(pathname === '/ask-ai')}
                                >
                                    <div className="p-1.5 rounded-lg bg-muted border border-border/60">
                                        <Zap className="w-4 h-4 text-cyan-400" />
                                    </div>

                                    <span className="text-sm font-semibold">
                                        Ask AI Solver
                                    </span>
                                </Link>
                            </div>
                        </div>

                        {/* Teacher Panel */}
                        {(appUser?.role === 'teacher' ||
                            appUser?.role === 'admin') && (
                            <div className="space-y-4">
                                <div className="px-4">
                                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-500 mb-3 flex items-center gap-2">
                                        <BarChart3 className="w-3.5 h-3.5" />
                                        Teacher Panel
                                    </h2>

                                    <div className="h-px w-full bg-blue-500/20"></div>
                                </div>

                                <div className="space-y-2">
                                    <Link
                                        href="/dashboard/analytics"
                                        onClick={onClose}
                                        className={linkClasses(
                                            pathname === '/dashboard/analytics'
                                        )}
                                    >
                                        <div className="p-1.5 rounded-lg bg-muted border border-border/60">
                                            <BarChart3 className="w-4 h-4 text-blue-400" />
                                        </div>

                                        <span className="text-sm font-semibold">
                                            Class Analytics
                                        </span>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </nav>

                    {/* Footer */}
                    <div className="p-5 border-t border-border/60 bg-muted/20 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-muted-foreground">
                                Theme
                            </span>

                            <ThemeToggle />
                        </div>

                        <div className="text-[10px] text-center uppercase tracking-[0.2em] font-semibold text-muted-foreground">
                            © 2026 DoubtDesk
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}
