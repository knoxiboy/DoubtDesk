export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-8 w-56 rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-40 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
