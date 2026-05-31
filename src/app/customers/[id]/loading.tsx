import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function CustomerLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start tablet:items-center gap-4 w-full">
          <div className="p-3 skeleton-theme rounded-2xl border border-border w-11 h-11 shrink-0"/>
          <div className="flex-1 space-y-3">
            <div className="h-8 skeleton-theme rounded-xl w-64"/>
            <div className="flex gap-2">
              <div className="h-4 skeleton-theme rounded-lg w-20"/>
              <div className="h-4 skeleton-theme rounded-lg w-32"/>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full xl:w-auto shrink-0">
          <div className="h-10 sm:h-12 skeleton-theme rounded-2xl w-full sm:w-32 tablet:w-40"/>
          <div className="h-10 sm:h-12 skeleton-theme rounded-2xl w-full sm:w-32 tablet:w-40"/>
          <div className="h-10 sm:h-12 skeleton-theme rounded-2xl w-full sm:w-32 tablet:w-40"/>
          <div className="h-10 sm:h-12 skeleton-theme rounded-2xl w-full sm:w-32 tablet:w-40"/>
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card p-6 rounded-3xl border border-border h-32">
            <div className="w-8 h-8 skeleton-card rounded-xl mb-3"/>
            <div className="h-3 skeleton-card rounded w-20 mb-2"/>
            <div className="h-6 skeleton-card rounded-lg w-24"/>
          </div>
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* Left Column */}
        <div className="flex flex-col gap-8 h-full">
          {/* Health Gauge Skeleton */}
          <div className="bg-card p-8 rounded-3xl border border-border h-64 flex flex-col items-center justify-center gap-4">
            <div className="w-32 h-32 rounded-full border-8 border-border skeleton-card"/>
            <div className="h-6 skeleton-card rounded-lg w-24"/>
          </div>
          
          <div className="bg-card p-8 rounded-3xl border border-border h-80">
            <div className="h-5 skeleton-card rounded-lg w-36 mb-6"/>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 skeleton-card rounded-2xl"/>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 flex flex-col gap-8 h-full">
          <div className="bg-card p-8 rounded-3xl border border-border h-96">
            <div className="h-6 skeleton-card rounded-lg w-48 mb-8"/>
            <div className="h-[300px] skeleton-card rounded-xl"/>
          </div>
          <div className="bg-card p-8 rounded-3xl border border-border h-64">
            <div className="h-5 skeleton-card rounded-lg w-36 mb-6"/>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 skeleton-card rounded-2xl"/>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
