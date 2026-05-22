export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-7xl animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900"
            />
          ))}
        </div>
        <div className="h-96 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900" />
      </div>
    </div>
  );
}
