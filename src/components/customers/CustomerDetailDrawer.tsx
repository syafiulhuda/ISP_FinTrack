"use client";

import { m, AnimatePresence } from "framer-motion";
import {
  X, TrendingUp, CreditCard, Calendar, Activity,
  AlertTriangle, CheckCircle2, Star, Bell, ArrowUpRight,
  Zap, Clock, Package, BarChart2, Tag, Users, Milestone
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
  if (!customer) return null;

  const isActive = customer.status === "Active";
  const isAtRisk = customer.healthScore < 50;
  const isExcellent = customer.healthScore >= 80;
  const lateCount = customer.txCount > 0 ? Math.round((customer.paymentRatio / 100) * customer.txCount) : 0;
  const onTimeCount = customer.txCount - lateCount;
  const avgPayment = customer.txCount > 0 ? customer.ltv / customer.txCount : 0;

  const statusBonus = isActive ? 20 : -40;
  const latePaymentPenalty = -(lateCount * 10);
  const ltvBonus = customer.ltv > 1000000 ? 10 : 0;

  // Segment logic
  const segment = customer.ltv >= 5000000 ? "Premium Subscriber"
    : customer.ltv >= 2000000 ? "Regular Subscriber"
    : "New / Low-Value";
  const segmentColor = customer.ltv >= 5000000 ? "text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-500/10"
    : customer.ltv >= 2000000 ? "text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10"
    : "text-slate-500 bg-slate-100 dark:bg-slate-800";

  // Churn probability label
  const churnPct = isAtRisk ? "High (>60%)" : customer.healthScore >= 80 ? "Low (<10%)" : "Medium (20-40%)";
  const churnColor = isAtRisk ? "text-rose-600" : isExcellent ? "text-emerald-600" : "text-amber-600";

  // Join date & tenure
  const joinDate = customer.createdAt ? new Date(customer.createdAt) : null;
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
                      )}>{customer.status}</span>
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {customer.service} Plan
                      </span>
                      <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full", segmentColor)}>
                        {segment}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

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
                  <HealthScoreGauge score={customer.healthScore} />
                  <div className="flex-1">
                    <ScoreRow label="Baseline" value={70} positive={true} />
                    <ScoreRow label={`Status (${customer.status})`} value={statusBonus} positive={isActive} />
                    <ScoreRow label={`Telat (${lateCount}x)`} value={latePaymentPenalty} positive={latePaymentPenalty >= 0} />
                    <ScoreRow label="LTV Bonus" value={ltvBonus} positive={true} />
                  </div>
                </div>
              </div>

              {/* Financial Stats */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Financial Overview</p>
                <div className="grid grid-cols-3 gap-2">
                  <StatCell label="Total LTV" value={formatCompactNumber(customer.ltv)} icon={TrendingUp} accent="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500" />
                  <StatCell label="Payments" value={`${customer.txCount}x`} icon={CreditCard} accent="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" />
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
                      {customer.paymentRatio === 0 ? "100%" : `${(100 - customer.paymentRatio).toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <m.div
                      initial={{ width: 0 }}
                      animate={{ width: `${customer.paymentRatio === 0 ? 100 : 100 - customer.paymentRatio}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className={cn("h-full rounded-full",
                        customer.paymentRatio === 0 ? "bg-emerald-500"
                          : customer.paymentRatio < 30 ? "bg-amber-500" : "bg-rose-500"
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
                    <span>{customer.lastPayment ? new Date(customer.lastPayment).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "N/A"}</span>
                  </div>
                </div>
              </div>

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
                    <span className="text-[11px] font-black text-slate-900 dark:text-white">{customer.service}</span>
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
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
              <button onClick={onClose}
                className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-black text-sm transition-all">
                Tutup
              </button>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
