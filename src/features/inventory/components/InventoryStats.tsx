"use client";

import { m } from "framer-motion";
import { Cpu, CheckCircle2, AlertCircle, Warehouse, Settings, RefreshCw, BarChart3, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const IconMap = {
  "trending-up": Cpu,
  "check-circle": CheckCircle2,
  "warning": AlertCircle,
  "warehouse": Warehouse,
  "settings": Settings,
  "refresh": RefreshCw,
  "chart": BarChart3,
  "clock": Clock
};

const STATS_SKELETON_ITEMS = Array.from({ length: 4 });

interface StatData {
  label: string;
  value: string;
  trend: string;
  isAlert?: boolean;
  trendIcon: string;
}

interface InventoryStatsProps {
  isLoadingAll: boolean;
  dynamicStats: StatData[];
}

export function InventoryStats({ isLoadingAll, dynamicStats }: InventoryStatsProps) {
  const [activeStat, setActiveStat] = useState(0);

  return (
    <>
      {/* Mobile & Tablet 3D Cover Flow Carousel */}
      <div className="block lg:hidden h-[180px] sm:h-[240px] w-full relative overflow-hidden !-mt-2 sm:!-mt-4 !mb-6">
        {isLoadingAll ? (
          <div className="absolute inset-0 m-auto w-[230px] sm:w-[420px] h-[130px] sm:h-[180px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[1.5rem] shadow-xl" />
        ) : (
          dynamicStats.map((stat, i) => {
            const Icon = IconMap[stat.trendIcon as keyof typeof IconMap] || Cpu;
            const N = dynamicStats.length;
            const offset = (i - activeStat + N) % N;
            
            const isCenter = offset === 0;
            const isRight = offset === 1;
            const isLeft = offset === N - 1;
            const isVisible = isCenter || isRight || isLeft;

            const x = isCenter ? "0%" : isRight ? "75%" : isLeft ? "-75%" : "0%";
            const scale = isCenter ? 1 : 0.8;
            const zIndex = isCenter ? 30 : (isVisible ? 20 : 10);
            const opacity = isCenter ? 1 : (isVisible ? 0.4 : 0);

            return (
              <m.div
                key={stat.label}
                onClick={() => isVisible && setActiveStat(i)}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, { offset }) => {
                  if (offset.x < -40) {
                    setActiveStat((prev) => (prev + 1) % N);
                  } else if (offset.x > 40) {
                    setActiveStat((prev) => (prev - 1 + N) % N);
                  }
                }}
                animate={{
                  x,
                  scale,
                  zIndex,
                  opacity
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={cn(
                  "absolute inset-0 m-auto w-[230px] sm:w-[420px] h-[130px] sm:h-[180px] rounded-[1.5rem] sm:rounded-[2rem] cursor-pointer p-5 sm:p-8 flex flex-col justify-between transition-colors duration-300",
                  "bg-[#0f172a] border", // Base dark card
                  isCenter 
                    ? (stat.isAlert 
                        ? "border-orange-500 shadow-[0_0_25px_3px_rgba(249,115,22,0.3)] dark:shadow-[0_0_35px_5px_rgba(249,115,22,0.4)]"
                        : "border-cyan-400 shadow-[0_0_25px_3px_rgba(34,211,238,0.3)] dark:shadow-[0_0_35px_5px_rgba(34,211,238,0.4)]")
                    : "border-slate-800 shadow-none",
                  !isVisible && "pointer-events-none"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={cn(
                      "w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors duration-300",
                      isCenter 
                        ? (stat.isAlert ? "bg-orange-500/20 text-orange-400" : "bg-cyan-500/20 text-cyan-400")
                        : "bg-white/5 text-slate-500"
                    )}>
                      <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
                    </div>
                    <span className={cn(
                      "text-[10px] sm:text-sm font-black tracking-widest transition-colors duration-300 uppercase",
                      isCenter 
                        ? (stat.isAlert ? "text-orange-400" : "text-cyan-400")
                        : "text-slate-500"
                    )}>
                      {stat.label}
                    </span>
                  </div>
                  {stat.isAlert && isCenter && (
                    <m.div
                      animate={{ opacity: [0.3, 0.8, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]"
                    />
                  )}
                </div>
                
                <div>
                  <div className={cn(
                    "text-3xl sm:text-5xl font-black tracking-tight transition-colors duration-300",
                    isCenter ? "text-white" : "text-slate-500"
                  )}>
                    {stat.value}
                  </div>
                  <div className="mt-1 sm:mt-2">
                    <span className={cn(
                      "text-[8px] sm:text-[10px] font-black px-2 sm:px-3 py-1 rounded-full uppercase tracking-wider transition-colors",
                      isCenter 
                        ? (stat.isAlert ? "bg-orange-500/20 text-orange-400" : "bg-white/10 text-slate-300")
                        : "bg-transparent text-slate-600"
                    )}>
                      {stat.trend}
                    </span>
                  </div>
                </div>
              </m.div>
            );
          })
        )}
      </div>

      {/* Desktop Grid */}
      <div className="hidden lg:grid lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {isLoadingAll ? (
          STATS_SKELETON_ITEMS.map((_, i) => (
            <div key={i} className="min-h-[140px] tablet:h-28 lg:h-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl tablet:rounded-[2.5rem]" />
          ))
        ) : (
          dynamicStats.map((stat, index) => {
            const Icon = IconMap[stat.trendIcon as keyof typeof IconMap] || Cpu;
            return (
              <m.div
                key={stat.label}
                whileHover={{ y: -5 }}
                className={cn(
                  "p-4 lg-phone:p-5 tablet:p-6 lg:p-6 rounded-3xl tablet:rounded-[2.5rem] border shadow-sm flex flex-col tablet:flex-row lg:flex-col justify-between tablet:items-center lg:items-start lg:justify-between h-auto min-h-[140px] tablet:h-28 lg:h-48 relative overflow-hidden group transition-all",
                  stat.isAlert
                    ? "bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-900/50 hover:shadow-orange-500/10"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-primary/10 hover:border-primary/50"
                )}
              >
                {stat.isAlert && (
                  <m.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute top-4 right-4 w-3 h-3 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                  />
                )}

                <div className="flex flex-col tablet:flex-row lg:flex-col gap-3 tablet:gap-6 lg:gap-2 items-start tablet:items-center lg:items-start w-full tablet:w-auto">
                  <div className={cn(
                    "p-3.5 lg:p-2.5 rounded-2xl shrink-0",
                    stat.isAlert
                      ? "bg-orange-100 text-orange-600"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800/80 group-hover:bg-primary group-hover:text-white transition-all border border-slate-200/50 dark:border-slate-700/50"
                  )}>
                    <Icon size={24} />
                  </div>

                  <div className="mt-1 tablet:mt-0">
                    <p className="text-[8px] lg-phone:text-[10px] font-bold text-slate-400 uppercase tracking-wider lg-phone:tracking-widest truncate">{stat.label}</p>
                    <h3 className="text-2xl lg-phone:text-3xl tablet:text-4xl font-black text-slate-900 dark:text-slate-100 mt-0.5 lg-phone:mt-1 leading-none">{stat.value}</h3>
                  </div>
                </div>

                <div className="mt-3 tablet:mt-0 lg:mt-3 shrink-0">
                  <span className={cn(
                    "text-[8px] lg-phone:text-[10px] font-black px-2 lg-phone:px-3 py-1 lg-phone:py-1.5 rounded-lg lg-phone:rounded-xl uppercase tracking-wider border transition-colors whitespace-nowrap leading-tight block w-fit",
                    stat.isAlert
                      ? "bg-orange-50/50 text-orange-700 border-orange-200/50"
                      : "bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50 group-hover:border-primary/20"
                  )}>
                    {stat.trend}
                  </span>
                </div>
              </m.div>
            );
          })
        )}
      </div>
    </>
  );
}
