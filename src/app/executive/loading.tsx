// src/app/executive/loading.tsx
// Executive Summary page skeleton — 3 tabs: Financial, Inventory, Regional
// Pixel-perfect heights untuk zero CLS

export default function ExecutiveLoading() {
  return (
    <div className="min-h-screen pb-20">
      {/* Sticky Header Skeleton */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-black/80 border-b border-border p-4 md:px-8 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
          <div className="space-y-2">
            <div className="h-9 w-72 skeleton-theme rounded-xl"/>
            <div className="h-4 w-56 skeleton-theme rounded-lg"/>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-52 skeleton-theme rounded-[1rem]"/>
            <div className="h-10 w-36 skeleton-theme rounded-[1rem]"/>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="bg-muted p-1.5 rounded-2xl flex gap-1 w-fit">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className={`h-10 w-40 rounded-xl ${
                i === 0
                  ? 'skeleton-theme'
                  : 'animate-pulse bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 md:p-8 space-y-8">
        {/* KPI Cards — h-[120px] pixel-perfect */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[120px] skeleton-theme rounded-2xl"
            />
          ))}
        </div>

        {/* Trajectory Chart — h-[320px] pixel-perfect */}
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
          <div className="h-6 w-56 skeleton-card rounded-xl mb-6"/>
          <div className="h-[320px] w-full skeleton-card rounded-2xl"/>
        </div>

        {/* Two column charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card p-6 rounded-3xl border border-border">
            <div className="h-6 w-40 skeleton-card rounded-xl mb-6"/>
            <div className="h-[260px] skeleton-card rounded-xl"/>
          </div>
          <div className="bg-card p-6 rounded-3xl border border-border">
            <div className="h-6 w-40 skeleton-card rounded-xl mb-6"/>
            <div className="h-[260px] skeleton-card rounded-xl"/>
          </div>
        </div>
      </div>
    </div>
  );
}
