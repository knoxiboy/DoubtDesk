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
import { ThemeToggle } from "@/components/ThemeToggle"

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
        <div className="flex h-screen bg-background overflow-hidden text-foreground transition-colors duration-300">
            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="bg-background/80 backdrop-blur-xl border-b border-border z-20 shrink-0 h-20 flex items-center transition-colors duration-300">
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
                            <ThemeToggle />
                            <SignedIn>
                                <div className="flex items-center gap-4">
                                    <Link href="/profile" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
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
                                                userButtonAvatarBox: "w-10 h-10 border border-border"
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
                    <AlertDialogContent className="bg-popover border-border text-popover-foreground">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                                You will need to log in again to access your dashboard and AI tools.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-background border-border text-foreground hover:bg-accent">Cancel</AlertDialogCancel>
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
                <main className="flex-1 overflow-auto bg-background transition-colors duration-300">
                    {children}
                </main>
            </div>
        </div>
    )
}
