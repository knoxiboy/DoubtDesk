"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor, Palette, Sparkles, Zap, Leaf, Check } from "lucide-react";
import { useTheme } from "next-themes";
import { useUser } from "@clerk/nextjs";

import { cn } from "@/lib/utils/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ThemeToggleProps = {
    className?: string;
};

export const THEME_OPTIONS = [
    {
        id: "light",
        label: "Light",
        icon: Sun,
        colorBg: "bg-amber-500",
    },
    {
        id: "dark",
        label: "Dark",
        icon: Moon,
        colorBg: "bg-slate-800",
    },
    {
        id: "midnight",
        label: "Midnight Blue",
        icon: Sparkles,
        colorBg: "bg-indigo-600",
    },
    {
        id: "cyberpunk",
        label: "Cyberpunk",
        icon: Zap,
        colorBg: "bg-pink-500",
    },
    {
        id: "emerald",
        label: "Emerald",
        icon: Leaf,
        colorBg: "bg-emerald-500",
    },
    {
        id: "system",
        label: "System",
        icon: Monitor,
        colorBg: "bg-slate-400",
    },
] as const;

export function ThemeToggle({ className }: ThemeToggleProps) {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const { isSignedIn } = useUser();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!isSignedIn) return;

        fetch("/api/user/preferences")
            .then((res) => res.json())
            .then((data) => {
                if (data.themePreference) {
                    setTheme(data.themePreference);
                }
            })
            .catch(() => {});
    }, [isSignedIn, setTheme]);

    async function handleSelectTheme(themeId: string) {
        setTheme(themeId);

        if (isSignedIn) {
            fetch("/api/user/preferences", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ themePreference: themeId }),
            }).catch(() => {});
        }
    }

    const isDark = mounted ? resolvedTheme === "dark" || resolvedTheme === "midnight" || resolvedTheme === "cyberpunk" || resolvedTheme === "emerald" : true;
    const nextTheme = isDark ? "light" : "dark";

    const currentOption = THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS.find((t) => t.id === "system");
    const IconComponent = currentOption ? currentOption.icon : (isDark ? Moon : Sun);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={`Switch to ${nextTheme} mode`}
                    title={`Current theme: ${theme || "system"}. Click to customize theme.`}
                    className={cn(
                        "relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white/80 text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                        className
                    )}
                >
                    <IconComponent className="h-5 w-5 transition-transform duration-300 hover:scale-110" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
                <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5" />
                    Theme Customizer
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                {THEME_OPTIONS.map((option) => {
                    const OptionIcon = option.icon;
                    const isActive = theme === option.id;
                    return (
                        <DropdownMenuItem
                            key={option.id}
                            onClick={() => handleSelectTheme(option.id)}
                            className={cn(
                                "flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/80 focus:bg-slate-100 dark:focus:bg-slate-800/80",
                                isActive ? "bg-slate-100/80 text-blue-600 font-semibold dark:bg-slate-800 dark:text-blue-400" : "text-slate-700 dark:text-slate-300"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className={cn("h-2.5 w-2.5 rounded-full ring-2 ring-slate-200 dark:ring-slate-700", option.colorBg)} />
                                <OptionIcon className="h-4 w-4" />
                                <span>{option.label}</span>
                            </div>
                            {isActive && <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
