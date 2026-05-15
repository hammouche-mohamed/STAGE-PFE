"use client";

import React from "react";

/**
 * Skeleton placeholders.
 *
 * Shown only on a genuine first load (no cached data). On every subsequent
 * visit SWR serves the cached data instantly, so these never flash.
 */

export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200/80 dark:bg-slate-800/80 ${className}`}
    />
  );
}

/** Rows of fake table cells — matches the admin list pages. */
export function TableSkeleton({
  rows = 8,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800">
      {/* header */}
      <div className="flex gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-gray-100 px-6 py-4 last:border-0 dark:border-slate-800/60"
        >
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          {Array.from({ length: cols - 1 }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-4 flex-1"
              // vary widths so it reads as content, not a grid
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Grid of fake cards — matches topic / dashboard card layouts. */
export function CardGridSkeleton({
  count = 6,
  cols = 3,
}: {
  count?: number;
  cols?: number;
}) {
  const colClass =
    cols === 2
      ? "sm:grid-cols-2"
      : cols === 4
        ? "sm:grid-cols-2 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid grid-cols-1 gap-4 ${colClass}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="space-y-4 rounded-xl border border-gray-200 p-5 dark:border-slate-800"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Row of stat tiles — matches dashboard KPI headers. */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-xl border border-gray-200 p-5 dark:border-slate-800"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Vertical list rows — sidebar / simple lists. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
