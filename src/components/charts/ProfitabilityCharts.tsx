"use client";

import { memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";

// ─── Waterfall / Revenue Breakdown Chart ──────────────────────────────────────

interface WaterfallEntry {
  name: string;
  value: number;
  isExpense: boolean;
}

interface WaterfallChartProps {
  data: WaterfallEntry[];
}

export const WaterfallChart = memo(function WaterfallChart({ data }: WaterfallChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fontWeight: "bold", fill: "#64748b" }}
          dy={12}
          interval={0}
        />
        <YAxis hide domain={["auto", "auto"]} />
        <Tooltip
          cursor={{ fill: "transparent" }}
          content={({ active, payload }) =>
            active && payload && payload.length ? (
              <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl border border-white/10 backdrop-blur-md">
                <p className="opacity-60 mb-1 uppercase tracking-tighter">
                  {payload[0].payload.name}
                </p>
                <p className="text-sm font-black">
                  Rp {Math.abs(Number(payload[0].value)).toLocaleString()}
                </p>
              </div>
            ) : null
          }
        />
        <Bar dataKey="value" barSize={32} radius={[20, 20, 20, 20]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.isExpense ? "#f43f5e" : "#10b981"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});

// ─── Service Plan Mix (Donut) Chart ───────────────────────────────────────────

interface DistributionEntry {
  name: string;
  value: number;
  count: number;
  color: string;
}

interface ServiceMixChartProps {
  data: DistributionEntry[];
  totalActiveUsers: number;
}

export const ServiceMixChart = memo(function ServiceMixChart({ data, totalActiveUsers }: ServiceMixChartProps) {
  return (
    <>
      {/* Center Text Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">
          {totalActiveUsers}
        </span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
          Users
        </span>
      </div>

      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <PieChart>
          <Pie
            data={data}
            innerRadius={70}
            outerRadius={90}
            paddingAngle={15}
            dataKey="value"
            startAngle={180}
            endAngle={-180}
            stroke="none"
            cornerRadius={10}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "1rem",
              border: "none",
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any, props: any) => [
              `${props.payload?.count ?? 0} Users`,
              String(name),
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </>
  );
});

// ─── Profitability Trend (Area) Chart ─────────────────────────────────────────

interface TrendEntry {
  month: string;
  value: number;
}

interface ProfitabilityTrendChartProps {
  data: TrendEntry[];
}

export const ProfitabilityTrendChart = memo(function ProfitabilityTrendChart({ data }: ProfitabilityTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#004ac6" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#004ac6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="rgba(255,255,255,0.05)"
        />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }}
          interval={0}
          padding={{ left: 20, right: 20 }}
        />
        <YAxis hide />
        <Tooltip
          content={({ active, payload }) =>
            active && payload && payload.length ? (
              <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 shadow-xl">
                <p className="text-xs font-black text-white">
                  Rp {Number(payload[0].value).toLocaleString()}
                </p>
                <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                  {payload[0].payload.month}
                </p>
              </div>
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={3}
          fill="url(#growthGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});
