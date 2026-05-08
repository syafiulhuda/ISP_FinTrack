"use client";

import { m } from "framer-motion";
import {
  TrendingUp, CreditCard, Calendar, Activity,
  AlertTriangle, CheckCircle2, Star, Bell, ArrowUpRight,
  Zap, Clock, Package, BarChart2, Tag, Users, Milestone,
  ChevronLeft, MapPin, Phone, Mail, ShieldCheck
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from "recharts";
import Link from "next/link";

const formatCompactNumber = (number: number) => {
  if (number >= 1000000000) return `Rp ${(number / 1000000000).toFixed(2)} B`;
  if (number >= 1000000) return `Rp ${(number / 1000000).toFixed(1)} M`;
  if (number >= 1000) return `Rp ${(number / 1000).toFixed(0)} K`;
  return `Rp ${number.toFixed(0)}`;
};

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function HealthScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";
  const label = score >= 80 ? "Excellent" : score >= 50 ? "Stable" : "At Risk";
  return (
    <div className="flex flex-col items-center gap-4 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8"
            className="text-slate-100 dark:text-slate-800" />
          <m.circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 40}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - score / 100) }}
            transition={{ duration: 1.5, ease: "circOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black" style={{ color }}>{score}</span>
          <span className="text-xs font-bold text-slate-400">HEALTH SCORE</span>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-sm font-black px-4 py-1 rounded-full uppercase tracking-widest"
          style={{ backgroundColor: `${color}20`, color }}>{label}</span>
      </div>
    </div>
  );
}

function ScoreItem({ label, value, positive }: { label: string; value: number; positive: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
         <span className={cn("text-sm font-black px-3 py-1 rounded-lg",
          positive ? "text-emerald-600 bg-emerald-500/10" : "text-rose-600 bg-rose-500/10"
        )}>
          {value > 0 ? "+" : ""}{value}
        </span>
      </div>
    </div>
  );
}

export default function CustomerDetailView({ data }: { data: any }) {
  const isActive = data.status === "Active";
  const isAtRisk = data.healthScore < 50;
  const isExcellent = data.healthScore >= 80;
  const lateCount = data.txCount > 0 ? Math.round((data.paymentRatio / 100) * data.txCount) : 0;
  const onTimeCount = data.txCount - lateCount;
  const avgPayment = data.txCount > 0 ? data.ltv / data.txCount : 0;

  const segment = data.ltv >= 5000000 ? "Premium Subscriber"
    : data.ltv >= 2000000 ? "Regular Subscriber"
    : "New / Low-Value";
  const segmentColor = data.ltv >= 5000000 ? "text-violet-600 bg-violet-500/10"
    : data.ltv >= 2000000 ? "text-indigo-600 bg-indigo-500/10"
    : "text-slate-500 bg-slate-800";

  const churnPct = isAtRisk ? "High (>60%)" : data.healthScore >= 80 ? "Low (<10%)" : "Medium (20-40%)";
  const churnColor = isAtRisk ? "text-rose-600" : isExcellent ? "text-emerald-600" : "text-amber-600";

  const joinDate = data.created_at || data.createdAt ? new Date(data.created_at || data.createdAt) : null;
  const tenureMonths = joinDate
    ? Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header & Back Button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Link href="/customers" className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:scale-105 transition-transform">
            <ChevronLeft size={20} className="text-slate-500" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
               <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{data.name}</h1>
               <span className={cn("text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider",
                  isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
               )}>{data.status}</span>
            </div>
            <p className="text-slate-500 font-medium flex items-center gap-2 mt-1">
              <ShieldCheck size={14} className="text-indigo-500" />
              ID: {data.id} • {data.service} Plan • {data.city}, {data.province}
            </p>
          </div>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20">
            <Bell size={18} />
            Send Reminder
          </button>
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-800">
            <Star size={18} />
            Mark VIP
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Lifetime Value (LTV)", value: formatCurrency(data.ltv), icon: TrendingUp, color: "text-indigo-500", bg: "bg-indigo-500/10" },
          { label: "Payment Frequency", value: `${data.txCount}x`, icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Avg. Monthly Payment", value: formatCurrency(avgPayment), icon: Activity, color: "text-violet-500", bg: "bg-violet-500/10" },
          { label: "Tenure (Months)", value: `${tenureMonths || 0} Mo`, icon: Milestone, color: "text-cyan-500", bg: "bg-cyan-500/10" }
        ].map((k, i) => (
          <m.div key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${k.bg} ${k.color}`}>
              <k.icon size={20} />
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{k.label}</p>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{k.value}</h3>
          </m.div>
        ))}
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Health & CRM */}
        <div className="space-y-8">
          <HealthScoreGauge score={data.healthScore} />
          
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-lg font-black mb-6">Score Breakdown</h3>
            <div className="space-y-3">
              <ScoreItem label="Baseline" value={70} positive={true} />
              <ScoreItem label={`Status: ${data.status}`} value={isActive ? 20 : -40} positive={isActive} />
              <ScoreItem label={`Late Payments (${lateCount}x)`} value={-(lateCount * 10)} positive={lateCount === 0} />
              <ScoreItem label="High LTV Bonus" value={data.ltv > 1000000 ? 10 : 0} positive={true} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <h3 className="text-lg font-black mb-6 flex items-center gap-2"><Users size={20} className="text-indigo-500" /> CRM Intelligence</h3>
             <div className="space-y-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer Segment</p>
                  <p className={cn("text-lg font-black", segmentColor.split(' ')[0])}>{segment}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Churn Risk Level</p>
                  <p className={cn("text-lg font-black", churnColor)}>{churnPct}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Service</p>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                    <Package size={16} className="text-indigo-500" />
                    {data.service}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">Phone</p>
                      <p className="text-sm font-black dark:text-white flex items-center gap-1.5 mt-0.5"><Phone size={12} className="text-slate-400" /> {data.no_telp || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400">Region</p>
                      <p className="text-sm font-black dark:text-white flex items-center gap-1.5 mt-0.5"><MapPin size={12} className="text-slate-400" /> {data.city}</p>
                    </div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Charts & Tables */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Payment Timeline */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black">Payment Performance Timeline</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">On Time</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Late</span>
                </div>
              </div>
            </div>
            
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.payment_history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} 
                    dy={15}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `Rp${val/1000}k`} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }} 
                    content={({ active, payload }) => active && payload && payload.length && (
                      <div className="bg-slate-900/95 backdrop-blur-xl text-white px-6 py-4 rounded-2xl shadow-2xl border border-white/10 ring-1 ring-white/5">
                        <p className="opacity-50 mb-3 uppercase tracking-widest text-[10px] font-black">{payload[0].payload.month}</p>
                        <div className="space-y-3">
                          {payload.map((entry: any, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-12">
                              <span className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: entry.color }} />
                                <span className="text-sm font-bold opacity-90">{entry.name === 'ontime' ? 'Tepat Waktu' : 'Terlambat'}</span>
                              </span>
                              <span className="text-sm font-black font-mono text-indigo-400">{formatCurrency(entry.value)}</span>
                            </div>
                          ))}
                          <div className="pt-3 border-t border-white/10 flex justify-between gap-12">
                             <span className="text-[10px] font-black opacity-40 uppercase">Total Revenue Bulan Ini</span>
                             <span className="text-sm font-black font-mono text-emerald-400">{formatCurrency(payload.reduce((acc, curr) => acc + Number(curr.value), 0))}</span>
                          </div>
                        </div>
                      </div>
                    )} 
                  />
                  <defs>
                    <linearGradient id="ontimeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                    </linearGradient>
                    <linearGradient id="lateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="ontime" stackId="a" fill="url(#ontimeGradient)" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="late" stackId="a" fill="url(#lateGradient)" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Late Payments Detailed Table */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
             <h3 className="text-xl font-black mb-8 flex items-center gap-2"><Clock size={24} className="text-rose-500" /> Late Payment Breakdown</h3>
             <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
               <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Billing Month</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Days Delayed</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Reference Date</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Penalty Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.late_payments?.map((lp: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-black text-slate-900 dark:text-white">{lp.month}</td>
                        <td className="px-6 py-4">
                           <span className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-lg text-sm font-black">
                             {lp.daysLate} days
                           </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-500">
                          {new Date(lp.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">
                          {formatCurrency(lp.amount)}
                        </td>
                      </tr>
                    ))}
                    {(!data.late_payments || data.late_payments.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                          This customer has no history of late payments. (Perfect Score)
                        </td>
                      </tr>
                    )}
                  </tbody>
               </table>
             </div>
          </div>

          {/* Retention Strategy Recommendation */}
          <div className={cn("p-8 rounded-3xl border shadow-lg flex flex-col md:flex-row items-center gap-8",
            isAtRisk ? "bg-rose-500/5 border-rose-500/20" : isExcellent ? "bg-emerald-500/5 border-emerald-500/20" : "bg-indigo-500/5 border-indigo-500/20"
          )}>
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0",
              isAtRisk ? "bg-rose-500 text-white" : isExcellent ? "bg-emerald-500 text-white" : "bg-indigo-500 text-white"
            )}>
              {isAtRisk ? <Zap size={32} /> : isExcellent ? <ArrowUpRight size={32} /> : <Activity size={32} />}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h4 className="text-xl font-black mb-2 uppercase tracking-tight">
                {isAtRisk ? "Priority Retention Alert" : isExcellent ? "Premium Upsell Opportunity" : "Steady Growth Maintenance"}
              </h4>
              <p className="text-slate-500 font-medium">
                {isAtRisk 
                  ? "Pelanggan ini berada di zona risiko churn tinggi. Kami merekomendasikan diskon loyalitas atau pengecekan teknis jaringan ke lokasi." 
                  : isExcellent 
                    ? "Pelanggan menunjukkan loyalitas yang sangat tinggi. Direkomendasikan untuk menawarkan paket Gamera/Premium dengan kontrak tahunan."
                    : "Terus pantau stabilitas pembayaran. Pelanggan ini memberikan kontribusi MRR yang stabil bagi perusahaan."}
              </p>
            </div>
            <button className={cn("px-8 py-4 rounded-2xl font-black text-sm whitespace-nowrap transition-all hover:scale-105 active:scale-95",
              isAtRisk ? "bg-rose-500 text-white" : isExcellent ? "bg-emerald-500 text-white" : "bg-indigo-500 text-white"
            )}>
              {isAtRisk ? "Launch Retention Task" : isExcellent ? "Upsell Packages" : "Log Observation"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
