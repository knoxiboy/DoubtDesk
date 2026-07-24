"use client";

import { ArrowUpDown } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export type DoubtSortValue = "newest" | "popular" | "most-replied" | "unsolved";

const sortOptions: Array<{ value: DoubtSortValue; label: string; description: string }> = [
    { value: "newest", label: "Newest", description: "Pinned first, then latest doubts" },
    { value: "popular", label: "Popular", description: "Most likes first" },
    { value: "most-replied", label: "Most replied", description: "Most engagement first" },
    { value: "unsolved", label: "Unsolved", description: "Open doubts only" },
];

interface DoubtSortSelectProps {
    value: DoubtSortValue;
    onValueChange: (value: DoubtSortValue) => void;
    className?: string;
}

export default function DoubtSortSelect({ value, onValueChange, className }: DoubtSortSelectProps) {
    return (
        <div className={`flex items-center gap-3 ${className || ""}`}>
            <div className="hidden sm:flex h-11 items-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/5 px-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                <ArrowUpDown className="w-4 h-4 text-blue-500" />
                Sort
            </div>
            <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as DoubtSortValue)}>
                <SelectTrigger className="h-11 min-w-[12rem] rounded-2xl border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-950/60 text-slate-900 dark:text-white shadow-sm">
                    <SelectValue placeholder="Newest" />
                </SelectTrigger>
                <SelectContent>
                    {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            <span className="flex flex-col items-start">
                                <span>{option.label}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400">{option.description}</span>
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}