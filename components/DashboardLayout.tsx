"use client"

import { useState } from "react"
import { SignedIn, UserButton, useClerk } from "@clerk/nextjs"
import Sidebar from "@/components/Sidebar"
import { Menu, LogOut, User } from "lucide-react"
import Link from "next/link"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [showSignOutDialog, setShowSignOutDialog] = useState(false)
    const { signOut } = useClerk()

    const handleSignOut = async () => {
        await signOut({ redirectUrl: '/' })
    }

    return (
        <div className="flex h-screen bg-slate-950 overflow-hidden text-slate-200">
            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="bg-slate-950/80 backdrop-blur-xl border-b border-white/5 z-20 shrink-0 h-20 flex items-center">
                    <div className="flex-1 flex items-center justify-between px-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden p-2 text-slate-400 hover:bg-white/5 rounded-lg mr-2"
                                aria-label="Open sidebar"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <SignedIn>
                                <div className="flex items-center gap-4">
                                    <Link href="/profile" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                                        Profile
                                    </Link>
                                    <UserButton
                                        appearance={{
                                            elements: {
                                                userButtonPopoverActionButton__signOut: {
                                                    display: "none"
                                                },
                                                userButtonPopoverFooter: {
                                                    display: "none"
                                                },
                                                userButtonAvatarBox: "w-10 h-10 border border-white/10"
                                            }
                                        }}
                                    >
                                        <UserButton.MenuItems>
                                            <UserButton.Link
                                                label="Profile"
                                                labelIcon={<User className="w-4 h-4" />}
                                                href="/profile"
                                            />
                                            <UserButton.Action
                                                label="Sign Out"
                                                labelIcon={<LogOut className="w-4 h-4" />}
                                                onClick={() => setShowSignOutDialog(true)}
                                            />
                                        </UserButton.MenuItems>
                                    </UserButton>
                                </div>
                            </SignedIn>
                        </div>
                    </div>
                </header>

                {/* Confirm Sign Out Dialog */}
                <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
                    <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                                You will need to log in again to access your dashboard and AI tools.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleSignOut}
                                className="bg-red-600 hover:bg-red-700 text-white border-none"
                            >
                                Sign Out
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Scrollable Content */}
                <main className="flex-1 overflow-auto bg-slate-950">
                    {children}
                </main>
            </div>
        </div>
    )
}
