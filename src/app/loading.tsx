// src/app/loading.tsx
// Dashboard page skeleton — TTFB instan karena di-render sebelum data fetching
// WAJIB: Skeleton height harus pixel-perfect match dengan chart (h-[300px], h-[220px])
// untuk mencegah CLS saat data tiba

export default function DashboardLoading() {
  return (
    <div className="space-y-8 pb-10">
      {/* Header Skeleton */}
      <div className="flex flex-row items-start md:items-center justify-between gap-2 md:gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-9 w-64 skeleton-theme rounded-xl"/>
          <div className="h-4 w-40 skeleton-theme rounded-lg"/>
        </div>
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          <div className="text-right space-y-1">
            <div className="h-3 w-20 skeleton-theme rounded"/>
            <div className="h-4 w-24 skeleton-theme rounded"/>
          </div>
          <div className="w-10 h-10 md:w-12 md:h-12 skeleton-theme rounded-xl"/>
        </div>
      </div>

      {/* KPI Cards Skeleton — h-[140px] pixel-perfect */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[140px] skeleton-theme rounded-3xl"
          />
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart — h-[300px] pixel-perfect */}
        <div className="lg:col-span-2 bg-card rounded-[2.5rem] p-10 shadow-sm border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="space-y-2">
              <div className="h-7 w-44 skeleton-card rounded-xl"/>
              <div className="h-4 w-56 skeleton-card rounded-lg"/>
            </div>
            <div className="h-10 w-32 skeleton-card rounded-xl"/>
          </div>
          <div className="h-[300px] w-full skeleton-card rounded-xl"/>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Customer Growth Chart — h-[220px] pixel-perfect */}
          <div className="bg-card rounded-[2.5rem] p-10 border border-border shadow-sm">
            <div className="mb-8 space-y-2">
              <div className="h-7 w-40 skeleton-card rounded-xl"/>
              <div className="h-4 w-48 skeleton-card rounded-lg"/>
            </div>
            <div className="h-[220px] w-full skeleton-card rounded-xl"/>
          </div>

          {/* CTA Card */}
          <div className="skeleton-theme rounded-3xl p-8 h-[160px]"/>
        </div>
      </div>
    </div>
  );
}
