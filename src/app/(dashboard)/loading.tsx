/**
 * Global loading skeleton for the dashboard route group.
 * Next.js renders this instantly on every navigation while the next page's
 * server component is still fetching data — critical UX win on slow DBs
 * (Aiven free tier in our case). Per-route loading.tsx files override this.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header */}
      <div className="space-y-2">
        <div className="h-5 w-48 rounded bg-gray-200 dark:bg-slate-800" />
        <div className="h-3 w-80 rounded bg-gray-200/70 dark:bg-slate-800/60" />
      </div>

      {/* KPI / filter row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-md border border-gray-100 dark:border-slate-800 bg-gray-100/60 dark:bg-slate-900/40"
          />
        ))}
      </div>

      {/* Main content block */}
      <div className="space-y-3">
        <div className="h-10 rounded-md bg-gray-100 dark:bg-slate-900" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-md border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900/50"
          />
        ))}
      </div>
    </div>
  );
}
