"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

interface RevenueTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const RevenueTooltip = ({ active, payload, label }: RevenueTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
        <p className="text-xs font-bold text-slate-400 uppercase mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((item: any, index: number) => (
            <div key={index} className="text-sm font-black flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 dark:text-slate-400 font-bold capitalize">{item.name}:</span>
              </span>
              <span className="text-slate-900 dark:text-slate-100">
                {item.value >= 1000000
                  ? `Rp ${(item.value / 1000000).toFixed(2)}M`
                  : `Rp ${(item.value / 1000).toFixed(0)}k`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardRevenueChart = ({ data }: { data: any[] }) => {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <LineChart 
        data={data} 
        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
        <XAxis 
          dataKey="month" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} 
          dy={10} 
          interval={4}
        />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip content={<RevenueTooltip />} />
        <Line 
          type="monotone" 
          dataKey="revenue" 
          stroke="#004ac6" 
          strokeWidth={4} 
          dot={{ r: 2, fill: '#004ac6', strokeWidth: 1, stroke: '#fff' }} 
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
        <Line 
          type="monotone" 
          dataKey="expenses" 
          stroke="#94a3b8" 
          strokeWidth={2} 
          strokeDasharray="5 5" 
          dot={false} 
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export const DashboardCustomerChart = ({ data }: { data: any[] }) => {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <AreaChart 
        data={data} 
        margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
        <XAxis 
          dataKey="month" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} 
          interval={4}
        />
        <YAxis hide domain={['auto', 'auto']} />
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{payload[0].payload.month}</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{payload[0].value} Active</p>
                </div>
              );
            }
            return null;
          }}
        />
        <Area 
          type="monotone" 
          dataKey="growth" 
          stroke="#0ea5e9" 
          strokeWidth={3} 
          fillOpacity={1} 
          fill="url(#colorGrowth)" 
          dot={{ r: 2, fill: '#0ea5e9', strokeWidth: 1, stroke: '#fff' }} 
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
