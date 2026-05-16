import { m } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  name: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral' | 'danger';
  description?: string;
  className?: string;
  iconClassName?: string;
}

export function StatCard({ 
  name, 
  value, 
  icon: Icon, 
  trend, 
  trendType = 'neutral',
  description,
  className,
  iconClassName
}: StatCardProps) {
  return (
    <m.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "h-[140px] bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:shadow-primary/5 transition-all group relative overflow-hidden flex flex-col",
        className
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none" />
      
      <div className="flex items-center justify-between relative z-10 mb-4">
        <div className={cn(
          "w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm",
          iconClassName
        )}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className={cn(
            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm",
            trendType === 'up' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            (trendType === 'down' || trendType === 'danger') && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            trendType === 'neutral' && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
          )}>
            {trend}
          </div>
        )}
      </div>
      
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">{name}</p>
        <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1.5 lg:mt-2">{value}</h3>
        {description && (
          <p className="text-[10px] font-bold text-slate-400 mt-2 lg:mt-3 uppercase tracking-tighter opacity-70 line-clamp-2">{description}</p>
        )}
      </div>
    </m.div>
  );
}
