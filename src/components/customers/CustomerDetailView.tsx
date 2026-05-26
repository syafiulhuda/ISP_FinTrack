"use client";

import { m, AnimatePresence } from "framer-motion";
import {
  TrendingUp, CreditCard, Activity,
  Star, Bell, ArrowUpRight,
  Zap, Clock, Package, Users, Milestone,
  ChevronLeft, ChevronRight, ChevronDown, MapPin, Phone, ShieldCheck, Crown,
  Router, Globe, Cpu, Copy, Check, Info, Settings, AlertCircle
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Link from "next/link";
import { toggleVipStatus, sendPaymentReminder } from "@/actions/customers";
import { createPaymentLink } from "@/actions/payment";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PaymentModal } from "@/components/ui/PaymentModal";
import { CustomerEditModal } from "@/components/customers/CustomerEditModal";
import { TicketSlideOver } from "@/components/tickets/TicketSlideOver";

const formatCompactNumber = (input: number | string) => {
  const number = Number(input);
  if (isNaN(number)) return "Rp 0";
  if (number >= 1000000000) return `Rp ${(number / 1000000000).toFixed(2)} B`;
  if (number >= 1000000) return `Rp ${(number / 1000000).toFixed(1)} M`;
  if (number >= 1000) return `Rp ${(number / 1000).toFixed(0)} K`;
  return `Rp ${number.toFixed(0)}`;
};


function HealthScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";
  const label = score >= 80 ? "Excellent" : score >= 50 ? "Stable" : "At Risk";
  return (
    <div className="flex flex-col items-center gap-3 tablet:gap-4 bg-white dark:bg-slate-900 p-6 tablet:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="relative w-32 h-32 tablet:w-40 tablet:h-40">
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
          <span className="text-2xl tablet:text-4xl font-black" style={{ color }}>{score}</span>
          <span className="text-[10px] tablet:text-xs font-bold text-slate-400">HEALTH SCORE</span>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[10px] tablet:text-sm font-black px-3 tablet:px-4 py-1 rounded-full uppercase tracking-widest"
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

const generateAIRecommendation = (data: any) => {
  const service = (data.service || "").toLowerCase();
  const ltv = Number(data.ltv || 0);
  const isVip = data.is_vip || false;
  const isAtRisk = Number(data.healthScore || 0) < 50;
  const isExcellent = Number(data.healthScore || 0) >= 80;
  const lateCount = data.late_payments?.length || 0;
  
  if (isAtRisk) {
    if (lateCount > 2) {
      return `Risiko Churn Kritis: Terdeteksi ${lateCount}x keterlambatan. Sistem AI menyarankan untuk menawarkan Downgrade Paket atau Diskon Win-Back 20% agar pelanggan tidak putus layanan.`;
    }
    return "Pelanggan berada di zona risiko churn tinggi. Pola pembayaran tidak stabil. Rekomendasi: Hubungi pelanggan secara personal dan tawarkan restrukturisasi tagihan.";
  }
  
  if (isExcellent) {
    if (service.includes("10 mbps") || service.includes("basic") || service.includes("reguler")) {
      return `Peluang Upsell Sangat Kuat: Pelanggan sangat loyal namun masih menggunakan paket ${data.service}. AI memprediksi probabilitas 85% untuk mau di-upgrade ke Paket Premium dengan gratis biaya migrasi.`;
    }
    if (!isVip && ltv > 2000000) {
      return `Kandidat VIP: LTV telah mencapai batas premium. Jadikan VIP sekarang dan tawarkan kontrak tahunan berlangganan dengan ekstra Router Mesh eksklusif.`;
    }
    return `Loyalitas sempurna dengan paket tinggi. Tawarkan Add-on layanan seperti IP Statis atau layanan Smart CCTV untuk memaksimalkan ARPU.`;
  }
  
  // Tengah-tengah (Stabilitas terjaga)
  if (service.includes("premium") || service.includes("gamers")) {
    return "Pelanggan stabil dengan paket tier atas. Pertahankan kepuasan dengan memberikan layanan teknisi prioritas untuk menjaga retensi.";
  }
  return "Stabilitas pembayaran terjaga. AI menyarankan untuk memantau kontribusi MRR dan mengirimkan penawaran Promo Bundling Musiman saat hari raya.";
};

function CopyItem({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value || value === 'N/A') return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(`${label} disalin ke clipboard!`);
  };

  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div 
        onClick={handleCopy}
        className={cn(
          "flex items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl transition-all",
          value && value !== 'N/A' ? "cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 group" : "opacity-70"
        )}
      >
        <div className="flex items-center gap-2.5 truncate">
          <Icon size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
          <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300 truncate">
            {value || 'N/A'}
          </span>
        </div>
        {value && value !== 'N/A' && (
          <div className="shrink-0 text-slate-400 group-hover:text-indigo-500 transition-colors">
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerDetailView({ data, initialTickets = [] }: { data: any, initialTickets?: any[] }) {
  const [isVip, setIsVip] = useState(data.is_vip || false);
  const [isSending, setIsSending] = useState(false);
  const [isTogglingVip, setIsTogglingVip] = useState(false);
  const [expandedLatePayments, setExpandedLatePayments] = useState<Record<number, boolean>>({});
  const [mounted, setMounted] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentRedirectUrl, setPaymentRedirectUrl] = useState("");
  const [paymentOrderId, setPaymentOrderId] = useState("");
  const [paymentToken, setPaymentToken] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [ticketSlideOpen, setTicketSlideOpen] = useState(false);
  const [isTicketHistoryExpanded, setIsTicketHistoryExpanded] = useState(false);

  // Pagination states
  const [ticketPage, setTicketPage] = useState(1);
  const [latePaymentPage, setLatePaymentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const paginatedTickets = initialTickets?.slice((ticketPage - 1) * ITEMS_PER_PAGE, ticketPage * ITEMS_PER_PAGE) || [];
  const totalTicketPages = Math.ceil((initialTickets?.length || 0) / ITEMS_PER_PAGE);

  const paginatedLatePayments = data.late_payments?.slice((latePaymentPage - 1) * ITEMS_PER_PAGE, latePaymentPage * ITEMS_PER_PAGE) || [];
  const totalLatePaymentPages = Math.ceil((data.late_payments?.length || 0) / ITEMS_PER_PAGE);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleLatePayment = (index: number) => {
    setExpandedLatePayments(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleToggleVip = async () => {
    setIsTogglingVip(true);
    const newStatus = !isVip;
    const res = await toggleVipStatus(data.id, newStatus);
    if (res.success) {
      setIsVip(newStatus);
      toast.success(newStatus ? 'Customer marked as VIP' : 'VIP status removed', {
        description: `Status updated for ${data.name} globally.`,
        icon: newStatus ? <Crown size={16} className="text-amber-500" /> : <Star size={16} />
      });
    } else {
      toast.error('Failed to update VIP status');
    }
    setIsTogglingVip(false);
  };

  const handleSendReminder = async () => {
    setIsSending(true);
    const res = await sendPaymentReminder(data.id);
    if (res.success) {
      toast.success('Reminder Sent!', {
        description: `Notification sent to ${data.name} via WhatsApp.`,
        icon: <Bell size={16} className="text-indigo-500" />
      });
    } else {
      toast.error('Failed to send reminder');
    }
    setIsSending(false);
  };

  const isActive = data.status === "Active";
  const isAtRisk = Number(data.healthScore || 0) < 50;
  const isExcellent = Number(data.healthScore || 0) >= 80;
  const lateCount = Number(data.txCount || 0) > 0 ? Math.round((Number(data.paymentRatio || 0) / 100) * Number(data.txCount || 0)) : 0;
  const avgPayment = Number(data.txCount || 0) > 0 ? Number(data.ltv || 0) / Number(data.txCount || 0) : 0;

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
      <div className="flex flex-col xl:flex-row xl:flex-wrap justify-between items-start xl:items-center gap-6">
        <div className="flex items-start tablet:items-center gap-3 tablet:gap-4 w-full xl:w-auto max-w-full">
          <Link href="/customers" aria-label="Back to customer list" className="p-2.5 tablet:p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:scale-105 transition-transform shrink-0 mt-1 tablet:mt-0">
            <ChevronLeft size={18} className="text-slate-500" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl tablet:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 truncate">
                {data.name}
                {isVip && (
                  <m.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="bg-gradient-to-tr from-amber-400 to-yellow-600 p-1 rounded-full shadow-lg shadow-amber-500/20 shrink-0"
                  >
                    <Crown size={14} className="text-white" />
                  </m.div>
                )}
              </h1>
              <span className={cn("text-[9px] tablet:text-xs font-black px-2 tablet:px-3 py-0.5 tablet:py-1 rounded-full uppercase tracking-wider shrink-0",
                isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}>{data.status}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 overflow-x-auto no-scrollbar w-full pb-1 -mb-1">
              <p className="text-[10px] tablet:text-sm text-slate-500 font-medium flex items-center gap-1 whitespace-nowrap">
                <ShieldCheck size={12} className="text-indigo-500 shrink-0" />
                ID: {data.id}
              </p>
              <span className="text-slate-300 shrink-0">•</span>
              <p className="text-[10px] tablet:text-sm text-slate-500 font-medium whitespace-nowrap shrink-0">{data.service} Plan</p>
              <span className="text-slate-300 shrink-0">•</span>
              <p className="text-[10px] tablet:text-sm text-slate-500 font-medium flex items-center gap-1 whitespace-nowrap shrink-0">
                <MapPin size={12} className="text-slate-400 shrink-0" />
                {data.city}, {data.province}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto shrink-0">
          <button
            onClick={() => setEditModalOpen(true)}
            aria-label="Edit Network Profile"
            className="flex flex-1 md:flex-none items-center justify-center gap-2 px-4 tablet:px-6 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-xs tablet:text-sm transition-all shadow-sm"
          >
            <Settings size={16} />
            <span className="truncate">Edit Profile</span>
          </button>
          <button
            onClick={handleSendReminder}
            disabled={isSending}
            aria-label="Send payment reminder"
            className="flex flex-1 md:flex-none items-center justify-center gap-2 px-4 tablet:px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs tablet:text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            <Bell size={16} className={cn(isSending && "animate-bounce")} />
            <span className="truncate">{isSending ? "Sending..." : "Send Reminder"}</span>
          </button>
          <button
            onClick={handleToggleVip}
            disabled={isTogglingVip}
            aria-label={isVip ? "Remove VIP status" : "Mark as VIP"}
            className={cn(
              "flex flex-1 md:flex-none items-center justify-center gap-2 px-4 tablet:px-6 py-3 border rounded-2xl font-bold text-xs tablet:text-sm transition-all disabled:opacity-50",
              isVip
                ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-600 dark:text-amber-400"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <Star size={16} className={cn(isVip && "fill-current")} />
            <span className="truncate">{isTogglingVip ? "Updating..." : isVip ? "VIP Member" : "Mark VIP"}</span>
          </button>
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
                customerId: data.id,
                customerName: data.name,
                service: data.service,
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
            className="flex flex-1 md:flex-none items-center justify-center gap-2 px-4 tablet:px-6 py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 rounded-2xl font-bold text-xs tablet:text-sm transition-all cursor-pointer"
          >
            <CreditCard size={16} />
            <span className="truncate">Payment Link</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 tablet:grid-cols-2 lg:grid-cols-4 gap-3 tablet:gap-4">
        {[
          { label: "Lifetime Value (LTV)", value: formatCompactNumber(data.ltv), icon: TrendingUp, color: "text-indigo-500", bg: "bg-indigo-500/10" },
          { label: "Payment Frequency", value: `${data.txCount}x`, icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Avg. Monthly Payment", value: formatCompactNumber(avgPayment), icon: Activity, color: "text-violet-500", bg: "bg-violet-500/10" },
          { label: "Tenure (Months)", value: `${tenureMonths || 0} Mo`, icon: Milestone, color: "text-cyan-500", bg: "bg-cyan-500/10" }
        ].map((k, i) => (
          <m.div key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-900 p-4 tablet:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm"
          >
            <div className={`w-8 h-8 tablet:w-10 tablet:h-10 rounded-xl flex items-center justify-center mb-3 tablet:mb-4 ${k.bg} ${k.color}`}>
              <k.icon size={16} className="tablet:w-5 tablet:h-5" />
            </div>
            <p className="text-[10px] tablet:text-xs font-bold text-slate-500 uppercase tracking-widest leading-tight">{k.label}</p>
            <h2 className="text-sm sm:text-lg tablet:text-xl xl:text-2xl font-black text-slate-900 dark:text-white mt-1 whitespace-nowrap tabular-nums">{k.value}</h2>
          </m.div>
        ))}
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 laptop:grid-cols-3 gap-8 items-stretch">
        {/* Left Column: Health & CRM */}
        <div className="flex flex-col gap-8 h-full">
          <HealthScoreGauge score={data.healthScore} />

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-lg font-black mb-6">Score Breakdown</h2>
            <div className="space-y-3">
              <ScoreItem label="Baseline" value={70} positive={true} />
              <ScoreItem label={`Status: ${data.status}`} value={isActive ? 20 : -40} positive={isActive} />
              <ScoreItem label={`Late Payments (${lateCount}x)`} value={-(lateCount * 10)} positive={lateCount === 0} />
              <ScoreItem label="High LTV Bonus" value={data.ltv > 1000000 ? 10 : 0} positive={true} />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1">
            <h2 className="text-base sm:text-lg font-black mb-6 flex items-start gap-3">
              <Users size={20} className="text-indigo-500 mt-1 shrink-0" />
              <span>CRM Intelligence</span>
            </h2>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer Segment</p>
                <p className={cn("text-base sm:text-lg font-black", segmentColor.split(' ')[0])}>{segment}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Churn Risk Level</p>
                <p className={cn("text-base sm:text-lg font-black", churnColor)}>{churnPct}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Service</p>
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold">
                  <Package size={16} className="text-indigo-500" />
                  {data.service}
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-3">
                <div className="shrink-0">
                  <p className="text-[10px] font-bold text-slate-400">Phone</p>
                  <p className="text-xs font-black dark:text-white flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                    <Phone size={12} className="text-slate-400 shrink-0" /> {data.no_telp || 'N/A'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-slate-400">Region</p>
                  <p className="text-xs font-black dark:text-white flex items-center justify-end gap-1.5 mt-0.5 whitespace-nowrap">
                    <MapPin size={12} className="text-slate-400 shrink-0" /> {data.city}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Network Profile Card */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base sm:text-lg font-black flex items-start gap-3">
                <Router size={20} className="text-indigo-500 mt-1 shrink-0" />
                <span>Network Profile</span>
              </h2>
            </div>
            
              <div className="space-y-4">
              <CopyItem label="PPPoE Username" value={data.pppoe_user} icon={Users} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CopyItem label="IP Address" value={data.ip_address} icon={Globe} />
                <CopyItem label="MAC Address" value={data.mac_address} icon={Cpu} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CopyItem label="OLT Port" value={data.olt_port} icon={Router} />
                <CopyItem label="Optical Attenuation" value={data.optical_attenuation} icon={Activity} />
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-medium">
                  <Info size={14} className="shrink-0" />
                  <p>Click any item above to copy it to your clipboard for quick NOC troubleshooting.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Charts & Tables */}
        <div className="lg:col-span-1 laptop:col-span-2 flex flex-col gap-8 h-full">

          {/* Payment Timeline */}
          <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <h2 className="text-lg md:text-xl font-black">Payment Performance Timeline</h2>
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
              {mounted ? (
                <ResponsiveContainer id="paymentPerformanceTimelineChart" width="100%" height={320}>
                  <BarChart data={data.payment_history} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
                      dy={15}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `Rp${val / 1000}k`} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      content={({ active, payload }) => active && payload && payload.length && (
                        <div className="bg-slate-900/95 backdrop-blur-xl text-white px-3 md:px-6 py-2 md:py-4 rounded-2xl shadow-2xl border border-white/10 ring-1 ring-white/5 min-w-[140px] md:min-w-[240px]">
                          <p className="opacity-50 mb-2 md:mb-3 uppercase tracking-widest text-[8px] md:text-[10px] font-black">{payload[0].payload.month}</p>
                          <div className="space-y-2 md:space-y-3">
                            {payload.map((entry: any, i: number) => (
                              <div key={i} className="flex items-center justify-between gap-4 md:gap-12">
                                <span className="flex items-center gap-2 md:gap-3">
                                  <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full shadow-lg" style={{ backgroundColor: entry.color }} />
                                  <span className="text-[10px] md:text-sm font-bold opacity-90">{entry.name === 'ontime' ? 'Tepat Waktu' : 'Terlambat'}</span>
                                </span>
                                <span className="text-[10px] md:text-sm font-black font-mono text-indigo-400">
                                  {entry.payload.isUnpaid && entry.name === 'late' ? 'UNPAID' : formatCurrency(entry.value)}
                                </span>
                              </div>
                            ))}
                            <div className="pt-2 md:pt-3 border-t border-white/10 flex justify-between items-center gap-4 md:gap-12">
                              <span className="text-[8px] md:text-[10px] font-black opacity-40 uppercase">Total Revenue</span>
                              <span className="text-[10px] md:text-sm font-black font-mono text-emerald-400">{formatCurrency(payload.reduce((acc, curr) => acc + Number(curr.value), 0))}</span>
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
              ) : (
                <div className="w-full h-full bg-slate-100/5 animate-pulse rounded-2xl border border-slate-200/10 dark:border-slate-800/10" />
              )}
            </div>
          </div>

          {/* Ticket History */}
          <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div 
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setIsTicketHistoryExpanded(!isTicketHistoryExpanded)}
              >
                <h2 className="text-base sm:text-lg font-black flex items-center gap-3 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                  <AlertCircle size={20} className="text-rose-500 shrink-0" />
                  <span>Ticket History</span>
                </h2>
                <ChevronDown size={16} className={cn("text-slate-400 transition-transform", isTicketHistoryExpanded && "rotate-180")} />
              </div>
              <button
                onClick={() => setTicketSlideOpen(true)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl transition-colors"
              >
                + New Ticket
              </button>
            </div>
            
            <AnimatePresence initial={false}>
              {isTicketHistoryExpanded && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-2">
              {initialTickets.length === 0 ? (
                <div className="text-center p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-sm font-medium">
                  No tickets found for this customer.
                </div>
              ) : (
                <>
                  {paginatedTickets.map((t) => (
                    <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-black text-slate-900 dark:text-white">{t.ticket_number}</span>
                          <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase", 
                            t.priority === 'CRITICAL' ? 'bg-rose-500/10 text-rose-500' :
                            t.priority === 'HIGH' ? 'bg-amber-500/10 text-amber-500' :
                            t.priority === 'MEDIUM' ? 'bg-indigo-500/10 text-indigo-500' :
                            'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          )}>{t.priority}</span>
                          <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase", 
                            t.status === 'OPEN' ? 'bg-amber-500/10 text-amber-500' :
                            t.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500' :
                            'bg-emerald-500/10 text-emerald-500'
                          )}>{t.status}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t.description}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">
                          {new Date(t.created_at_str).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {totalTicketPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                      <div className="text-[10px] font-bold text-slate-500">
                        Page {ticketPage} of {totalTicketPages}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setTicketPage(prev => Math.max(prev - 1, 1))}
                          disabled={ticketPage === 1}
                          className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <button
                          onClick={() => setTicketPage(prev => Math.min(prev + 1, totalTicketPages))}
                          disabled={ticketPage === totalTicketPages}
                          className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-base sm:text-xl font-black mb-8 flex items-center gap-2">
              <Clock className="text-rose-500 w-5 h-5 sm:w-6 sm:h-6" /> Late Payment Breakdown
            </h2>
            
            {/* Desktop Table View (Hidden on Mobile) */}
            <div className="hidden sm:block overflow-x-auto no-scrollbar rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left min-w-[500px]">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Billing Month</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Days Delayed</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">Reference Date</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">Payment Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedLatePayments.map((lp: any, i: number) => (
                    <tr key={i} className={cn(
                      "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                      lp.isUnpaid && "bg-rose-500/5 dark:bg-rose-500/10"
                    )}>
                      <td className="px-6 py-4 font-black text-slate-900 dark:text-white">
                        <div className="flex flex-col">
                          {lp.month}
                          {lp.isUnpaid && <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-0.5">Current Overdue</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-sm font-black",
                          lp.isUnpaid ? "bg-rose-500 text-white animate-pulse" : "bg-rose-500/10 text-rose-500"
                        )}>
                          {lp.daysLate} days
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-500">
                        {lp.isUnpaid ? "Belum Terdeteksi" : new Date(lp.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white">
                        {lp.isUnpaid ? (
                          <span className="text-xs font-black text-rose-500 bg-rose-500/10 px-2 py-1 rounded-md border border-rose-500/20">UNPAID</span>
                        ) : formatCompactNumber(lp.amount)}
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

            {/* Mobile Accordion/Dropdown View (Hidden on Desktop) */}
            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
              {data.late_payments && data.late_payments.length > 0 ? (
                paginatedLatePayments.map((lp: any, i: number) => {
                  const isExpanded = !!expandedLatePayments[i];
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "p-4 space-y-4 transition-colors",
                        lp.isUnpaid ? "bg-rose-500/5 dark:bg-rose-500/10" : "bg-white dark:bg-slate-900"
                      )}
                    >
                      {/* Accordion Trigger Row */}
                      <div 
                        onClick={() => toggleLatePayment(i)}
                        className="flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex flex-col text-left">
                          <span className="font-black text-slate-900 dark:text-slate-100 text-sm group-hover:text-rose-500 transition-colors">
                            {lp.month}
                          </span>
                          {lp.isUnpaid && (
                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-0.5 animate-pulse">
                              Current Overdue
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-lg text-[10px] font-black shrink-0",
                            lp.isUnpaid ? "bg-rose-500 text-white animate-pulse" : "bg-rose-500/10 text-rose-500"
                          )}>
                            {lp.daysLate} days
                          </span>
                          <m.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="text-slate-400"
                          >
                            <ChevronRight size={16} />
                          </m.div>
                        </div>
                      </div>

                      {/* Dropdown Collapsible Content */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <m.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-2 pb-1 grid grid-cols-2 gap-3 text-xs border-t border-slate-100 dark:border-slate-800/60 mt-3">
                              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 text-left">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Reference Date</span>
                                <span className="font-bold text-slate-600 dark:text-slate-300">
                                  {lp.isUnpaid ? "Belum Terdeteksi" : new Date(lp.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                              </div>
                              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 text-left">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Amount</span>
                                {lp.isUnpaid ? (
                                  <span className="text-[10px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 inline-block">UNPAID</span>
                                ) : (
                                  <span className="font-black text-slate-900 dark:text-white">{formatCompactNumber(lp.amount)}</span>
                                )}
                              </div>
                            </div>
                          </m.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              ) : (
                <div className="px-6 py-12 text-center text-slate-400 font-medium italic text-sm">
                  This customer has no history of late payments. (Perfect Score)
                </div>
              )}
            </div>

            {/* Pagination Controls for Late Payments */}
            {totalLatePaymentPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-500">
                  Page {latePaymentPage} of {totalLatePaymentPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLatePaymentPage(prev => Math.max(prev - 1, 1))}
                    disabled={latePaymentPage === 1}
                    className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setLatePaymentPage(prev => Math.min(prev + 1, totalLatePaymentPages))}
                    disabled={latePaymentPage === totalLatePaymentPages}
                    className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={cn("p-6 rounded-3xl border shadow-lg flex flex-col gap-4 relative overflow-hidden",
            isAtRisk ? "bg-rose-500/5 border-rose-500/20" : isExcellent ? "bg-emerald-500/5 border-emerald-500/20" : "bg-indigo-500/5 border-indigo-500/20"
          )}>
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                isAtRisk ? "bg-rose-500 text-white" : isExcellent ? "bg-emerald-500 text-white" : "bg-indigo-500 text-white"
              )}>
                {isAtRisk ? <Zap size={24} /> : isExcellent ? <ArrowUpRight size={24} /> : <Activity size={24} />}
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight">
                {isAtRisk ? "Retention Alert" : isExcellent ? "Upsell Opportunity" : "Growth Maintenance"}
              </h3>
            </div>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">
              {generateAIRecommendation(data)}
            </p>
            <button className={cn("w-full mt-2 py-3.5 rounded-xl font-black text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]",
              isAtRisk ? "bg-rose-500 text-white shadow-rose-500/20" : isExcellent ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-indigo-500 text-white shadow-indigo-500/20"
            )}>
              {isAtRisk ? "Launch Task" : isExcellent ? "Upsell Now" : "Log Observation"}
            </button>
          </div>
          {/* End of Right Column */}
        </div>
      </div>

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        token={paymentToken}
        redirectUrl={paymentRedirectUrl}
        orderId={paymentOrderId}
      />
      
      <CustomerEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        customer={data}
      />

      <TicketSlideOver
        isOpen={ticketSlideOpen}
        onClose={() => setTicketSlideOpen(false)}
        customerId={data.id}
      />
    </div>
  );
}
