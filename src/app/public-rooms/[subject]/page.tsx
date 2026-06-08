"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageSquare, Plus, Loader2 } from "lucide-react";
import AskDoubt from "@/components/AskDoubt";
import DoubtCard from "@/components/DoubtCard";
import DoubtSortSelect, { DoubtSortValue } from "@/components/DoubtSortSelect";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import useSWRInfinite from "swr/infinite";
import { useInView } from "react-intersection-observer";

const PAGE_SIZE = 20;

export default function PublicRoomPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subject = params.subject as string;
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);

  const sort = (searchParams.get("sort") as DoubtSortValue) || "newest";

  const fetcher = (url: string) => fetch(url).then(res => res.json());
  const updateSort = (nextSort: DoubtSortValue) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (nextSort === "newest") {
      nextParams.delete("sort");
    } else {
      nextParams.set("sort", nextSort);
    }

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    setSize(1);
  };

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData) {
      const hasMore = Array.isArray(previousPageData)
        ? previousPageData.length === PAGE_SIZE
        : previousPageData.hasMore;
      if (!hasMore) return null;
    }
    const params = new URLSearchParams({
      subject,
      page: String(pageIndex + 1),
      limit: String(PAGE_SIZE),
    });

    if (sort !== "newest") {
      params.append("sort", sort);
    }

    return `/api/doubts?${params.toString()}`;
  };

  const { data, isLoading, size, setSize, mutate } = useSWRInfinite(getKey, fetcher, {
    revalidateFirstPage: false
  });

  const doubts = data
    ? data.flatMap((page: any) =>
        page
          ? Array.isArray(page)
            ? page
            : (page.doubts || [])
          : []
      )
    : [];
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
  const lastPage = data ? data[data.length - 1] : null;
  const isReachingEnd =
    data &&
    (Array.isArray(lastPage)
      ? lastPage.length < PAGE_SIZE
      : !lastPage?.hasMore);

  const { ref: loadMoreRef, inView } = useInView();

  useEffect(() => {
    if (inView && !isReachingEnd && !isLoadingMore) {
      setSize(size + 1);
    }
  }, [inView, isReachingEnd, isLoadingMore]);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto pb-24 text-slate-900 dark:text-zinc-100 bg-white dark:bg-black min-h-screen transition-colors duration-500 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 dark:from-blue-500/5 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0" />


      
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-100 dark:border-zinc-900/60 relative z-10">
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight capitalize">
            {subject} Room
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-sm font-medium leading-relaxed max-w-2xl">
            Ask and answer doubts anonymously in the <span className="text-blue-600 dark:text-blue-400 font-bold capitalize">{subject}</span> community.
          </p>
        </div>
        <button 
          onClick={() => setIsAskModalOpen(true)}
          aria-label="Ask a Doubt"
          className="flex items-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-lg shadow-blue-600/10 active:scale-[0.98] shrink-0"
        >
          <Plus className="w-5 h-5" />
          Ask a Doubt
        </button>
      </header>

      <div className="flex justify-end relative z-10">
        <DoubtSortSelect value={sort} onValueChange={updateSort} />
      </div>

      {isLoading && doubts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 relative z-10">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider text-xs">Loading Doubts...</p>
        </div>
      ) : doubts.length > 0 ? (
        <div className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doubts.map((doubt: any, index: number) => (
              <DoubtCard key={`${doubt.id}-${index}`} doubt={doubt} onUpdate={() => mutate()} />
            ))}
          </div>
          <div ref={loadMoreRef} className="py-8 flex justify-center">
            {isLoadingMore && <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50/30 dark:bg-zinc-950/10 border border-dashed border-slate-200 dark:border-zinc-900 rounded-2xl text-center px-6 shadow-sm relative z-10">
          <div className="w-16 h-16 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl flex items-center justify-center mb-6 shadow-sm">
            <MessageSquare className="w-7 h-7 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">No doubts yet!</h2>
          <p className="text-slate-500 dark:text-zinc-400 max-w-sm mx-auto font-medium text-xs leading-relaxed mb-6">
            Be the first to start a conversation in the {subject} room. All posts are anonymous.
          </p>
          <button 
            onClick={() => setIsAskModalOpen(true)}
            aria-label="Post the first doubt"
            className="px-6 py-3.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/60 rounded-xl font-bold uppercase tracking-wider text-xs transition-all duration-300 shadow-sm"
          >
            Post the first doubt
          </button>
        </div>
      )}

      {isAskModalOpen && (
        <AskDoubt 
          defaultSubject={subject} 
          isOpen={isAskModalOpen} 
          onClose={() => setIsAskModalOpen(false)} 
          onSuccess={() => {
            setIsAskModalOpen(false);
            mutate();
          }}
        />
      )}
    </div>
  );
}