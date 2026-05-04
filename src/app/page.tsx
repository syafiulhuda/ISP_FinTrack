"use client";

import { m, AnimatePresence } from "framer-motion";
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
  Cell,
  AreaChart,
  Area
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from '@/actions/dashboard';
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatCard } from "@/components/ui/StatCard";
import { Transaction, ServiceTier, Customer } from "@/types";

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload }: TooltipProps) => {
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

const RevenueTooltip = ({ active, payload, label }: TooltipProps) => {
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
  
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: getDashboardData
  });

  const customerList = dashboardData?.customers || [];
  const serviceTiers = dashboardData?.tiers || [];
  const transactions = dashboardData?.transactions || [];
  const inactiveCust = dashboardData?.inactiveCust || [];
  const customerGrowthTrend = dashboardData?.customerGrowthTrend || [];
  const expenseList = dashboardData?.expenses || [];
  const trendData = dashboardData?.trendData || [];


  const [mounted, setMounted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Data Validation: Sync Check between Customers and Transactions
  useEffect(() => {
    if (isLoading || !customerList.length || !transactions.length) return;

    const active = customerList.filter((c: any) => c.status === "Active");
    const estimatedRevenue = active.reduce((sum: number, customer: any) => {
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
      .reduce((sum: number, t: any) => sum + (parseInt(String(t.amount || '0').replace(/[^0-9]/g, '')) || 0), 0);

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
  }, [customerList, transactions, serviceTiers, isLoading]);

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
    const activeCustomers = customerList.filter((c: any) => c.status === "Active");
    
    const extractMonth = (dateVal: any) => {
      if (!dateVal) return "";
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) return String(dateVal).slice(0, 7);
        
        // Force evaluation in Asia/Jakarta timezone (UTC+7) using pure math
        const localTime = d.getTime() + (7 * 60 * 60 * 1000);
        const localDate = new Date(localTime);
        const year = localDate.getUTCFullYear();
        const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
      } catch (e) {
        return String(dateVal).slice(0, 7);
      }
    };

    const getMonthStats = (monthStr: string) => {
      // 1. Revenue: Verified pemasukan in month
      const txs = transactions.filter((t: any) => 
        t.status === "Verified" && 
        t.keterangan === "pemasukan" && 
        extractMonth(t.timestamp) === monthStr
      );
      const rev = txs.reduce((sum: number, t: any) => sum + (parseInt(String(t.amount || '0').replace(/[^0-9]/g, '')) || 0), 0);
      
      // 2. Active Count (for ARPU denominator): status='Active' AND createdAt <= month
      const activeCount = customerList.filter((c: any) => 
        c.status === "Active" && 
        extractMonth(c.createdAt) <= monthStr
      ).length;
      
      const arpu = activeCount > 0 ? rev / activeCount : 0;
      
      // 3. Expense: Verified pengeluaran in month
      const txExps = transactions.filter((t: any) => 
        t.status === "Verified" && 
        t.keterangan === "pengeluaran" && 
        extractMonth(t.timestamp) === monthStr
      );
      const totalExp = txExps.reduce((sum: number, t: any) => sum + (parseInt(String(t.amount || '0').replace(/[^0-9]/g, '')) || 0), 0);
      
      // 4. New Customers: createdAt in month
      const newCustsInMonth = customerList.filter((c: any) => 
        extractMonth(c.createdAt) === monthStr
      ).length;
      
      const cac = newCustsInMonth > 0 ? totalExp / newCustsInMonth : 0;
      
      // 5. Inactive this month: From inactive_cust table
      const inactiveInMonth = (inactiveCust as any[]).filter((ic: any) => 
        (ic.inactive_month && ic.inactive_month === monthStr) || extractMonth(ic.inactiveat) === monthStr
      ).length;
      
      // 6. Total Customers (Churn denominator): status='Active' AND createdAt <= month
      // User SQL uses: (SELECT COUNT(*) FROM customers WHERE status = 'Active' and TO_CHAR("createdAt"::date, 'YYYY-MM') <= m.month)
      const totalCustsAtEnd = activeCount; 
      
      const churn = totalCustsAtEnd > 0 ? (inactiveInMonth / totalCustsAtEnd) * 100 : 0;

      return { rev, arpu, cac, churn, totalExp, newCusts: newCustsInMonth };
    };


    const distribution = serviceTiers.map((tier: any) => {
      const count = activeCustomers.filter((c: any) => {
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

    const formatCompactNumber = (number: number) => {
      if (number >= 1000000000) return `Rp ${(number / 1000000000).toFixed(2)}B`;
      if (number >= 1000000) return `Rp ${(number / 1000000).toFixed(2)}M`;
      if (number >= 1000) return `Rp ${(number / 1000).toFixed(1)}k`;
      return `Rp ${number.toFixed(0)}`;
    };

    // --- CALCULATE TRENDS ---
    const monthsWithData = transactions
      .filter((t: any) => t.status === "Verified" && t.keterangan === "pemasukan")
      .map((t: any) => extractMonth(t.timestamp))
      .filter((m: string) => m.match(/^\d{4}-\d{2}$/))
      .sort();
    
    // Default to 2026-05 and 2026-04 for consistency with user SQL
    const latestMonthStr = monthsWithData.length > 0 ? monthsWithData[monthsWithData.length - 1] : "2026-05";
    const [year, month] = latestMonthStr.split('-').map(Number);
    
    const latestStats = getMonthStats(latestMonthStr);
    
    let prevMonthStr = "";
    if (month === 1) {
      prevMonthStr = `${year - 1}-12`;
    } else {
      prevMonthStr = `${year}-${String(month - 1).padStart(2, '0')}`;
    }
    const prevStats = getMonthStats(prevMonthStr);

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? `+${current.toFixed(1)}%` : "0%";
      const diff = ((current / previous) - 1) * 100;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    };

    // CAC Display Logic (Match SQL CASE)
    let cacDisplay = formatCompactNumber(latestStats.cac);
    if (latestStats.newCusts === 0) {
      cacDisplay = latestStats.totalExp > 0 ? "N/A" : "Rp 0";
    }

    // CAC Trend Logic (Match SQL CASE)
    let cacTrend = calculateTrend(latestStats.cac, prevStats.cac);
    if (latestStats.newCusts === 0 || prevStats.newCusts === 0) {
      cacTrend = "-";
    }

    // Churn Trend Logic (Percentage Points Difference)
    const churnDiff = latestStats.churn - prevStats.churn;
    const churnTrendLabel = `${churnDiff >= 0 ? '+' : ''}${churnDiff.toFixed(1)}%`;

    const months = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    const currentYear = new Date().getFullYear();
    const currentMonthIdx = new Date().getMonth();
    
    const calculatedTrendData = [];
    for (let i = 5; i >= 0; i--) {
      let mIdx = currentMonthIdx - i;
      let year = currentYear;
      if (mIdx < 0) {
        mIdx += 12;
        year -= 1;
      }
      const monthStr = `${year}-${months[mIdx]}`;
      const stats = getMonthStats(monthStr);
      calculatedTrendData.push({
        month: new Date(year, mIdx).toLocaleString('default', { month: 'short' }),
        revenue: stats.rev,
        expenses: stats.totalExp
      });
    }

    return {
      arpu: formatCompactNumber(latestStats.arpu),
      totalRevenue: formatCompactNumber(latestStats.rev),
      churnRate: `${latestStats.churn.toFixed(1)}%`,
      cac: cacDisplay,
      distribution: distribution,
      trendData: calculatedTrendData,
      growthTrend: customerGrowthTrend,
      trends: {
        arpu: calculateTrend(latestStats.arpu, prevStats.arpu),
        cac: cacTrend,
        churn: churnTrendLabel,
        revenue: calculateTrend(latestStats.rev, prevStats.rev)
      },
      currentPeriod: (() => {
        const trxDates = transactions
          .map((t: any) => new Date(t.timestamp || ""))
          .filter((d: any) => !isNaN(d.getTime()))
          .sort((a: any, b: any) => b.getTime() - a.getTime());
        
        const latestDate = trxDates.length > 0 ? trxDates[0] : new Date();
        const monthName = latestDate.toLocaleString("en-US", { month: "short" });
        const quarter = Math.floor(latestDate.getMonth() / 3) + 1;
        return `Q${quarter} ${monthName} ${latestDate.getFullYear()}`;
      })()
    };
  }, [customerList, serviceTiers, expenseList, transactions, trendData, customerGrowthTrend]);

  const kpis = [
    { 
      name: "ARPU", 
      value: dynamicData.arpu, 
      trend: dynamicData.trends.arpu, 
      trendType: (dynamicData.trends.arpu === "0%" || dynamicData.trends.arpu.includes('0.0%')) ? "neutral" : (dynamicData.trends.arpu.startsWith('+') ? "up" : "down") as any, 
      icon: User 
    },
    { 
      name: "CAC", 
      value: dynamicData.cac, 
      trend: dynamicData.trends.cac, 
      trendType: (dynamicData.trends.cac === "-" || dynamicData.trends.cac === "0%" || dynamicData.trends.cac.includes('0.0%')) ? "neutral" : (dynamicData.trends.cac.startsWith('+') ? "down" : "up") as any, // CAC up is bad
      icon: DollarSign 
    },
    { 
      name: "Churn Rate", 
      value: dynamicData.churnRate, 
      trend: dynamicData.trends.churn, 
      trendType: (dynamicData.trends.churn === "0%" || dynamicData.trends.churn.includes('0.0%') || dynamicData.trends.churn === "-") ? "neutral" : (dynamicData.trends.churn.startsWith('+') ? "down" : "up") as any, // Churn up is bad
      icon: UserMinus 
    },
    { 
      name: "Total Revenue", 
      value: dynamicData.totalRevenue, 
      trend: dynamicData.trends.revenue, 
      trendType: (dynamicData.trends.revenue === "0%" || dynamicData.trends.revenue.includes('0.0%')) ? "neutral" : (dynamicData.trends.revenue.startsWith('+') ? "up" : "down") as any, 
      icon: Wallet 
    },
  ];


  if (isLoading) {
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
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRoadmapOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <m.div
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
            </m.div>
          </div>
        )}
      </AnimatePresence>

      <div ref={dashboardRef} className="space-y-8 pb-10">
        <m.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
        >
          {/* Header */}
          <m.div 
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
                  {dynamicData.currentPeriod}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => router.push('/profitability')}
                  className="bg-primary text-white p-3 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  <TrendingUp size={20} />
                </button>
              </div>
            </div>
          </m.div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map((kpi, index) => (
              <StatCard
                key={kpi.name}
                name={kpi.name}
                value={kpi.value}
                icon={kpi.icon}
                trend={kpi.trendType === 'neutral' ? undefined : kpi.trend}
                trendType={kpi.trendType as any}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <m.section
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
                    <LineChart 
                      data={dynamicData.trendData.filter((d: any) => d.growth !== null)} 
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
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
            </m.section>

            <div className="space-y-8">
              {/* Right Column: Customer Mix */}
              <m.section 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.5 }}
                className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm"
              >
            <div className="mb-8">
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Customer Growth</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Segmentation</p>
            </div>
            <div className="h-[220px] w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={(dynamicData.growthTrend as any[]).filter((d: any) => d.growth !== null)} 
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
                      interval={0}
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
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

          </m.section>

              <m.section
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.6 }}
                className="bg-slate-900 rounded-3xl p-8 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/20 transition-colors" />
                <h4 className="text-white font-black text-lg mb-2 relative z-10">Upgrade Infrastructure</h4>
                <p className="text-slate-400 text-sm mb-6 font-medium leading-relaxed relative z-10">Expand nodes in the Bandung area to capture growing demand.</p>
                <m.button
                  onClick={() => setIsRoadmapOpen(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all flex items-center justify-center gap-2 relative z-10 shadow-xl shadow-white/5"
                >
                  Review Roadmap <ArrowUpRight size={18} />
                </m.button>
              </m.section>
            </div>
          </div>
        </m.div>
      </div>
    </div>
  );
}
