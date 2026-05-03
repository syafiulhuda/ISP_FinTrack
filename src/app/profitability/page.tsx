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
import { getCustomers, getServiceTiers, getExpenses, getTransactions, createNotification, getServiceMix } from "@/actions/db";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";

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
    
    const updateMinMax = (val: any) => {
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
    
    transactions.forEach((t: any) => updateMinMax(t.timestamp));
    expenseList.forEach((e: any) => updateMinMax(e.date));
    customerList.forEach((c: any) => updateMinMax(c.createdAt || c.registration_date));
    
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
    ...Array.from(new Set(customerList.map((c: any) => c.province))).sort()
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
    const isAllRegions = selectedProvince === "All Regions";
    
    // 1. Month Series & Time Bounds
    const currentYear = endDate.substring(0, 4) || "2026";
    const currentMonthStr = endDate.substring(0, 7); // e.g., "2026-05"
    const allMonthsInYear = [
      `${currentYear}-01`, `${currentYear}-02`, `${currentYear}-03`, `${currentYear}-04`, 
      `${currentYear}-05`, `${currentYear}-06`, `${currentYear}-07`, `${currentYear}-08`, 
      `${currentYear}-09`, `${currentYear}-10`, `${currentYear}-11`, `${currentYear}-12`
    ];
    
    const ytdMonths = allMonthsInYear.filter(m => m <= currentMonthStr);
    const prevMonthStr = ytdMonths.length > 1 ? ytdMonths[ytdMonths.length - 2] : null;

    // Helper for local date comparison
    const getLocalDate = (d: any) => {
      if (!d) return "";
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return date.toISOString().split('T')[0];
    };

    // Mapping Kota ke Provinsi (Fallback if needed)
    const getProvinceFromCity = (city: string) => {
      if (!city) return null;
      const c = city.toLowerCase();
      if (c.includes("bandung") || c.includes("bogor") || c.includes("depok") || c.includes("bekasi")) return "Jawa Barat";
      if (c.includes("jakarta")) return "DKI Jakarta";
      if (c.includes("surabaya") || c.includes("malang") || c.includes("sidoarjo") || c.includes("gresik")) return "Jawa Timur";
      if (c.includes("yogyakarta") || c.includes("sleman") || c.includes("bantul")) return "DI Yogyakarta";
      return null;
    };

    // 2. Core Aggregator Logic
    const getStatsForMonths = (months: string[]) => {
      let revenue = 0;
      let expenses = 0;
      
      transactions.forEach((tx: any) => {
        const txMonth = getLocalDate(tx.timestamp).substring(0, 7);
        if (!months.includes(txMonth)) return;

        // Region Filter Logic
        if (!isAllRegions) {
          // Priority 1: Check direct city/province in transaction
          const cityProv = getProvinceFromCity(tx.city) || tx.city;
          const matchesDirectly = cityProv && String(cityProv).toLowerCase().includes(selectedProvince.toLowerCase());
          
          if (!matchesDirectly) {
            // Priority 2: Check linked customer if it's an income (pemasukan)
            const idSuffix = tx.id?.split('-')[1];
            if (tx.keterangan === "pemasukan") {
              const customer = customerList.find((c: any) => String(c.id) === idSuffix);
              if (customer?.province !== selectedProvince) return;
            } else {
              // Priority 3: For expenses (pengeluaran), if no direct city match, skip it
              // Unless it's an unlinked expense that should be allocated (handled below)
              return;
            }
          }
        }

        if (tx.status === "Verified") {
          if (tx.keterangan === "pemasukan") revenue += (tx.numericAmount || 0);
          if (tx.keterangan === "pengeluaran") expenses += (tx.numericAmount || 0);
        }
      });

      // 3. Shared Expense Allocation (For expenses not explicitly linked to a region)
      // This ensures global expenses are still accounted for proportionally
      const allocationFactor = isAllRegions ? 1 : (customerList.length > 0 ? (customerList.filter((c: any) => c.province === selectedProvince).length / customerList.length) : 0);
      
      expenseList.forEach((exp: any) => {
        const expMonth = getLocalDate(exp.date).substring(0, 7);
        if (!months.includes(expMonth)) return;
        
        // If this expense has a specific city that ISN'T our selected region, skip it
        if (!isAllRegions && exp.city && !String(exp.city).toLowerCase().includes(selectedProvince.toLowerCase())) return;

        // If it has no city OR matches our region, apply allocation
        const isTxLinked = transactions.some((tx: any) => tx.keterangan === "pengeluaran" && tx.id?.split('-')[1] === String(exp.id));
        
        // If not already counted in transaction loop (to avoid double counting)
        if (!isTxLinked || isAllRegions) {
           // We only allocate if it's not explicitly linked to ANOTHER region
           expenses += (Math.abs(exp.amount || 0) * (isAllRegions ? 1 : allocationFactor));
        }
      });

      const profit = revenue - expenses;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
      return { revenue, expenses, profit, margin };
    };

    // 3. Calculate Final KPIs
    const ytdStats = getStatsForMonths(ytdMonths);
    const currentMonthStats = getStatsForMonths([currentMonthStr]);
    const prevMonthStats = prevMonthStr ? getStatsForMonths([prevMonthStr]) : null;

    const calculateTrend = (current: number, previous: number | null, isMargin = false) => {
      if (previous === null || previous === 0) return { text: "-", type: "neutral" };
      
      if (isMargin) {
        const diff = current - previous;
        return { 
          text: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`, 
          type: diff >= 0 ? "up" : "danger" 
        };
      } else {
        const diff = ((current / Math.abs(previous)) - 1) * 100;
        return { 
          text: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`, 
          type: diff >= 0 ? "up" : "danger" 
        };
      }
    };

    // 4. User Status (Cumulative)
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

    // 5. Chart Data (YTD Focus)
    const growthTrend = ytdMonths.map(mStr => {
      const stats = getStatsForMonths([mStr]);
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
    
    // 1. Process Transactions for Waterfall
    transactions.forEach((tx: any) => {
      const txMonth = getLocalDate(tx.timestamp).substring(0, 7);
      if (!ytdMonths.includes(txMonth)) return;

      if (!isAllRegions) {
        const cityProv = getProvinceFromCity(tx.city) || tx.city;
        const matchesDirectly = cityProv && String(cityProv).toLowerCase().includes(selectedProvince.toLowerCase());
        
        if (!matchesDirectly) {
          const idSuffix = tx.id?.split('-')[1];
          if (tx.keterangan === "pemasukan") {
            const customer = customerList.find((c: any) => String(c.id) === idSuffix);
            if (customer?.province !== selectedProvince) return;
          } else {
            return; // Skip explicit expenses that don't match this region
          }
        }
      }

      if (tx.status === "Verified") {
        if (tx.keterangan === "pemasukan") {
          const type = tx.type || "Revenue";
          incomeByType[type] = (incomeByType[type] || 0) + (tx.numericAmount || 0);
        } else if (tx.keterangan === "pengeluaran") {
          const type = tx.type || "Expense";
          expenseByType[type] = (expenseByType[type] || 0) + (tx.numericAmount || 0);
        }
      }
    });

    // 2. Add Allocated Expenses to Waterfall
    expenseList.forEach((exp: any) => {
      const expMonth = getLocalDate(exp.date).substring(0, 7);
      if (!ytdMonths.includes(expMonth)) return;

      // Skip if explicitly linked to another region
      if (!isAllRegions && exp.city && !String(exp.city).toLowerCase().includes(selectedProvince.toLowerCase())) return;

      const isTxLinked = transactions.some((tx: any) => tx.keterangan === "pengeluaran" && tx.id?.split('-')[1] === String(exp.id));
      
      // If not counted in the transaction loop, add as allocated expense
      if (!isTxLinked || isAllRegions) {
        const type = exp.category || "General Expense";
        const allocatedAmount = Math.abs(exp.amount || 0) * (isAllRegions ? 1 : allocationFactor);
        expenseByType[type] = (expenseByType[type] || 0) + allocatedAmount;
      }
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

    const mrrTrend = calculateTrend(currentMonthStats.revenue, prevMonthStats?.revenue || null);
    const marginTrend = calculateTrend(currentMonthStats.margin, prevMonthStats?.margin || null, true);
    const profitTrend = calculateTrend(currentMonthStats.profit, prevMonthStats?.profit || null);

    return {
      metrics: [
        { name: "MRR (YTD)", value: formatCompactNumber(ytdStats.revenue), trend: mrrTrend.text, trendType: mrrTrend.type, icon: "trending", detail: "Year-To-Date Revenue" },
        { name: "EBITDA MARGIN (YTD)", value: `${ytdStats.margin.toFixed(1)}%`, trend: marginTrend.text, trendType: marginTrend.type, icon: "target", detail: "Year-To-Date Margin" },
        { name: "NET PROFIT (YTD)", value: formatCompactNumber(ytdStats.profit), trend: profitTrend.text, trendType: profitTrend.type, icon: "pie", detail: "Year-To-Date Result" },
        { name: "ACTIVE USERS", value: String(activeAtEnd), trend: "Synced", trendType: "up", icon: "user", detail: "Total Paying Subscribers" },
        { name: "INACTIVE USERS", value: String(inactiveAtEnd), trend: inactiveAtEnd > 0 ? "Attention" : "Healthy", trendType: inactiveAtEnd > 0 ? "danger" : "up", icon: "target", detail: "Total Non-Paying / Idle" },
      ],
      totalActiveUsers: activeCustomers.length,
      waterfallData,
      distribution,
      growthTrend,
      latestProfit: ytdStats.profit
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
            <h2 className="text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Profitability Analysis</h2>
            <p className="text-lg font-medium text-slate-500 mt-2">Segmented performance and unit economics audit.</p>
          </div>
          <div className="flex flex-nowrap items-center gap-4">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {dynamicData.metrics.map((kpi, i) => (
            <m.div key={kpi.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:shadow-primary/5 transition-all group">
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0 flex items-center justify-center">
                  {kpi.icon === "trending" && <TrendingUp size={18} />}
                  {kpi.icon === "target" && <Target size={18} />}
                  {kpi.icon === "user" && <UserCheck size={18} />}
                  {kpi.icon === "pie" && <PieChartIcon size={18} />}
                </div>
                <div className={cn(
                  "text-[8px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0 shadow-sm border", 
                  kpi.trendType === "up" ? "bg-green-100 text-green-700 border-green-200" : 
                  kpi.trendType === "danger" ? "bg-rose-100 text-rose-700 border-rose-200" :
                  "bg-slate-100 text-slate-600 border-slate-200"
                )}>
                  {kpi.trendType === "up" && <ArrowUp size={10} />}
                  {kpi.trendType === "danger" && <ArrowDown size={10} />}
                  {kpi.trend}
                </div>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{kpi.name}</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-2 whitespace-nowrap">{kpi.value}</h3>
              <p className="text-[9px] font-bold text-slate-400 mt-4 uppercase tracking-tighter">{kpi.detail}</p>
            </m.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <m.section initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 pb-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-10"><div><h3 className="text-2xl font-black">Revenue Waterfall</h3><p className="text-sm text-slate-500 mt-1">Gross Margin vs Real Opex.</p></div><BarChart3 className="text-slate-300" size={32} /></div>
            <div className="h-[550px] w-full">
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
            <m.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm">
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

            <m.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] p-10 border border-slate-700/30 shadow-xl relative overflow-hidden">
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
