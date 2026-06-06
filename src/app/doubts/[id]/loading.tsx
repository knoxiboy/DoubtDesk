export default function DoubtDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-8" />

        <div className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-[2rem] p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          </div>

          <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4" />
          <div className="space-y-3 mb-6">
            <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-4/6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>

          <div className="space-y-4 mt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 p-4 bg-slate-100/50 dark:bg-slate-800/30 rounded-2xl">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
