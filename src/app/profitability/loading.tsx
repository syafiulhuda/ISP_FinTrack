// src/app/profitability/loading.tsx
// Profitability page skeleton — Pixel-perfect heights untuk zero CLS
// h-[300px] untuk chart utama, h-[120px] untuk KPI cards

export default function ProfitabilityLoading() {
  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-9 w-72 skeleton-theme rounded-xl"/>
        <div className="h-4 w-56 skeleton-theme rounded-lg"/>
      </div>

      {/* Date Range Filter Skeleton */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="h-10 w-64 skeleton-theme rounded-xl"/>
        <div className="h-10 w-32 skeleton-theme rounded-xl"/>
      </div>

      {/* KPI Cards — h-[120px] pixel-perfect */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[140px] lg:h-[200px] skeleton-theme rounded-3xl"
          />
        ))}
      </div>

      {/* Revenue Waterfall Chart — h-[300px] pixel-perfect */}
      <div className="bg-card rounded-[2.5rem] p-8 shadow-sm border border-border">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-7 w-48 skeleton-card rounded-xl"/>
            <div className="h-4 w-64 skeleton-card rounded-lg"/>
          </div>
        </div>
        <div className="h-[300px] w-full skeleton-card rounded-xl"/>
      </div>

      {/* Profitability Trend Chart — h-[300px] pixel-perfect */}
      <div className="bg-card rounded-[2.5rem] p-8 shadow-sm border border-border">
        <div className="space-y-2 mb-8">
          <div className="h-7 w-52 skeleton-card rounded-xl"/>
          <div className="h-4 w-48 skeleton-card rounded-lg"/>
        </div>
        <div className="h-[300px] w-full skeleton-card rounded-xl"/>
      </div>

      {/* Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card rounded-3xl p-8 border border-border">
          <div className="h-6 w-40 skeleton-card rounded-xl mb-6"/>
          <div className="h-[220px] skeleton-card rounded-xl"/>
        </div>
        <div className="bg-card rounded-3xl p-8 border border-border">
          <div className="h-6 w-40 skeleton-card rounded-xl mb-6"/>
          <div className="h-[220px] skeleton-card rounded-xl"/>
        </div>
      </div>
    </div>
  );
}
