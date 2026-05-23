"use client";

import { m, AnimatePresence } from "framer-motion";
import {
  X, TrendingUp, CreditCard, Calendar, Activity,
  AlertTriangle, CheckCircle2, Star, Bell, ArrowUpRight,
  Zap, Clock, Package, BarChart2, Tag, Users, Milestone
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from "react";
import { getCustomer360 } from "@/actions/customers";
import { createPaymentLink } from "@/actions/payment";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { PaymentModal } from "@/components/ui/PaymentModal";

const formatCompactNumber = (number: number) => {
  if (number >= 1000000000) return `Rp ${(number / 1000000000).toFixed(3)} B`;
  if (number >= 1000000) return `Rp ${(number / 1000000).toFixed(3)} M`;
  if (number >= 1000) return `Rp ${(number / 1000).toFixed(3)} K`;
  return `Rp ${number.toFixed(0)}`;
};

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

interface CustomerDetailDrawerProps {
  customer: any | null;
  onClose: () => void;
}

function HealthScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";
  const label = score >= 80 ? "Excellent" : score >= 50 ? "Stable" : "At Risk";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="10"
            className="text-slate-100 dark:text-slate-800" />
          <m.circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 40}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 40 * (1 - score / 100) }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black" style={{ color }}>{score}</span>
          <span className="text-[9px] font-bold text-slate-400">/ 100</span>
        </div>
      </div>
      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full"
        style={{ backgroundColor: `${color}20`, color }}>{label}</span>
    </div>
  );
}

function ScoreRow({ label, value, positive }: { label: string; value: number; positive: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
      <span className="text-[11px] font-bold text-slate-500">{label}</span>
      <span className={cn("text-[11px] font-black px-2 py-0.5 rounded-lg",
        positive ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10"
          : "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10"
      )}>
        {value > 0 ? "+" : ""}{value}
      </span>
    </div>
  );
}

function StatCell({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent: string }) {
  return (
    <div className="flex flex-col gap-1.5 p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon size={13} />
      </div>
      <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">{value}</p>
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
    </div>
  );
}

export function CustomerDetailDrawer({ customer, onClose }: CustomerDetailDrawerProps) {
  const [fullCustomer, setFullCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentRedirectUrl, setPaymentRedirectUrl] = useState("");
  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [paymentToken, setPaymentToken] = useState("");

  useEffect(() => {
    if (customer?.id) {
      setLoading(true);
      getCustomer360(customer.id).then((data) => {
        setFullCustomer(data);
        setLoading(false);
      });
    } else {
      setFullCustomer(null);
    }
  }, [customer?.id]);

  if (!customer) return null;

  // Use full data if available, fallback to basic customer data
  const data = fullCustomer || customer;

  const isActive = data.status === "Active";
  const isAtRisk = data.healthScore < 50;
  const isExcellent = data.healthScore >= 80;
  const lateCount = data.txCount > 0 ? Math.round((data.paymentRatio / 100) * data.txCount) : 0;
  const onTimeCount = data.txCount - lateCount;
  const avgPayment = data.txCount > 0 ? data.ltv / data.txCount : 0;

  const statusBonus = isActive ? 20 : -40;
  const latePaymentPenalty = -(lateCount * 10);
  const ltvBonus = data.ltv > 1000000 ? 10 : 0;

  // Segment logic
  const segment = data.ltv >= 5000000 ? "Premium Subscriber"
    : data.ltv >= 2000000 ? "Regular Subscriber"
    : "New / Low-Value";
  const segmentColor = data.ltv >= 5000000 ? "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/10"
    : data.ltv >= 2000000 ? "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10"
    : "text-slate-500 bg-slate-100 dark:bg-slate-800";

  // Churn probability label
  const churnPct = isAtRisk ? "High (>60%)" : data.healthScore >= 80 ? "Low (<10%)" : "Medium (20-40%)";
  const churnColor = isAtRisk ? "text-rose-600" : isExcellent ? "text-emerald-600" : "text-amber-600";

  // Join date & tenure
  const joinDate = data.created_at || data.createdAt ? new Date(data.created_at || data.createdAt) : null;
  const tenureMonths = joinDate
    ? Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null;

  return (
    <AnimatePresence>
      {customer && (
        /* Container is now absolute to fill the relative table container */
        <div className="absolute inset-0 z-[100] overflow-hidden pointer-events-none rounded-[2.5rem]">
          {/* Invisible click-catcher */}
          <div
            className="absolute inset-0 pointer-events-auto"
            onClick={onClose}
          />

          {/* Drawer — top-0 and bottom-0 relative to table container */}
          <m.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="absolute right-0 top-0 bottom-0 w-full max-w-[440px] bg-white dark:bg-slate-950 shadow-[-8px_0_32px_rgba(0,0,0,0.12)] dark:shadow-[-8px_0_32px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden border-l border-slate-200 dark:border-slate-800 pointer-events-auto"
          >
            {/* Color accent top bar */}
            <div className={cn("h-1 flex-shrink-0",
              isAtRisk ? "bg-gradient-to-r from-rose-500 to-rose-400"
                : isExcellent ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                : "bg-gradient-to-r from-amber-500 to-orange-400"
            )} />

            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg",
                    isActive ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  )}>
                    {customer.name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white">{customer.name}</h2>
                    <p className="text-xs font-bold text-slate-400">{customer.id}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                        isActive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                      )}>{data.status}</span>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {data.service} Plan
                      </span>
                      <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full", segmentColor)}>
                        {segment}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={onClose}
                  aria-label="Close customer drawer"
                  className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : (
                <>
              {/* Alert Banner */}
              {isAtRisk && (
                <div className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl">
                  <AlertTriangle size={16} className="text-rose-500 flex-shrink-0" />
                  <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400">
                    Churn risk tinggi. Segera lakukan retention outreach untuk mencegah pelanggan berhenti berlangganan.
                  </p>
                </div>
              )}
              {isExcellent && (
                <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                  <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    Pelanggan loyal & sehat. Kandidat ideal untuk upsell/upgrade paket premium.
                  </p>
                </div>
              )}

              {/* Health Score */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Health Score Breakdown</p>
                <div className="flex items-center gap-5">
                  <HealthScoreGauge score={data.healthScore} />
                  <div className="flex-1">
                    <ScoreRow label="Baseline" value={70} positive={true} />
                    <ScoreRow label={`Status (${data.status})`} value={statusBonus} positive={isActive} />
                    <ScoreRow label={`Telat (${lateCount}x)`} value={latePaymentPenalty} positive={latePaymentPenalty >= 0} />
                    <ScoreRow label="LTV Bonus" value={ltvBonus} positive={true} />
                  </div>
                </div>
              </div>

              {/* Financial Stats */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Financial Overview</p>
                <div className="grid grid-cols-3 gap-2">
                  <StatCell label="Total LTV" value={formatCompactNumber(data.ltv)} icon={TrendingUp} accent="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500" />
                  <StatCell label="Payments" value={`${data.txCount}x`} icon={CreditCard} accent="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" />
                  <StatCell label="Avg/Bulan" value={formatCompactNumber(avgPayment)} icon={Activity} accent="bg-violet-50 dark:bg-violet-500/10 text-violet-500" />
                </div>
              </div>

              {/* Payment Performance */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Payment Performance</p>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500">On-Time Rate</span>
                    <span className="text-[11px] font-black text-slate-900 dark:text-white">
                      {data.paymentRatio === 0 ? "100%" : `${(100 - data.paymentRatio).toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <m.div
                      initial={{ width: 0 }}
                      animate={{ width: `${data.paymentRatio === 0 ? 100 : 100 - data.paymentRatio}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={cn("h-full rounded-full",
                        data.paymentRatio === 0 ? "bg-emerald-500"
                          : data.paymentRatio < 30 ? "bg-amber-500" : "bg-rose-500"
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="text-center p-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-black text-emerald-500">{onTimeCount}</p>
                      <p className="text-[9px] font-bold text-slate-400">Tepat Waktu</p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                      <p className={cn("text-sm font-black", lateCount > 0 ? "text-rose-500" : "text-slate-300")}>{lateCount}</p>
                      <p className="text-[9px] font-bold text-slate-400">Terlambat</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 pt-1">
                    <span className="flex items-center gap-1"><Calendar size={9} /> Pembayaran Terakhir</span>
                    <span>{data.lastPayment ? new Date(data.lastPayment).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Payment Timeline Chart */}
              {data.payment_history && data.payment_history.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Payment Timeline</p>
                  <div className="h-40 w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={data.payment_history} margin={{ top: 30, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                        <XAxis 
                          dataKey="month" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} 
                          dy={10}
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                          content={({ active, payload, coordinate }) => active && payload && payload.length && (
                            <div 
                              className="bg-slate-900/95 backdrop-blur-xl text-white px-4 py-3 rounded-2xl text-xs font-black shadow-2xl border border-white/10 ring-1 ring-white/5 transition-transform duration-200"
                              style={{ 
                                transform: `translateY(-120%) ${coordinate && coordinate.x > 200 ? 'translateX(-100%)' : 'translateX(0)'}`,
                                marginLeft: coordinate && coordinate.x > 200 ? -20 : 20
                              }}
                            >
                              <p className="opacity-50 mb-2 uppercase tracking-tighter text-[9px] font-bold">{payload[0].payload.month}</p>
                              <div className="flex flex-col gap-2">
                                {payload.map((entry: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between gap-8">
                                    <span className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: entry.color }} />
                                      <span className="opacity-80">{entry.name === 'ontime' ? 'Tepat Waktu' : 'Terlambat'}</span>
                                    </span>
                                    <span className="font-mono text-indigo-400">{formatCurrency(entry.value)}</span>
                                  </div>
                                ))}
                                <div className="border-t border-white/10 pt-2 mt-1 flex justify-between gap-8">
                                  <span className="opacity-50 uppercase text-[9px]">Total</span>
                                  <span className="font-mono text-emerald-400">{formatCurrency(payload.reduce((acc, curr) => acc + Number(curr.value), 0))}</span>
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
                        <Bar dataKey="ontime" stackId="a" fill="url(#ontimeGradient)" radius={[4, 4, 4, 4]} barSize={12} />
                        <Bar dataKey="late" stackId="a" fill="url(#lateGradient)" radius={[4, 4, 4, 4]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Late Payment Table */}
              {data.late_payments && data.late_payments.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Late Payments History</p>
                  <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800/50">
                        <tr>
                          <th className="px-3 py-2 text-[10px] font-bold text-slate-500">Month</th>
                          <th className="px-3 py-2 text-[10px] font-bold text-slate-500">Days Late</th>
                          <th className="px-3 py-2 text-[10px] font-bold text-slate-500 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {data.late_payments.map((lp: any, i: number) => (
                          <tr key={i} className="bg-white dark:bg-slate-950">
                            <td className="px-3 py-2 text-[11px] font-bold text-slate-900 dark:text-white">{lp.month}</td>
                            <td className="px-3 py-2 text-[11px] font-black text-rose-500">{lp.daysLate} days</td>
                            <td className="px-3 py-2 text-[11px] font-bold text-slate-900 dark:text-white text-right">{formatCurrency(lp.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CRM Intelligence */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">CRM Intelligence</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/50">
                    <span className="flex items-center gap-2 text-[11px] font-bold text-slate-500"><Tag size={11} /> Segment</span>
                    <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-lg", segmentColor)}>{segment}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/50">
                    <span className="flex items-center gap-2 text-[11px] font-bold text-slate-500"><BarChart2 size={11} /> Churn Probability</span>
                    <span className={cn("text-[11px] font-black", churnColor)}>{churnPct}</span>
                  </div>
                  {tenureMonths !== null && (
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/50">
                      <span className="flex items-center gap-2 text-[11px] font-bold text-slate-500"><Milestone size={11} /> Tenure</span>
                      <span className="text-[11px] font-black text-slate-900 dark:text-white">{tenureMonths} bulan</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-1.5">
                    <span className="flex items-center gap-2 text-[11px] font-bold text-slate-500"><Package size={11} /> Paket Aktif</span>
                    <span className="text-[11px] font-black text-slate-900 dark:text-white">{data.service}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center gap-2.5 p-3 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-all text-left">
                    <Star size={14} className="text-indigo-500 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-black text-indigo-700 dark:text-indigo-400">Tandai VIP</p>
                      <p className="text-[9px] text-indigo-400">Priority customer</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-2.5 p-3 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-xl transition-all text-left">
                    <Bell size={14} className="text-amber-500 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-black text-amber-700 dark:text-amber-400">Kirim Reminder</p>
                      <p className="text-[9px] text-amber-400">WhatsApp / Email</p>
                    </div>
                  </button>
                  {isAtRisk && (
                    <button className="flex items-center gap-2.5 p-3 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-xl transition-all text-left col-span-2">
                      <Zap size={14} className="text-rose-500 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] font-black text-rose-700 dark:text-rose-400">Retention Outreach</p>
                        <p className="text-[9px] text-rose-400">Kirim penawaran khusus — cegah churn sekarang</p>
                      </div>
                    </button>
                  )}
                  {isExcellent && (
                    <button className="flex items-center gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-xl transition-all text-left col-span-2">
                      <ArrowUpRight size={14} className="text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400">Tawarkan Upgrade Paket</p>
                        <p className="text-[9px] text-emerald-400">Pelanggan loyal — kandidat upgrade ideal</p>
                      </div>
                    </button>
                  )}
                  <button 
                    onClick={async () => {
                      const amountStr = window.prompt("Masukkan nominal tagihan (IDR):", "350000");
                      if (!amountStr) return;
                      const amount = parseInt(amountStr);
                      if (isNaN(amount) || amount <= 0) {
                        toast.error("Nominal tidak valid");
                        return;
                      }

                      toast.loading("Generating Payment Link...", { id: "snap" });
                      const res = await createPaymentLink({
                        customerId: customer.id,
                        customerName: customer.name,
                        service: customer.service,
                        amount
                      });

                      if (res.success && res.redirect_url && res.order_id && res.token) {
                        toast.success("Payment Link generated!", { id: "snap" });
                        setPaymentRedirectUrl(res.redirect_url);
                        setPaymentOrderId(res.order_id);
                        setPaymentToken(res.token);
                        setPaymentModalOpen(true);
                      } else {
                        toast.error("Failed to generate link: " + res.error, { id: "snap" });
                      }
                    }}
                    className="flex items-center gap-2.5 p-3 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl transition-all text-left col-span-2 cursor-pointer"
                  >
                    <CreditCard size={14} className="text-blue-500 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] font-black text-blue-700 dark:text-blue-400">Generate Payment Link (Midtrans)</p>
                      <p className="text-[9px] text-blue-400">Buat link bayar otomatis untuk pelanggan ini</p>
                    </div>
                  </button>
                </div>
              </div>

                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
              <button onClick={onClose}
                aria-label="Close customer drawer"
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-black text-sm transition-all cursor-pointer">
                Tutup
              </button>
            </div>
          </m.div>

          <PaymentModal
            isOpen={paymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            token={paymentToken}
            redirectUrl={paymentRedirectUrl}
            orderId={paymentOrderId}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
