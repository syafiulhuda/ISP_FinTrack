// src/app/profitability/loading.tsx
// Profitability page skeleton — Pixel-perfect heights untuk zero CLS
// h-[300px] untuk chart utama, h-[120px] untuk KPI cards

export default function ProfitabilityLoading() {
  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-9 w-72 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
        <div className="h-4 w-56 bg-slate-100 dark:bg-slate-700 animate-pulse rounded-lg" />
      </div>

      {/* Date Range Filter Skeleton */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="h-10 w-64 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
        <div className="h-10 w-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
      </div>

      {/* KPI Cards — h-[120px] pixel-perfect */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[140px] lg:h-[200px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl"
          />
        ))}
      </div>

      {/* Revenue Waterfall Chart — h-[300px] pixel-perfect */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
            <div className="h-4 w-64 bg-slate-100 dark:bg-slate-700 animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="h-[300px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
      </div>

      {/* Profitability Trend Chart — h-[300px] pixel-perfect */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="space-y-2 mb-8">
          <div className="h-7 w-52 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl" />
          <div className="h-4 w-48 bg-slate-100 dark:bg-slate-700 animate-pulse rounded-lg" />
        </div>
        <div className="h-[300px] w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
      </div>

      {/* Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
          <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl mb-6" />
          <div className="h-[220px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800">
          <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl mb-6" />
          <div className="h-[220px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
        </div>
      </div>
    </div>
  );
}
