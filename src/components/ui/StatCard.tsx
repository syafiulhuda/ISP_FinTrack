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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:shadow-primary/5 transition-all group relative overflow-hidden",
        className
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-colors" />
      
      <div className="flex items-center justify-between mb-3 relative z-10">
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
      
      <div className="relative z-10">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">{name}</p>
        <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 mt-1.5">{value}</h3>
        {description && (
          <p className="text-[10px] font-bold text-slate-400 mt-3 uppercase tracking-tighter">{description}</p>
        )}
      </div>
    </m.div>
  );
}
