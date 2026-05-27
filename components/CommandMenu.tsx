"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    Search,
    MessageSquare,
    School,
    Brain,
    Zap
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { useKeyboardShortcut, COMMON_SHORTCUTS } from "@/hooks/useKeyboardShortcut"
import { ShortcutBadge } from "@/components/ui/ShortcutBadge"

export function CommandMenu() {
    const [open, setOpen] = React.useState(false)
    const router = useRouter()

    // Use the new keyboard shortcut hook for Ctrl + K
    useKeyboardShortcut({
        ...COMMON_SHORTCUTS.SEARCH,
        onTrigger: () => setOpen((open) => !open),
        enabled: true
    })

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <div className="flex items-center justify-between px-3 py-2 border-b">
                <CommandInput placeholder="Type a command or search..." className="flex-1" />
                <ShortcutBadge shortcut="Esc" compact className="ml-2" />
            </div>
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                        <Search className="mr-2 h-4 w-4" />
                        <span>Search Doubts</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/rooms"))}>
                        <School className="mr-2 h-4 w-4" />
                        <span>Virtual Campus</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/public-rooms"))}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        <span>Public Doubts</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/ask-ai"))}>
                        <Zap className="mr-2 h-4 w-4" />
                        <span>Ask AI Solver</span>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    )
}
