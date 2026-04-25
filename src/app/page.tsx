"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  ArrowDown,
  TrendingUp,
  User,
  DollarSign,
  UserMinus,
  Wallet,
  Clock,
  ExternalLink,
  Download,
  Minus,
  ArrowUpRight,
  X,
  Target,
  Zap,
  Globe
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { getCustomers, getServiceTiers, getExpenses, getTransactions, createNotification, getRevenueGrowthTrend } from "@/actions/db";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import { domToPng } from "modern-screenshot";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.color }}></span>
          {`${payload[0].name}: ${payload[0].value}%`}
        </p>
      </div>
    );
  }
  return null;
};

const RevenueTooltip = ({ active, payload, label }: any) => {
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

export default function Dashboard() {
  const router = useRouter();
  const dashboardRef = useRef<HTMLDivElement>(null);
  const { data: customerList = [], isLoading: loadingCustomers } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const { data: serviceTiers = [], isLoading: loadingTiers } = useQuery({ queryKey: ['serviceTiers'], queryFn: getServiceTiers });
  const { data: expenseList = [], isLoading: loadingExpenses } = useQuery({ queryKey: ['expenses'], queryFn: getExpenses });
  const { data: transactions = [], isLoading: loadingTx } = useQuery({ 
    queryKey: ['transactions'], 
    queryFn: getTransactions,
    refetchInterval: 60000 
  });
  const { data: trendData = [], isLoading: loadingTrend } = useQuery({
    queryKey: ['revenueGrowthTrend'],
    queryFn: getRevenueGrowthTrend
  });

  const [mounted, setMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [isDownloadConfirmOpen, setIsDownloadConfirmOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Data Validation: Sync Check between Customers and Transactions
  useEffect(() => {
    if (loadingCustomers || loadingTx || loadingTiers || !customerList.length || !transactions.length) return;

    const active = customerList.filter((c: any) => c.status === "Active");
    const estimatedRevenue = active.reduce((sum, customer) => {
      const tier = serviceTiers.find((t: any) => {
        const sName = customer.service?.toLowerCase();
        const tName = t.name?.toLowerCase();
        if (tName === "gamers node") return sName === "gamers";
        return sName === tName;
      });
      const price = tier ? parseInt(tier.price.replace(/[^0-9]/g, '')) : 0;
      return sum + price;
    }, 0);

    const verifiedTxTotal = transactions
      .filter((t: any) => t.status === "Verified")
      .reduce((sum, t) => sum + (parseInt(t.amount.replace(/[^0-9]/g, '')) || 0), 0);

    // Disable the automated flood of notifications
    /*
    if (estimatedRevenue !== verifiedTxTotal) {
      const diff = Math.abs(estimatedRevenue - verifiedTxTotal);
      const formattedDiff = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(diff);
      
      createNotification(
        "warning",
        "Revenue Data Mismatch",
        `Dashboard detection: A discrepancy of ${formattedDiff} exists between Active Customer capacity and Verified Transactions.`
      );
    }
    */
  }, [customerList, transactions, serviceTiers, loadingCustomers, loadingTx, loadingTiers]);

  useEffect(() => {
    setLastUpdated(new Date());
    setMinutesAgo(0);
  }, [customerList.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 60000);
      setMinutesAgo(diff);
    }, 60000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const dynamicData = useMemo(() => {
    const calculateRevenue = () => {
      const active = customerList.filter(c => c.status === "Active");
      
      // Calculate Revenue based on Active Customers' Service Tiers (Consistent with Profitability MRR)
      const estimatedRevenue = active.reduce((sum, customer) => {
        const tier = serviceTiers.find(t => {
          const sName = customer.service?.toLowerCase();
          const tName = t.name?.toLowerCase();
          if (tName === "gamers node") return sName === "gamers";
          return sName === tName;
        });
        const price = tier ? parseInt(tier.price.replace(/[^0-9]/g, '')) : 0;
        return sum + price;
      }, 0);

      // Fallback to verified transactions if estimation is 0
      const totalVerifiedRevenue = transactions
        .filter(t => t.status === "Verified" && t.keterangan === 'pemasukan')
        .reduce((sum, t) => sum + (parseInt(t.amount.replace(/[^0-9]/g, '')) || 0), 0);

      return estimatedRevenue > 0 ? estimatedRevenue : totalVerifiedRevenue;
    };

    const activeCustomers = customerList.filter(c => c.status === "Active");
    const currentRevenue = transactions
      .filter(t => t.status === "Verified" && t.keterangan === 'pemasukan')
      .reduce((sum, t) => sum + (parseInt(t.amount.replace(/[^0-9]/g, '')) || 0), 0);
    
    const currentARPU = activeCustomers.length > 0 ? currentRevenue / activeCustomers.length : 0;

    // Churn Rate Calculation (Inactive / Total Customers)
    const totalCustomersCount = customerList.length;
    const inactiveCustomersCount = customerList.filter(c => c.status === "Inactive").length;
    const churnRateVal = totalCustomersCount > 0 ? (inactiveCustomersCount / totalCustomersCount) * 100 : 0;

    // CAC Calculation (Total Absolute Expense / Total Customers)
    const totalAbsExpense = expenseList.reduce((sum: number, e: any) => sum + Math.abs(Number(e.amount) || 0), 0);
    const cacVal = totalCustomersCount > 0 ? totalAbsExpense / totalCustomersCount : 0;

    const distribution = serviceTiers.map(tier => {
      const count = activeCustomers.filter(c => {
        const service = c.service?.toLowerCase();
        const tierName = tier.name.toLowerCase();
        if (tierName === "gamers node") return service === "gamers";
        return service === tierName;
      }).length;

      const colorMap: Record<string, string> = {
        "Standard": "#004ac6",
        "Premium": "#acbfff",
        "Basic": "#ffb596",
        "Gamers Node": "#e0e3e5"
      };

      return {
        name: tier.name,
        value: activeCustomers.length > 0 ? Math.round((count / activeCustomers.length) * 100) : 0,
        color: colorMap[tier.name] || "#ccc"
      };
    });

    const getMonthStats = (monthStr: string) => {
      const txs = transactions.filter((t: any) => t.status === "Verified" && t.keterangan === "pemasukan" && t.timestamp && String(t.timestamp).startsWith(monthStr));
      const rev = txs.reduce((sum, t) => sum + (parseInt(t.amount.replace(/[^0-9]/g, '')) || 0), 0);
      const custs = customerList.filter((c: any) => c.createdAt && String(c.createdAt).startsWith(monthStr));
      const totalCustsAtEnd = customerList.filter((c: any) => c.createdAt && String(c.createdAt) <= `${monthStr}-31`).length;
      const inactiveInMonth = customerList.filter((c: any) => c.status === "Inactive" && c.createdAt && String(c.createdAt).startsWith(monthStr)).length;
      
      const activeCount = customerList.filter((c: any) => c.status === "Active" && c.createdAt && String(c.createdAt) <= `${monthStr}-31`).length;
      const arpu = activeCount > 0 ? rev / activeCount : 0;
      
      const exps = expenseList.filter((e: any) => e.date && String(e.date).startsWith(monthStr));
      const txExps = transactions.filter((t: any) => t.status === "Verified" && t.keterangan === "pengeluaran" && t.timestamp && String(t.timestamp).startsWith(monthStr));
      
      const totalExp = 
        exps.reduce((sum: number, e: any) => sum + Math.abs(Number(e.amount) || 0), 0) +
        txExps.reduce((sum, t) => sum + (parseInt(t.amount.replace(/[^0-9]/g, '')) || 0), 0);
      const cac = totalCustsAtEnd > 0 ? totalExp / totalCustsAtEnd : 0;
      const churn = totalCustsAtEnd > 0 ? (inactiveInMonth / totalCustsAtEnd) * 100 : 0;

      return { rev, arpu, cac, churn, totalExp };
    };

    const formatCompactNumber = (number: number) => {
      if (number >= 1000000000) return `Rp ${(number / 1000000000).toFixed(2)}B`;
      if (number >= 1000000) return `Rp ${(number / 1000000).toFixed(2)}M`;
      if (number >= 1000) return `Rp ${(number / 1000).toFixed(1)}k`;
      return `Rp ${number.toFixed(0)}`;
    };

    // Generate dynamic trend data for the last 6 months (Now using DB-provided data)
    /* 
    const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    const currentYear = new Date().getFullYear();
    const currentMonthIdx = new Date().getMonth();
    
    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      let mIdx = currentMonthIdx - i;
      let year = currentYear;
      if (mIdx < 0) {
        mIdx += 12;
        year -= 1;
      }
      const monthStr = `${year}-${months[mIdx]}`;
      const stats = getMonthStats(monthStr);
      trendData.push({
        month: new Date(year, mIdx).toLocaleString('default', { month: 'short' }),
        revenue: stats.rev,
        expenses: stats.totalExp
      });
    }
    */

    const currentStats = getMonthStats("2026-04");
    const prevStats = getMonthStats("2026-03");

    const calculateTrend = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? "+100%" : "0%";
      const diff = ((current / prev) - 1) * 100;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    };

    return {
      arpu: formatCompactNumber(currentARPU),
      totalRevenue: formatCompactNumber(currentRevenue),
      churnRate: `${churnRateVal.toFixed(1)}%`,
      cac: formatCompactNumber(cacVal),
      distribution,
      trendData: trendData,
      trends: {
        arpu: calculateTrend(currentStats.arpu, prevStats.arpu),
        cac: calculateTrend(currentStats.cac, prevStats.cac),
        churn: calculateTrend(currentStats.churn, prevStats.churn),
        revenue: calculateTrend(currentStats.rev, prevStats.rev)
      }
    };
  }, [customerList, serviceTiers, expenseList, transactions, trendData]);

  const kpis = [
    { name: "ARPU", value: dynamicData.arpu, trend: dynamicData.trends.arpu, trendType: dynamicData.trends.arpu.startsWith('+') ? "up" : "down", icon: "user" },
    { name: "CAC", value: dynamicData.cac, trend: dynamicData.trends.cac, trendType: dynamicData.trends.cac.startsWith('-') ? "up" : "down", icon: "dollar" }, // Lower CAC is 'up' in terms of performance
    { name: "Churn Rate", value: dynamicData.churnRate, trend: dynamicData.trends.churn, trendType: dynamicData.trends.churn.startsWith('-') ? "up" : "down", icon: "user-minus" }, // Lower Churn is 'up'
    { name: "Total Revenue", value: dynamicData.totalRevenue, trend: dynamicData.trends.revenue, trendType: dynamicData.trends.revenue.startsWith('+') ? "up" : "down", icon: "wallet" },
  ];

  const handleDownload = async () => {
    if (!dashboardRef.current) return;
    setIsDownloadConfirmOpen(false);
    setIsDownloading(true);
    
    try {
      const dataUrl = await domToPng(dashboardRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        style: {
          borderRadius: '0'
        }
      });
      
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`ISP-FinTrack-Dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loadingCustomers || loadingTiers || loadingExpenses || loadingTx || loadingTrend) {
    return (
      <div className="min-h-[70vh] w-full flex flex-col items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold tracking-wide">Loading Dashboard Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {isRoadmapOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRoadmapOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Infrastructure Roadmap 2026</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Expansion and upgrade schedule for West Java regions.</p>
                </div>
                <button 
                  onClick={() => setIsRoadmapOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                {[
                  { phase: "Phase 1: Bandung Central", status: "In Progress", date: "Q1 2026", icon: Zap, color: "text-blue-500 bg-blue-50" },
                  { phase: "Phase 2: Cimahi & Padalarang", status: "Planning", date: "Q2 2026", icon: Target, color: "text-orange-500 bg-orange-50" },
                  { phase: "Phase 3: Garut & Tasikmalaya", status: "Upcoming", date: "Q3 2026", icon: Globe, color: "text-green-500 bg-green-50" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className={cn("p-3 rounded-xl", item.color)}>
                      <item.icon size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{item.phase}</h4>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.date}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-500 mt-1">Status: {item.status}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                <button 
                  onClick={() => setIsRoadmapOpen(false)}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20"
                >
                  Acknowledge
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Download Confirmation Modal */}
        {isDownloadConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDownloadConfirmOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-10 text-center"
            >
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Download size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">Export Dashboard?</h3>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                System will generate a high-resolution PDF report of the current executive overview. This process may take a few seconds.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDownload}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:opacity-90 transition-all"
                >
                  Confirm & Download
                </button>
                <button 
                  onClick={() => setIsDownloadConfirmOpen(false)}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div ref={dashboardRef} className="space-y-8 pb-10">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
        >
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div>
              <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Executive Overview</h2>
              <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                <Clock size={14} />
                {minutesAgo === 0 ? "Data updated just now" : `Data updated ${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Period</p>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {(() => {
                    const now = new Date();
                    const month = now.toLocaleString("en-US", { month: "short" });
                    const year = now.getFullYear();
                    const quarter = Math.floor(now.getMonth() / 3) + 1;

                    return `Q${quarter} ${month} ${year}`;
                  })()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsDownloadConfirmOpen(true)}
                  disabled={isDownloading}
                  className={cn(
                    "p-3 text-slate-400 hover:text-primary rounded-xl hover:bg-slate-100 transition-colors",
                    isDownloading && "animate-pulse cursor-not-allowed"
                  )}
                >
                  <Download size={20} />
                </button>
                <button 
                  onClick={() => router.push('/profitability')}
                  className="bg-primary text-white p-3 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  <TrendingUp size={20} />
                </button>
              </div>
            </div>
          </motion.div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, index) => (
              <motion.div
                key={kpi.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24, delay: index * 0.1 }}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-40 group hover:border-primary/50 transition-all"
              >
                <div className="flex justify-between items-center">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {kpi.icon === "user" && <User size={20} />}
                    {kpi.icon === "dollar" && <DollarSign size={20} />}
                    {kpi.icon === "user-minus" && <UserMinus size={20} />}
                    {kpi.icon === "wallet" && <Wallet size={20} />}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-black px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    <ArrowUp size={10} /> {kpi.trend}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{kpi.name}</p>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">{kpi.value}</h3>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.4 }}
              className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Revenue Growth</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Gross revenue vs projected expenses.</p>
                </div>
                <Link
                  href="/profitability"
                  className="
                    flex items-center gap-2
                    px-4 py-3 rounded-xl
                    bg-slate-50 dark:bg-slate-800
                    text-primary
                    hover:bg-primary hover:text-primary-foreground
                    transition-all
                  "
                >
                  <span className="text-sm font-semibold whitespace-nowrap">
                    View Details
                  </span>
                  <ExternalLink size={18} />
                </Link>
              </div>
              <div className="flex-1 w-full mt-4 min-h-[300px]">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dynamicData.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} 
                        dy={10} 
                      />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip content={<RevenueTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#004ac6" 
                        strokeWidth={4} 
                        dot={{ r: 4, fill: '#004ac6', strokeWidth: 2, stroke: '#fff' }} 
                        activeDot={{ r: 6, strokeWidth: 0 }}
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
                )}
              </div>
            </motion.section>

            <div className="space-y-8">
              {/* Right Column: Customer Mix */}
              <motion.section 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.5 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm"
              >
            <div className="mb-8">
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Customer Mix</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Segmentation</p>
            </div>
            <div className="flex items-center">
              <div className="h-[220px] w-[60%]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={dynamicData.distribution} 
                      innerRadius={70} 
                      outerRadius={90} 
                      paddingAngle={12} 
                      dataKey="value"
                      startAngle={180}
                      endAngle={-180}
                      stroke="none"
                      cornerRadius={10}
                    >
                      {dynamicData.distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-[40%] space-y-4 pl-4 pr-6">
                {dynamicData.distribution.map((item) => (
                  <div key={item.name} className="flex items-center group">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">{item.name}</span>
                    </div>
                    <span className="ml-auto text-xs font-black text-slate-900 dark:text-white tabular-nums">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

              <motion.section
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.6 }}
                className="bg-slate-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/20 transition-colors" />
                <h4 className="text-white font-black text-lg mb-2 relative z-10">Upgrade Infrastructure</h4>
                <p className="text-slate-400 text-sm mb-6 font-medium leading-relaxed relative z-10">Expand nodes in the Bandung area to capture growing demand.</p>
                <motion.button
                  onClick={() => setIsRoadmapOpen(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-2 relative z-10 shadow-xl shadow-white/5"
                >
                  Review Roadmap <ArrowUpRight size={18} />
                </motion.button>
              </motion.section>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
