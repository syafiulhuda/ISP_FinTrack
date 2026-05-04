"use client";

import { m, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  ArrowUp, 
  ArrowDown,
  Target, 
  UserCheck, 
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Filter,
  ChevronDown,
  Minus,
  Search,
  Check,
  X,
  RotateCcw
} from "lucide-react";
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
  LineChart,
  Line,
  Area,
  AreaChart,
  ReferenceLine
} from "recharts";

import { useQuery } from "@tanstack/react-query";
import { getCustomers, getServiceMix } from "@/actions/customers";
import { getServiceTiers } from "@/actions/tiers";
import { getExpenses, getTransactions } from "@/actions/transactions";
import { createNotification } from "@/actions/admin";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { Customer, ServiceTier, Transaction, Expense } from "@/types";
import { StatCard } from "@/components/ui/StatCard";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number; color?: string; dataKey?: string; payload: any }[] }) => {
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

export default function ProfitabilityPage() {
  const [selectedProvince, setSelectedProvince] = useState("All Regions");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [datesInitialized, setDatesInitialized] = useState(false);

  const { data: customerData, isLoading: loadingCustomers } = useQuery({ 
    queryKey: ['customers', 1, 1000], 
    queryFn: () => getCustomers(1, 1000) 
  });
  const customerList = customerData?.customers || [];
  const { data: serviceTiers = [], isLoading: loadingTiers } = useQuery({ queryKey: ['serviceTiers'], queryFn: getServiceTiers });
  const { data: expenseList = [], isLoading: loadingExpenses } = useQuery({ queryKey: ['expenses'], queryFn: getExpenses });
  const { data: transactions = [], isLoading: loadingTx } = useQuery({ 
    queryKey: ['transactions'], 
    queryFn: getTransactions,
    refetchInterval: 60000 
  });

  const handleResetDates = useCallback(() => {
    if (!transactions.length && !expenseList.length && !customerList.length) return;
    
    // Find min and max dates from all data
    let minDateStr = "9999-12-31";
    let maxDateStr = "0000-01-01";
    
    const updateMinMax = (val: string | Date | null | undefined) => {
      if (!val) return;
      let d = "";
      if (typeof val === "string") {
        d = val.substring(0, 10);
      } else if (val instanceof Date) {
        d = val.toISOString().substring(0, 10);
      } else {
        d = String(val).substring(0, 10);
      }
      
      if (!d || d.length < 10) return;
      if (d < minDateStr) minDateStr = d;
      if (d > maxDateStr) maxDateStr = d;
    };
    
    transactions.forEach((t: Transaction) => updateMinMax(t.timestamp));
    expenseList.forEach((e: Expense) => updateMinMax(e.date));
    customerList.forEach((c: Customer) => updateMinMax(c.createdAt));
    
    if (minDateStr === "9999-12-31") {
      minDateStr = "2026-01-01";
      maxDateStr = "2026-12-31";
    }
    
    const minYear = parseInt(minDateStr.substring(0, 4));
    const maxYear = parseInt(maxDateStr.substring(0, 4));
    
    // If data spans decades/multiple years (difference > 1), default to maxYear's start and end
    if (maxYear - minYear >= 1) {
      setStartDate(`${maxYear}-01-01`);
      // Use the maxDateStr or the end of the maxYear
      setEndDate(maxDateStr);
    } else {
      setStartDate(minDateStr);
      setEndDate(maxDateStr);
    }
  }, [transactions, expenseList, customerList]);

  // Initialize dates once data is loaded
  useEffect(() => {
    if (!datesInitialized && (transactions.length > 0 || expenseList.length > 0 || customerList.length > 0)) {
      handleResetDates();
      setDatesInitialized(true);
    }
  }, [transactions, expenseList, customerList, datesInitialized, handleResetDates]);

  const provinces = useMemo(() => [
    "All Regions",
    ...Array.from(new Set(customerList.map((c: Customer) => c.province).filter(Boolean) as string[])).sort()
  ], [customerList]);

  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setIsDropdownOpen(false);
      setSearchQuery("");
    }
  }, []);

  useEffect(() => {
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen, handleClickOutside]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatCompactNumber = (number: number) => {
    const absNum = Math.abs(number);
    const sign = number < 0 ? "-" : "";
    
    if (absNum >= 1000000000) return `${sign}Rp ${(absNum / 1000000000).toFixed(2)}B`;
    if (absNum >= 1000000) return `${sign}Rp ${(absNum / 1000000).toFixed(2)}M`;
    if (absNum >= 1000) return `${sign}Rp ${(absNum / 1000).toFixed(1)}k`;
    return `${sign}Rp ${absNum.toFixed(0)}`;
  };

  const dynamicData = useMemo(() => {
    if (!startDate || !endDate) {
      return {
        metrics: [],
        totalActiveUsers: 0,
        waterfallData: [],
        distribution: [],
        growthTrend: [],
        latestProfit: 0
      };
    }
    const isAllRegions = selectedProvince === "All Regions";
    
    // 1. Calculate Selected Range & Months
    const startMonthStr = startDate.substring(0, 7);
    const endMonthStr = endDate.substring(0, 7);
    
    const selectedMonths: string[] = [];
    if (startDate && endDate) {
      let current = new Date(startDate.substring(0, 7) + "-01");
      const end = new Date(endDate.substring(0, 7) + "-01");
      let safety = 0;
      while (current <= end && safety < 48) { // max 4 years
        selectedMonths.push(current.toISOString().substring(0, 7));
        current.setMonth(current.getMonth() + 1);
        safety++;
      }
    }

    const currentMonthStr = endMonthStr;
    const prevMonthDate = new Date(endDate);
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonthStr = prevMonthDate.toISOString().substring(0, 7);

    // Helper for local date comparison
    const getLocalDate = (d?: string | Date | null) => {
      if (!d) return "";
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d).split('T')[0];
      
      // Force UTC+7 evaluation using pure math (Identical to AT TIME ZONE 'Asia/Jakarta')
      const localTime = date.getTime() + (7 * 60 * 60 * 1000);
      const localDate = new Date(localTime);
      const year = localDate.getUTCFullYear();
      const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(localDate.getUTCDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    };

    // Mapping Kota ke Provinsi (Fallback if needed)
    const getProvinceFromCity = (city?: string | null) => {
      if (!city) return null;
      const c = city.toLowerCase();
      if (c.includes("bandung") || c.includes("bogor") || c.includes("depok") || c.includes("bekasi") || c.includes("cimahi") || c.includes("tasikmalaya")) return "Jawa Barat";
      if (c.includes("jakarta")) return "DKI Jakarta";
      if (c.includes("surabaya") || c.includes("malang") || c.includes("sidoarjo") || c.includes("gresik") || c.includes("mojokerto") || c.includes("pasuruan")) return "Jawa Timur";
      if (c.includes("yogyakarta") || c.includes("sleman") || c.includes("bantul")) return "DI Yogyakarta";
      if (c.includes("semarang") || c.includes("solo") || c.includes("magelang")) return "Jawa Tengah";
      return null;
    };

    // 2. Core Aggregator Logic
    const getStatsForRange = (start: string, end: string) => {
      let revenue = 0;
      let expenses = 0;
      
      transactions.forEach((tx: Transaction) => {
        const txDate = getLocalDate(tx.timestamp);
        if (txDate < start || txDate > end) return;

        // Region Filter Logic
        if (!isAllRegions) {
          const cityProv = getProvinceFromCity(tx.city) || tx.city;
          const matchesDirectly = cityProv && String(cityProv).toLowerCase().includes(selectedProvince.toLowerCase());
          
          if (!matchesDirectly) {
            const idSuffix = tx.id?.split('-')[1];
            if (tx.keterangan === "pemasukan") {
              const customer = customerList.find((c: Customer) => String(c.id) === idSuffix);
              if (customer?.province !== selectedProvince) return;
            } else {
              return;
            }
          }
        }

        if (tx.status === "Verified") {
          if (tx.keterangan === "pemasukan") revenue += (tx.numericAmount || 0);
          if (tx.keterangan === "pengeluaran") expenses += (tx.numericAmount || 0);
        }
      });

      const profit = revenue - expenses;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { revenue, expenses, profit, margin };
    };

    // Helper for specific month stats (used in trends/charts)
    const getStatsForMonth = (mStr: string) => {
      const year = parseInt(mStr.split('-')[0]);
      const month = parseInt(mStr.split('-')[1]);
      const lastDay = new Date(year, month, 0).getDate();
      const monthStart = `${mStr}-01`;
      const monthEnd = `${mStr}-${String(lastDay).padStart(2, '0')}`;
      return getStatsForRange(monthStart, monthEnd);
    };

    // 3. Calculate Final KPIs
    const rangeStats = getStatsForRange(startDate, endDate);
    
    // Calculate MoM (Month-over-Month) trend based on the end date's month
    let endMStr = endDate.substring(0, 7);
    let endYear = parseInt(endMStr.split('-')[0]);
    let endMonth = parseInt(endMStr.split('-')[1]);
    let prevMonthD = new Date(endYear, endMonth - 2, 1);
    let prevMStr = prevMonthD.getFullYear() + "-" + String(prevMonthD.getMonth() + 1).padStart(2, '0');

    const currentMonthStats = getStatsForMonth(endMStr);
    const prevMonthStats = getStatsForMonth(prevMStr);

    const calculateTrend = (current: number, previous: number | null, isMargin = false) => {
      if (previous === null || previous === 0) {
         if (isMargin && current !== 0) {
             return { text: `+${current.toFixed(1)}%`, type: current > 0 ? "up" : "danger" };
         }
         return { text: "0%", type: "neutral" };
      }
      
      // Match SQL Exact Formulas:
      // Margin: curr_margin - prev_margin
      // Profit: ((curr_profit - prev_profit) / ABS(prev_profit)) * 100
      const diff = isMargin 
        ? (current - previous) 
        : (((current - previous) / Math.abs(previous)) * 100);
      
      if (Math.abs(diff) < 0.01) return { text: "0.0%", type: "neutral" };
      
      return { 
        text: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`, 
        type: diff > 0 ? "up" : "danger" 
      };
    };

    // 4. User Status (Cumulative at end of range)
    const activeAtEnd = customerList.filter((c: any) => {
      const joinDate = getLocalDate(c.createdAt || c.registration_date);
      if (joinDate > endDate) return false;
      if (!isAllRegions && c.province !== selectedProvince) return false;
      return c.status === "Active";
    }).length;

    const inactiveAtEnd = customerList.filter((c: any) => {
      const joinDate = getLocalDate(c.createdAt || c.registration_date);
      if (joinDate > endDate) return false;
      if (!isAllRegions && c.province !== selectedProvince) return false;
      return c.status === "Inactive" || c.status === "Non-Active";
    }).length;

    // 5. Chart Data (Range Focused)
    const growthTrend = selectedMonths.map(mStr => {
      const stats = getStatsForMonth(mStr);
      const [year, month] = mStr.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return {
        month: `${monthNames[parseInt(month)-1]}`,
        value: stats.profit
      };
    });

    const incomeByType: Record<string, number> = {};
    const expenseByType: Record<string, number> = {};
    const allocationFactor = isAllRegions ? 1 : (customerList.length > 0 ? (customerList.filter((c: any) => c.province === selectedProvince).length / customerList.length) : 0);
    
    // For Income (Revenue Component) - purely from transactions
    transactions.forEach((tx: any) => {
      const txDate = getLocalDate(tx.timestamp);
      if (txDate < startDate || txDate > endDate) return;

      if (!isAllRegions) {
        const cityProv = getProvinceFromCity(tx.city) || tx.city;
        const matchesDirectly = cityProv && String(cityProv).toLowerCase().includes(selectedProvince.toLowerCase());
        if (!matchesDirectly) {
          const idSuffix = tx.id?.split('-')[1];
          if (tx.keterangan === "pemasukan") {
            const customer = customerList.find((c: any) => String(c.id) === idSuffix);
            if (customer?.province !== selectedProvince) return;
          } else return;
        }
      }

      if (tx.status === "Verified" && tx.keterangan === "pemasukan") {
        // SQL Waterfall strictly uses 'Revenue' as the category for all income
        const type = "Revenue";
        incomeByType[type] = (incomeByType[type] || 0) + (tx.numericAmount || 0);
      }
    });

    // For Expenses (Waterfall Components) - purely from expenseList (like SQL)
    expenseList.forEach((exp: any) => {
      const expDate = getLocalDate(exp.date);
      if (expDate < startDate || expDate > endDate) return;

      const expProv = getProvinceFromCity(exp.city) || exp.city;
      if (!isAllRegions && expProv && !String(expProv).toLowerCase().includes(selectedProvince.toLowerCase())) return;

      const type = exp.category || "General Expense";
      const allocatedAmount = Math.abs(exp.amount || 0) * (isAllRegions ? 1 : allocationFactor);
      expenseByType[type] = (expenseByType[type] || 0) + allocatedAmount;
    });

    const waterfallData = [
      ...Object.entries(incomeByType).map(([name, value]) => ({ name, value: Number(value), isExpense: false })),
      ...Object.entries(expenseByType).map(([name, value]) => ({ name, value: -Number(value), isExpense: true }))
    ].filter(d => d.value !== 0);

    const activeCustomers = customerList.filter((c: any) => {
      const joinDate = getLocalDate(c.createdAt || c.registration_date);
      return joinDate <= endDate && c.status === "Active" && (isAllRegions || c.province === selectedProvince);
    });

    const distribution = ["Premium", "Standard", "Basic", "Gamers"].map(name => {
      const count = activeCustomers.filter(c => (c.service === 'Gamers Node' ? 'Gamers' : c.service) === name).length;
      const colors: Record<string, string> = { 'Premium': '#004ac6', 'Standard': '#64748b', 'Basic': '#bc4800', 'Gamers': '#16a34a' };
      return { 
        name, 
        count, 
        value: activeCustomers.length > 0 ? Math.round((count / activeCustomers.length) * 100) : 0,
        color: colors[name] || '#94a3b8'
      };
    });

    const mrrTrend = calculateTrend(currentMonthStats.revenue, prevMonthStats.revenue);
    const marginTrend = calculateTrend(currentMonthStats.margin, prevMonthStats.margin, true);
    const profitTrend = calculateTrend(currentMonthStats.profit, prevMonthStats.profit);

    return {
      metrics: [
        { name: "REVENUE (RANGE)", value: formatCompactNumber(rangeStats.revenue), trend: mrrTrend.text, trendType: mrrTrend.type, icon: TrendingUp, detail: "Total revenue in selected range" },
        { name: "EBITDA MARGIN", value: `${rangeStats.margin.toFixed(1)}%`, trend: marginTrend.text, trendType: marginTrend.type, icon: Target, detail: "Average margin in range" },
        { name: "NET PROFIT", value: formatCompactNumber(rangeStats.profit), trend: profitTrend.text, trendType: profitTrend.type, icon: PieChartIcon, detail: "Net profit in range" },
        { name: "ACTIVE USERS", value: String(activeAtEnd), trend: "Synced", trendType: "up" as any, icon: UserCheck, detail: "Total Paying Subscribers" },
        { name: "INACTIVE USERS", value: String(inactiveAtEnd), trend: inactiveAtEnd > 0 ? "Attention" : "Healthy", trendType: (inactiveAtEnd > 0 ? "danger" : "up") as any, icon: Target, detail: "Total Non-Paying / Idle" },
      ],
      totalActiveUsers: activeCustomers.length,
      waterfallData,
      distribution,
      growthTrend,
      latestProfit: rangeStats.profit
    };
  }, [selectedProvince, startDate, endDate, customerList, transactions, expenseList]);

  const filteredProvinces = useMemo(() => 
    provinces.filter((p: any) => p.toLowerCase().includes(searchQuery.toLowerCase())), 
    [searchQuery, provinces]
  );


  if (loadingCustomers || loadingTiers || loadingExpenses || loadingTx) {
    return <div className="h-full w-full flex items-center justify-center animate-pulse text-slate-500 font-medium">Loading Profitability Data...</div>;
  }

  if (!mounted) return null;

  return (
    <div className="relative">
      <AnimatePresence>
      </AnimatePresence>

      <div ref={pageRef} className="space-y-10 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Profitability Analysis</h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Segmented performance and unit economics audit.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-xs font-bold outline-none text-slate-600 px-2"
              />
              <span className="text-slate-300">|</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-xs font-bold outline-none text-slate-600 px-2"
              />
              <button 
                onClick={handleResetDates}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors"
                title="Reset Date Range"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            <div className="relative" ref={dropdownRef}>
              <m.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 px-6 py-3.5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-sm font-bold min-w-[200px]">
                <Filter size={18} className="text-primary" />
                <span className="flex-1 text-left">{selectedProvince}</span>
                <ChevronDown size={16} className={cn("transition-transform", isDropdownOpen && "rotate-180")} />
              </m.button>
              <AnimatePresence>
                {isDropdownOpen && (
                  <m.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} className="absolute right-0 top-full mt-2 w-[320px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800"><div className="relative flex items-center"><Search className="absolute left-3 text-slate-400" size={16} /><input autoFocus className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="Search regions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div></div>
                    <div className="max-h-[300px] overflow-y-auto p-2">{filteredProvinces.map((p) => (<button key={p} onClick={() => { setSelectedProvince(p); setIsDropdownOpen(false); }} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold mb-1", p === selectedProvince ? "bg-primary text-white shadow-md" : "hover:bg-slate-100 dark:hover:bg-slate-800")}>{p}{p === selectedProvince && <Check size={16} />}</button>))}</div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {dynamicData.metrics.map((kpi, i) => (
            <StatCard
              key={kpi.name}
              name={kpi.name}
              value={kpi.value}
              icon={kpi.icon}
              trend={kpi.trend}
              trendType={kpi.trendType as any}
              description={kpi.detail}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <m.section initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 pb-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-8"><div><h3 className="text-xl font-black">Revenue Waterfall</h3><p className="text-xs text-slate-500 mt-1">Gross Margin vs Real Opex.</p></div><BarChart3 className="text-slate-300" size={28} /></div>
            <div className="h-[400px] md:h-[500px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicData.waterfallData} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} 
                    dy={10} 
                    interval={0}
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }} 
                    content={({ active, payload }) => active && payload && payload.length && (
                      <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl border border-white/10 backdrop-blur-md">
                        <p className="opacity-60 mb-1 uppercase tracking-tighter">{payload[0].payload.name}</p>
                        <p className="text-sm font-black">Rp {Math.abs(Number(payload[0].value)).toLocaleString()}</p>
                      </div>
                    )} 
                  />
                  <Bar dataKey="value" barSize={32} radius={[20, 20, 20, 20]}>
                    {dynamicData.waterfallData.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isExpense ? "#f43f5e" : "#10b981"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </m.section>

          <div className="space-y-8">
            <m.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-black mb-8">Service Plan Mix</h3>
              <div className="flex items-center gap-10">
                <div className="h-[220px] w-1/2 relative group">
                  {/* Center Text Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                    <span className="text-4xl font-black text-slate-900 dark:text-white leading-none">
                      {dynamicData.totalActiveUsers}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Users
                    </span>
                  </div>
                  
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={dynamicData.distribution} 
                        innerRadius={70} 
                        outerRadius={90} 
                        paddingAngle={15} 
                        dataKey="value"
                        startAngle={180}
                        endAngle={-180}
                        stroke="none"
                        cornerRadius={10}
                      >
                        {dynamicData.distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={(entry as any).color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any, name: any, props: any) => [`${props.payload.count} Users`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-6 w-1/2">
                  {dynamicData.distribution.map((item) => {
                    const total = dynamicData.distribution.reduce((sum, d) => sum + d.value, 0);
                    const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={item.name} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: (item as any).color }} />
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">{item.name}</span>
                        </div>
                        <span className="text-xl font-black text-slate-900 dark:text-slate-100">{percentage}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </m.section>

            <m.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-700/30 shadow-xl relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6"><div><h3 className="text-xl font-black text-white mb-1">Profitability Trend</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Net Profit Month-over-Month</p></div><div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /><span className="text-[10px] font-black text-green-400 uppercase tracking-wider">Live</span></div></div>
                <div className="mb-6">
                  <span className="text-4xl font-black text-white tracking-tight">
                    {formatCompactNumber(dynamicData.latestProfit)}
                  </span>
                  <span className={cn("text-sm font-bold ml-3", dynamicData.latestProfit >= 0 ? "text-green-400" : "text-rose-400")}>
                    {dynamicData.latestProfit >= 0 ? "↑ trending" : "↓ deficit"}
                  </span>
                </div>
                <div className="h-[160px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dynamicData.growthTrend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <defs><linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#004ac6" stopOpacity={0.4} /><stop offset="100%" stopColor="#004ac6" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                        interval={0} 
                        padding={{ left: 20, right: 20 }}
                      />
                      <YAxis hide />
                      <Tooltip content={({ active, payload }) => active && payload && payload.length && (
                        <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 shadow-xl">
                          <p className="text-xs font-black text-white">Rp {Number(payload[0].value).toLocaleString()}</p>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">{payload[0].payload.month}</p>
                        </div>
                      )} />
                      <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fill="url(#growthGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </m.section>
          </div>
        </div>
      </div>
    </div>
  );
}
