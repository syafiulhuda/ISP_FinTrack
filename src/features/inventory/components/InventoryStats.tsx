import { m } from "framer-motion";
import { Cpu, CheckCircle2, AlertCircle, Warehouse, Settings, RefreshCw, BarChart3, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

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

const STATS_SKELETON_ITEMS = Array.from({ length: 7 });

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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
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
  );
}
