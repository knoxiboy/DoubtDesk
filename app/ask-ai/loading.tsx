export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto grid max-w-7xl animate-pulse gap-6 lg:grid-cols-[320px_1fr]">
        <div className="h-[32rem] rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900" />
        <div className="space-y-4">
          <div className="h-10 w-56 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="h-[26rem] rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900" />
          <div className="h-14 rounded-xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
