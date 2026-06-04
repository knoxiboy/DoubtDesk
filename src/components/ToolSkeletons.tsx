import { Skeleton } from "@/components/ui/skeleton"

export function RoadmapSkeleton() {
    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Header Skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-10 w-3/4 rounded-2xl" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-2/3 rounded-lg" />
            </div>

            {/* Milestones Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="p-8 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 space-y-6">
                        <Skeleton className="h-6 w-1/4 rounded-full" />
                        <Skeleton className="h-8 w-full rounded-xl" />
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-full rounded-lg" />
                            <Skeleton className="h-4 w-full rounded-lg" />
                            <Skeleton className="h-4 w-3/4 rounded-lg" />
                        </div>
                        <div className="pt-4 border-t border-zinc-100">
                            <Skeleton className="h-4 w-1/2 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export function ResumeAnalysisSkeleton() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
            {/* Score Card Skeleton */}
            <div className="lg:col-span-1 bg-zinc-900 rounded-[2.5rem] p-10 space-y-10 border border-slate-200 dark:border-white/5">
                <Skeleton className="h-4 w-1/3 bg-slate-200 dark:bg-white/10 rounded-full" />
                <div className="flex justify-center">
                    <Skeleton className="w-48 h-48 rounded-full bg-slate-100 dark:bg-white/5" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-4 w-full bg-slate-200 dark:bg-white/10 rounded-lg" />
                    <Skeleton className="h-4 w-5/6 bg-slate-200 dark:bg-white/10 rounded-lg" />
                </div>
                <Skeleton className="h-12 w-full bg-slate-200 dark:bg-white/10 rounded-2xl" />
            </div>

            {/* Analysis Details Skeleton */}
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-[2.5rem] p-10 border border-zinc-100 space-y-8">
                    <Skeleton className="h-8 w-1/2 rounded-xl" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex gap-4 p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                                <Skeleton className="h-12 w-full rounded-xl" />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[1, 2].map((i) => (
                        <div key={i} className="bg-zinc-50 rounded-[2.5rem] p-10 border border-zinc-100 space-y-6">
                            <Skeleton className="h-6 w-1/3 rounded-lg" />
                            <div className="space-y-3">
                                <Skeleton className="h-10 w-full rounded-xl" />
                                <Skeleton className="h-10 w-full rounded-xl" />
                                <Skeleton className="h-10 w-full rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export function CoverLetterSkeleton() {
    return (
        <div className="bg-zinc-50 rounded-[2.5rem] p-8 border border-zinc-200 h-full flex flex-col space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <Skeleton className="h-6 w-32 rounded-lg" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                    <Skeleton className="w-32 h-10 rounded-xl" />
                </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl p-10 border border-zinc-200 space-y-6">
                <div className="space-y-4">
                    <Skeleton className="h-4 w-1/4 rounded-lg" />
                    <Skeleton className="h-4 w-1/3 rounded-lg" />
                </div>
                <div className="space-y-4 pt-8">
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-4 w-5/6 rounded-lg" />
                </div>
                <div className="space-y-4 pt-4">
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-4 w-4/5 rounded-lg" />
                </div>
                <div className="space-y-4 pt-8">
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4 rounded-lg" />
                </div>
            </div>
        </div>
    )
}
