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
import NotificationBell from "@/components/NotificationBell"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [showSignOutDialog, setShowSignOutDialog] = useState(false)

    const { signOut } = useClerk()

    const handleSignOut = async () => {
        await signOut({ redirectUrl: "/" })
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 text-foreground transition-colors duration-300">
            {/* Sidebar */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main Content */}
            <div className="flex flex-1 min-w-0 flex-col">
                {/* Header */}
                <header className="sticky top-0 z-20 flex h-16 md:h-20 shrink-0 items-center border-b border-border/60 bg-background/70 backdrop-blur-2xl shadow-sm transition-colors duration-300">
                    <div className="flex flex-1 items-center justify-between px-4 md:px-6">
                        {/* Left Section */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden p-2.5 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200 hover:scale-105"
                                aria-label="Open sidebar"
                            >
                                <Menu className="w-5 h-5" />
                            </button>

                            <div className="hidden md:flex flex-col">
                                <h1 className="text-sm font-semibold tracking-wide text-foreground">
                                    Dashboard
                                </h1>
                                <p className="text-xs text-muted-foreground">
                                    Welcome back to DoubtDesk
                                </p>
                            </div>
                        </div>

                        {/* Right Section */}
                        <div className="flex items-center gap-3 md:gap-4">
                            <ThemeToggle />

                            <SignedIn>
                                <div className="flex items-center gap-3">
                                    <NotificationBell />
                                    
                                    <Link
                                        href="/profile"
                                        className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-blue-400 transition-all duration-200"
                                    >
                                        Profile
                                    </Link>

                                    <UserButton
                                        appearance={{
                                            elements: {
                                                userButtonPopoverActionButton__signOut: {
                                                    display: "none",
                                                },
                                                userButtonPopoverFooter: {
                                                    display: "none",
                                                },
                                                userButtonAvatarBox:
                                                    "w-10 h-10 border border-border hover:scale-105 transition-transform duration-200",
                                            },
                                        }}
                                    >
                                        <UserButton.MenuItems>
                                            <UserButton.Link
                                                label="Profile"
                                                labelIcon={
                                                    <User className="w-4 h-4" />
                                                }
                                                href="/profile"
                                            />

                                            <UserButton.Action
                                                label="Sign Out"
                                                labelIcon={
                                                    <LogOut className="w-4 h-4" />
                                                }
                                                onClick={() =>
                                                    setShowSignOutDialog(true)
                                                }
                                            />
                                        </UserButton.MenuItems>
                                    </UserButton>
                                </div>
                            </SignedIn>
                        </div>
                    </div>
                </header>

                {/* Sign Out Dialog */}
                <AlertDialog
                    open={showSignOutDialog}
                    onOpenChange={setShowSignOutDialog}
                >
                    <AlertDialogContent className="bg-popover/95 backdrop-blur-xl border border-border/60 text-popover-foreground shadow-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Are you sure you want to sign out?
                            </AlertDialogTitle>

                            <AlertDialogDescription className="text-muted-foreground">
                                You will need to log in again to access your
                                dashboard and AI tools.
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <AlertDialogFooter>
                            <AlertDialogCancel className="border-border bg-background text-foreground hover:bg-accent">
                                Cancel
                            </AlertDialogCancel>

                            <AlertDialogAction
                                onClick={handleSignOut}
                                className="border-none bg-red-600 text-white hover:bg-red-700"
                            >
                                Sign Out
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto bg-background/40 backdrop-blur-sm scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent transition-colors duration-300">
                    <div className="p-4 md:p-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}