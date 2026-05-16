import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function CustomerLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-20 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-start tablet:items-center gap-4 w-full">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 w-11 h-11 shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl w-64" />
            <div className="flex gap-2">
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-20" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-32" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 w-full tablet:w-auto">
          <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full tablet:w-40" />
          <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl w-full tablet:w-40" />
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 h-32" />
        ))}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* Left Column */}
        <div className="flex flex-col gap-8 h-full">
          {/* Health Gauge Skeleton */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 h-64 flex flex-col items-center justify-center gap-4">
            <div className="w-32 h-32 rounded-full border-8 border-slate-100 dark:border-slate-800" />
            <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded-lg w-24" />
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 h-80" />
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 flex flex-col gap-8 h-full">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 h-96" />
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 h-64" />
        </div>
      </div>
    </div>
  );
}
