"use client"

import React, { createContext, useContext, useState } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"

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

    const toggleOpen = () => setIsOpen((prev) => !prev)

    useHotkeys("?", (e) => {
        e.preventDefault()
        toggleOpen()
    }, {
        enableOnFormTags: false,
    })

    useHotkeys("esc", () => {
        setIsOpen(false)
    }, {
        enabled: isOpen,
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
        { key: "N", description: "New doubt (on classroom page)" },
        { key: "Ctrl/Cmd + Enter", description: "Submit doubt/reply form" },
        { key: "Escape", description: "Close modals/dialogs" },
        { key: "?", description: "Show keyboard shortcuts help" },
    ]

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-[#0f172a] border-white/10 text-white rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase italic tracking-tight">Keyboard <span className="text-blue-500">Shortcuts</span></DialogTitle>
                    <DialogDescription className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                        Boost your productivity with these shortcuts
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {shortcuts.map((shortcut, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-sm font-medium text-slate-300">{shortcut.description}</span>
                            <div className="flex gap-1">
                                {shortcut.key.split(" + ").map((k, j) => (
                                    <React.Fragment key={j}>
                                        <Kbd>{k}</Kbd>
                                        {j < shortcut.key.split(" + ").length - 1 && <span className="text-slate-500 self-center mx-1">+</span>}
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
