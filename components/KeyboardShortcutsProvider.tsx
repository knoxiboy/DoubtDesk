"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"

import { useTheme } from "next-themes"
import { useUser } from "@clerk/nextjs"

interface KeyboardShortcutsContextType {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
    toggleOpen: () => void
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined)

export function useKeyboardShortcuts() {
    const context = useContext(KeyboardShortcutsContext)
    if (context === undefined) {
        throw new Error("useKeyboardShortcuts must be used within a KeyboardShortcutsProvider")
    }
    return context
}

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const { setTheme, resolvedTheme } = useTheme()
    const { isSignedIn } = useUser()

    const toggleOpen = () => setIsOpen((prev) => !prev)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeEl = document.activeElement
            const isEditable = activeEl && (
                activeEl.tagName === 'INPUT' ||
                activeEl.tagName === 'TEXTAREA' ||
                activeEl.tagName === 'SELECT' ||
                activeEl.hasAttribute('contenteditable') ||
                activeEl.getAttribute('contenteditable') === 'true'
            )

            if (isEditable) return

            if (e.key === "?") {
                e.preventDefault()
                setIsOpen((prev) => !prev)
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    useHotkeys("esc", () => {
        setIsOpen(false)
    }, {
        enabled: isOpen,
    })

    useHotkeys("t", (e) => {
        e.preventDefault()
        const nextTheme = resolvedTheme === "dark" ? "light" : "dark"
        setTheme(nextTheme)
        if (isSignedIn) {
            fetch("/api/user/preferences", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ themePreference: nextTheme }),
            }).catch(() => {})
        }
    }, {
        enableOnFormTags: false,
    })

    return (
        <KeyboardShortcutsContext.Provider value={{ isOpen, setIsOpen, toggleOpen }}>
            {children}
            <KeyboardShortcutsHelp isOpen={isOpen} onOpenChange={setIsOpen} />
        </KeyboardShortcutsContext.Provider>
    )
}

function KeyboardShortcutsHelp({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const shortcuts = [
        { key: "Ctrl/Cmd + K", description: "Open global search" },
        { key: "Escape", description: "Close modals/dialogs" },
        { key: "T", description: "Toggle color theme" },
        { key: "?", description: "Show keyboard shortcuts help" },
    ]

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#0f172a] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Keyboard <span className="text-blue-500">Shortcuts</span></DialogTitle>
                    <DialogDescription className="text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        Boost your productivity with these shortcuts
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {shortcuts.map((shortcut, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{shortcut.description}</span>
                            <div className="flex gap-1">
                                {shortcut.key.split(" + ").map((k, j) => (
                                    <React.Fragment key={j}>
                                        <Kbd>{k}</Kbd>
                                        {j < shortcut.key.split(" + ").length - 1 && <span className="text-slate-500 dark:text-slate-500 self-center mx-1">+</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    )
}
