"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import {
    LayoutDashboard,
    X,
    School,
    Bookmark,
    MessageSquare,
    Zap,
    BarChart3,
    GraduationCap,
    FileText,
    PenTool,
    Map,
    Bot,
    Network,
    ShieldCheck
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { useAppUser } from '@/app/provider'

const SIDEBAR_CONSTANTS = {
    LOGO_ALT: 'DoubtDesk Logo',
};

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

    const chatSystemUrl = process.env.NEXT_PUBLIC_CHAT_SYSTEM_URL?.replace(/\/$/, "")
    const classroomChatHref = chatSystemUrl ? `${chatSystemUrl}/chat` : '/chat'
    const peerToPeerHref = chatSystemUrl ? `${chatSystemUrl}/chat/peer-to-peer` : '/chat/peer-to-peer'

    const linkClasses = (isActive: boolean) =>
        `
        relative flex items-center gap-3 px-4 py-3 rounded-xl
        transition-all duration-300 ease-out group
        hover:translate-x-0.5
        ${isActive
            ? `
                bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400
                shadow-sm
                before:absolute before:left-0 before:top-2
                before:h-7 before:w-1 before:rounded-r-full
                before:bg-purple-500
              `
            : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900/60 hover:text-slate-900 dark:hover:text-white'
        }
    `

    return (
        <>
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30 animate-in fade-in duration-300"
                    onClick={onClose}
                />
            )}

            <TooltipProvider>
                <aside
                    className={`fixed lg:sticky lg:top-0 lg:h-screen shrink-0 inset-y-0 left-0 z-40 w-72 bg-white dark:bg-black border-r border-slate-100 dark:border-zinc-900/60 shadow-xl lg:shadow-none transform transition-all duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
                >
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between px-6 border-b border-slate-100 dark:border-zinc-900/60 h-16 md:h-20">
                            <Link
                                href="/"
                                className="flex items-center gap-3 hover:opacity-90 transition-opacity"
                            >
                                <div className="w-10 h-10 rounded-xl overflow-hidden relative shadow-md shadow-blue-500/10 bg-slate-50 dark:bg-zinc-900 flex items-center justify-center">
                                    <Image
                                        src="/logo.png"
                                        alt={SIDEBAR_CONSTANTS.LOGO_ALT}
                                        width={40}
                                        height={40}
                                        className="object-contain dark:brightness-110"
                                        priority
                                    />
                                </div>

                                <div className="flex flex-col">
                                    <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none">
                                        DoubtDesk
                                    </h1>
                                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                                        AI Learning Platform
                                    </span>
                                </div>
                            </Link>

                            <button
                                onClick={onClose}
                                className="lg:hidden p-2 rounded-xl text-slate-400 dark:text-zinc-500 hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors"
                                aria-label="Close sidebar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto scrollbar-none">
                            <div className="space-y-1.5">
                                {menuItems.map((item) => {
                                    const Icon = item.icon
                                    const isActive =
                                        pathname === item.href ||
                                        (item.href === '/rooms' && pathname.startsWith('/rooms/'))

                                    return (
                                        <Tooltip key={item.name}>
                                            <TooltipTrigger asChild>
                                                <Link
                                                    href={item.href}
                                                    onClick={onClose}
                                                    aria-label={item.name}
                                                    className={linkClasses(isActive)}
                                                >
                                                    <Icon
                                                        className={`w-4 h-4 transition-colors ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-900 dark:group-hover:text-white'}`}
                                                    />

                                                    <span className="text-xs font-bold uppercase tracking-wider">
                                                        {item.name}
                                                    </span>

                                                    {isActive && (
                                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                                                    )}
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">{item.name}</TooltipContent>
                                        </Tooltip>
                                    )
                                })}
                            </div>

                            <div className="space-y-3">
                                <div className="px-4">
                                    <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2">
                                        Community
                                    </h2>
                                    <div className="h-[1px] w-full bg-slate-100 dark:bg-zinc-900"></div>
                                </div>

                                <div className="space-y-1.5">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href={classroomChatHref}
                                                onClick={onClose}
                                                className={linkClasses(pathname === '/chat')}
                                            >
                                                <div className="p-1 rounded-md bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/40 dark:border-zinc-800/40">
                                                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                                                </div>

                                                <span className="text-xs font-bold uppercase tracking-wider">
                                                    Classroom Chat
                                                </span>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">Classroom Chat</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href="/public-rooms"
                                                onClick={onClose}
                                                aria-label="Public Doubts"
                                                className={linkClasses(pathname === '/public-rooms')}
                                            >
                                                <div className="p-1 rounded-md bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/40 dark:border-zinc-800/40">
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                </div>

                                                <span className="text-xs font-bold uppercase tracking-wider">
                                                    Public Doubts
                                                </span>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">Public Doubts</TooltipContent>
                                    </Tooltip>

                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href={peerToPeerHref}
                                                onClick={onClose}
                                                className={linkClasses(pathname === '/chat/peer-to-peer')}
                                            >
                                                <div className="p-1 rounded-md bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/40 dark:border-zinc-800/40">
                                                    <Network className="w-3.5 h-3.5 text-blue-400" />
                                                </div>

                                                <span className="text-xs font-bold uppercase tracking-wider">
                                                    Peer to Peer Discussion
                                                </span>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">Peer to Peer Discussion</TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="px-4">
                                    <h2 className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                                        <Zap className="w-3.5 h-3.5" />
                                        AI Tools
                                    </h2>
                                    <div className="h-[1px] w-full bg-blue-500/10 dark:bg-blue-500/5"></div>
                                </div>

                                <div className="space-y-1.5">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href="/ask-ai"
                                                onClick={onClose}
                                                aria-label="Ask AI Solver"
                                                className={linkClasses(pathname === '/ask-ai')}
                                            >
                                                <div className="p-1 rounded-md bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/40 dark:border-zinc-800/40">
                                                    <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                                </div>

                                                <span className="text-xs font-bold uppercase tracking-wider">
                                                    Ask AI Solver
                                                </span>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">Ask AI Solver</TooltipContent>
                                    </Tooltip>
                                </div>
                            </div>

                            {appUser?.role === 'student' && (
                                <div className="space-y-3">
                                    <div className="px-4">
                                        <h2 className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2 flex items-center gap-1.5">
                                            <GraduationCap className="w-3.5 h-3.5" />
                                            Student Toolkit
                                        </h2>
                                        <div className="h-[1px] w-full bg-green-500/10 dark:bg-green-500/5"></div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link
                                                    href="/ai-career-chat"
                                                    onClick={onClose}
                                                    aria-label="AI Career Chat"
                                                    className={linkClasses(pathname === '/ai-career-chat')}
                                                >
                                                    <div className="p-1 rounded-md bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/40 dark:border-zinc-800/40">
                                                        <Bot className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <span className="text-xs font-bold uppercase tracking-wider">
                                                        AI Career Chat
                                                    </span>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">AI Career Chat</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link
                                                    href="/resume-analyzer"
                                                    onClick={onClose}
                                                    aria-label="Resume Analyzer"
                                                    className={linkClasses(pathname === '/resume-analyzer')}
                                                >
                                                    <div className="p-1 rounded-md bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/40 dark:border-zinc-800/40">
                                                        <FileText className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <span className="text-xs font-bold uppercase tracking-wider">
                                                        Resume Analyzer
                                                    </span>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">Resume Analyzer</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link
                                                    href="/resume-builder"
                                                    onClick={onClose}
                                                    aria-label="Resume Builder"
                                                    className={linkClasses(pathname === '/resume-builder')}
                                                >
                                                    <div className="p-1 rounded-md bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/40 dark:border-zinc-800/40">
                                                        <PenTool className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <span className="text-xs font-bold uppercase tracking-wider">
                                                        Resume Builder
                                                    </span>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">Resume Builder</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link
                                                    href="/cover-letter"
                                                    onClick={onClose}
                                                    aria-label="Cover Letter Generator"
                                                    className={linkClasses(pathname === '/cover-letter')}
                                                >
                                                    <div className="p-1 rounded-md bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/40 dark:border-zinc-800/40">
                                                        <MessageSquare className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <span className="text-xs font-bold uppercase tracking-wider">
                                                        Cover Letter
                                                    </span>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">Cover Letter</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link
                                                    href="/roadmaps"
                                                    onClick={onClose}
                                                    aria-label="Career Roadmaps"
                                                    className={linkClasses(pathname === '/roadmaps')}
                                                >
                                                    <div className="p-1 rounded-md bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/40 dark:border-zinc-800/40">
                                                        <Map className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <span className="text-xs font-bold uppercase tracking-wider">
                                                        Roadmaps
                                                    </span>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">Roadmaps</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            )}

                            {(appUser?.role === 'teacher' || appUser?.role === 'admin') && (
                                <div className="space-y-3">
                                    <div className="px-4">
                                        <h2 className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1.5">
                                            <BarChart3 className="w-3.5 h-3.5" />
                                            Teacher Panel
                                        </h2>
                                        <div className="h-[1px] w-full bg-purple-500/10 dark:bg-purple-500/5"></div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link
                                                    href="/dashboard/analytics"
                                                    onClick={onClose}
                                                    aria-label="Class Analytics"
                                                    className={linkClasses(pathname === '/dashboard/analytics')}
                                                >
                                                    <div className="p-1 rounded-md bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/40 dark:border-zinc-800/40">
                                                        <BarChart3 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                                    </div>

                                                    <span className="text-xs font-bold uppercase tracking-wider">
                                                        Class Analytics
                                                    </span>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">Class Analytics</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            )}

                            {appUser?.role === 'admin' && (
                                <div className="space-y-3">
                                    <div className="px-4">
                                        <h2 className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            Admin Panel
                                        </h2>
                                        <div className="h-[1px] w-full bg-rose-500/10 dark:bg-rose-500/5"></div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link
                                                    href="/admin"
                                                    onClick={onClose}
                                                    aria-label="Overview Dashboard"
                                                    className={linkClasses(pathname === '/admin')}
                                                >
                                                    <div className="p-1 rounded-md bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/40 dark:border-zinc-800/40">
                                                        <LayoutDashboard className="w-3.5 h-3.5 text-rose-500" />
                                                    </div>

                                                    <span className="text-xs font-bold uppercase tracking-wider">
                                                        Overview
                                                    </span>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">Overview</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Link
                                                    href="/admin/moderation"
                                                    onClick={onClose}
                                                    aria-label="Content Moderation"
                                                    className={linkClasses(pathname === '/admin/moderation')}
                                                >
                                                    <div className="p-1 rounded-md bg-slate-50 dark:bg-zinc-900/60 border border-slate-200/40 dark:border-zinc-800/40">
                                                        <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                                                    </div>

                                                    <span className="text-xs font-bold uppercase tracking-wider">
                                                        Moderation
                                                    </span>
                                                </Link>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-zinc-900 text-white border-zinc-800 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shadow-md">Moderation</TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            )}
                        </nav>

                        <div className="p-4 border-t border-slate-100 dark:border-zinc-900/60 bg-slate-50/20 dark:bg-zinc-950/10 space-y-4">
                            <div className="text-[10px] text-center uppercase tracking-wider font-bold text-slate-400 dark:text-zinc-500">
                                © 2026 DoubtDesk
                            </div>
                        </div>
                    </div>
                </aside>
            </TooltipProvider>
        </>
    )
}