export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-4xl animate-pulse space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="space-y-3">
            <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-4 w-64 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
        <div className="h-80 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900" />
      </div>
    </div>
  );
}
