"use client";

import { memo } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

// ─── Shared Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, unit = "" }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  unit?: string;
}) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
          {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {unit === "%" ? `${entry.value}%` : formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

// ─── Revenue Projection Chart ─────────────────────────────────────────────────

interface ChartDataPoint {
  month: string;
  revenue_actual?: number;
  revenue_forecast?: number;
  churn_actual?: number;
  churn_forecast?: number;
  type?: string;
}

interface RevenueProjectionChartProps {
  data: ChartDataPoint[];
}

export const RevenueProjectionChart = memo(function RevenueProjectionChart({ data }: RevenueProjectionChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#334155"
          opacity={0.1}
        />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }}
          tickFormatter={(val) => `Rp${val / 1000000}M`}
          width={60}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ stroke: "#6366f1", strokeWidth: 1, strokeDasharray: "4 4" }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={36}
          iconType="circle"
          formatter={(value) => (
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              {value}
            </span>
          )}
        />
        <Area
          type="monotone"
          dataKey="revenue_actual"
          stroke="#6366f1"
          strokeWidth={4}
          fillOpacity={1}
          fill="url(#colorRev)"
          name="Actual"
          animationDuration={1500}
        />
        <Line
          type="monotone"
          dataKey="revenue_forecast"
          stroke="#818cf8"
          strokeWidth={4}
          strokeDasharray="6 6"
          name="Forecast"
          dot={{ r: 5, fill: "#fff", stroke: "#818cf8", strokeWidth: 3 }}
          activeDot={{ r: 8, fill: "#818cf8", stroke: "#fff", strokeWidth: 3 }}
          animationDuration={2000}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});

// ─── Churn Rate Forecast Chart ────────────────────────────────────────────────

interface ChurnForecastChartProps {
  data: ChartDataPoint[];
}

export const ChurnForecastChart = memo(function ChurnForecastChart({ data }: ChurnForecastChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#334155"
          opacity={0.1}
        />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }}
          unit="%"
          width={40}
        />
        <Tooltip
          content={<CustomTooltip unit="%" />}
          cursor={{ stroke: "#f43f5e", strokeWidth: 1, strokeDasharray: "4 4" }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={36}
          iconType="circle"
          formatter={(value) => (
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              {value}
            </span>
          )}
        />
        <Area
          type="monotone"
          dataKey="churn_actual"
          stroke="#f43f5e"
          strokeWidth={4}
          fill="#f43f5e"
          fillOpacity={0.05}
          name="Historical"
          animationDuration={1500}
        />
        <Line
          type="monotone"
          dataKey="churn_forecast"
          stroke="#fb7185"
          strokeWidth={4}
          strokeDasharray="6 6"
          name="Predicted"
          dot={{ r: 5, fill: "#fff", stroke: "#fb7185", strokeWidth: 3 }}
          activeDot={{ r: 8, fill: "#fb7185", stroke: "#fff", strokeWidth: 3 }}
          animationDuration={2000}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});
