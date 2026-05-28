// src/app/regional/loading.tsx
// Regional Analysis page skeleton — Pixel-perfect heights untuk zero CLS

export default function RegionalLoading() {
 return (
 <div className="space-y-8 pb-10">
 {/* Header */}
 <div className="space-y-2">
 <div className="h-9 w-64 bg-muted animate-pulse rounded-xl"/>
 <div className="h-4 w-48 bg-muted animate-pulse rounded-lg"/>
 </div>

 {/* Filter bar */}
 <div className="flex flex-wrap gap-3">
 {Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="h-10 w-36 bg-muted animate-pulse rounded-xl"/>
 ))}
 </div>

 {/* KPI Cards — h-[100px] */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="h-[100px] bg-muted animate-pulse rounded-3xl"/>
 ))}
 </div>

 {/* Main charts grid */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 {/* Map/chart 1 — h-[300px] */}
 <div className="bg-card rounded-[2.5rem] p-8 border border-border">
 <div className="h-6 w-44 bg-muted animate-pulse rounded-xl mb-6"/>
 <div className="h-[300px] w-full bg-muted animate-pulse rounded-xl"/>
 </div>

 {/* Chart 2 — h-[300px] */}
 <div className="bg-card rounded-[2.5rem] p-8 border border-border">
 <div className="h-6 w-40 bg-muted animate-pulse rounded-xl mb-6"/>
 <div className="h-[300px] w-full bg-muted animate-pulse rounded-xl"/>
 </div>
 </div>

 {/* AR Aging Table */}
 <div className="bg-card rounded-[2.5rem] p-8 border border-border">
 <div className="h-6 w-44 bg-muted animate-pulse rounded-xl mb-6"/>
 <div className="h-[300px] w-full bg-muted animate-pulse rounded-xl"/>
 </div>
 </div>
 );
}
