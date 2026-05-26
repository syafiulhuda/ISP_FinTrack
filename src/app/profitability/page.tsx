"use client";

import { m, AnimatePresence } from "framer-motion";
import {
  MapPin,
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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Line, Area, AreaChart, ReferenceLine
} from "recharts";
import { WaterfallChart, ServiceMixChart, ProfitabilityTrendChart } from "@/components/charts/ProfitabilityCharts";
import { ChartContainer } from "@/components/charts/ChartContainer";

import { useQuery } from "@tanstack/react-query";
import { getProfitabilityData } from "@/actions/profitability";
import { getTransactionDateRange } from "@/actions/transactions";
import { createNotification } from "@/actions/admin";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { Customer, ServiceTier, Transaction, Expense } from "@/types";
import { StatCard } from "@/components/ui/StatCard";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
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

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export default function ProfitabilityPage() {
  const [selectedProvince, setSelectedProvince] = useState("All Regions");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [datesInitialized, setDatesInitialized] = useState(false);

  const { data: pageData, isLoading: isPageLoading } = useQuery({
    queryKey: ['profitabilityData'],
    queryFn: getProfitabilityData,
    refetchInterval: 60000,
  });

  const customerList = pageData?.customers || [];
  const serviceTiers = pageData?.serviceTiers || [];
  const expenseList = pageData?.expenses || [];
  const transactions = pageData?.transactions || [];
  const dateRange = pageData?.dateRange;

  const loadingCustomers = isPageLoading;
  const loadingTiers = isPageLoading;
  const loadingExpenses = isPageLoading;
  const loadingTx = isPageLoading;

  const handleResetDates = useCallback(() => {
    if (dateRange) {
      setStartDate(dateRange.startDate);
      setEndDate(dateRange.endDate);
      return;
    }

    if (!transactions.length && !expenseList.length && !customerList.length) return;

    // Find min and max dates from all data (Fallback)
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
      const year = new Date().getFullYear();
      minDateStr = `${year}-01-01`;
      maxDateStr = `${year}-12-31`;
    }

    setStartDate(minDateStr);
    setEndDate(maxDateStr);
  }, [transactions, expenseList, customerList, dateRange]);

  // Initialize dates once data is loaded
  useEffect(() => {
    if (!datesInitialized && (dateRange || transactions.length > 0 || expenseList.length > 0 || customerList.length > 0)) {
      handleResetDates();
      if (dateRange || (transactions.length > 0 && expenseList.length > 0 && customerList.length > 0)) {
        setDatesInitialized(true);
      }
    }
  }, [transactions, expenseList, customerList, dateRange, datesInitialized, handleResetDates]);

  const provinces = useMemo(() => {
    const rawProvs = customerList.map((c: Customer) => c.province).filter(Boolean) as string[];
    const normalized = new Map<string, string>();

    rawProvs.forEach(p => {
      const trimmed = p.trim();
      const key = trimmed.toLowerCase();
      if (!normalized.has(key) || (trimmed !== key && normalized.get(key) === key)) {
        // Prefer Title Case or whatever isn't all lowercase
        const formatted = trimmed.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        normalized.set(key, formatted);
      }
    });

    return ["All Regions", ...Array.from(normalized.values()).sort()];
  }, [customerList]);

  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeStat, setActiveStat] = useState(0);
  const profitabilityRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
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
    const normalize = (val: string | null | undefined) => val ? String(val).toLowerCase().trim() : "";
    const selectedProvLower = normalize(selectedProvince);

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
          const matchesDirectly = cityProv && normalize(String(cityProv)).includes(selectedProvLower);

          if (!matchesDirectly) {
            const idSuffix = tx.id?.split('-')[1];
            if (tx.keterangan === "pemasukan") {
              const customer = customerList.find((c: Customer) => String(c.id) === idSuffix);
              if (normalize(customer?.province || "") !== selectedProvLower) return;
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
    const activeAtEnd = customerList.filter((c: Customer) => {
      const joinDate = getLocalDate(c.createdAt || (c as any).registration_date);
      if (joinDate > endDate) return false;
      if (!isAllRegions && c.province !== selectedProvince) return false;
      return c.status === "Active";
    }).length;

    const inactiveAtEnd = customerList.filter((c: Customer) => {
      const joinDate = getLocalDate(c.createdAt || (c as any).registration_date);
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
        month: `${monthNames[parseInt(month) - 1]}`,
        value: stats.profit
      };
    });

    const incomeByType: Record<string, number> = {};
    const expenseByType: Record<string, number> = {};
    const allocationFactor = isAllRegions ? 1 : (customerList.length > 0 ? (customerList.filter((c: Customer) => normalize(c.province || "") === selectedProvLower).length / customerList.length) : 0);

    // For Income (Revenue Component) - purely from transactions
    transactions.forEach((tx: Transaction) => {
      const txDate = getLocalDate(tx.timestamp);
      if (txDate < startDate || txDate > endDate) return;

      if (!isAllRegions) {
        const cityProv = getProvinceFromCity(tx.city) || tx.city;
        const matchesDirectly = cityProv && normalize(String(cityProv)).includes(selectedProvLower);
        if (!matchesDirectly) {
          const idSuffix = tx.id?.split('-')[1];
          if (tx.keterangan === "pemasukan") {
            const customer = customerList.find((c: Customer) => String(c.id) === idSuffix);
            if (normalize(customer?.province || "") !== selectedProvLower) return;
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
    expenseList.forEach((exp: Expense) => {
      const expDate = getLocalDate(exp.date);
      if (expDate < startDate || expDate > endDate) return;

      const expProv = getProvinceFromCity(exp.city) || exp.city;
      if (!isAllRegions && expProv && !normalize(String(expProv)).includes(selectedProvLower)) return;

      const type = exp.category || "General Expense";
      const allocatedAmount = Math.abs(Number(exp.amount) || 0) * (isAllRegions ? 1 : allocationFactor);
      expenseByType[type] = (expenseByType[type] || 0) + allocatedAmount;
    });

    const waterfallData = [
      ...Object.entries(incomeByType).map(([name, value]) => ({ name, value: Number(value), isExpense: false })),
      ...Object.entries(expenseByType).map(([name, value]) => ({ name, value: -Number(value), isExpense: true }))
    ].filter(d => d.value !== 0);

    const activeCustomers = customerList.filter((c: Customer) => {
      const joinDate = getLocalDate(c.createdAt || (c as any).registration_date);
      return joinDate <= endDate && c.status === "Active" && (isAllRegions || normalize(c.province || "") === selectedProvLower);
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
    provinces.filter((p: string) => p.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery, provinces]
  );


  const isDataLoading = loadingCustomers || loadingTiers || loadingExpenses || loadingTx || !mounted;

  return (
    <div className="relative">
      <AnimatePresence>
      </AnimatePresence>

      <div ref={pageRef} className="pt-4 space-y-10 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Profitability Analysis</h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1">Segmented performance and unit economics audit.</p>
          </div>
          <div className="flex flex-col lg-phone:flex-row items-stretch lg-phone:items-center justify-between gap-2 w-full tablet:w-auto">
            <div className="relative flex items-center justify-between bg-slate-100 dark:bg-slate-900 px-3 tablet:px-4 py-2.5 tablet:py-2 rounded-[1rem] border border-slate-200 dark:border-slate-800 w-full lg-phone:w-[220px] tablet:w-[255px] h-[42px] tablet:h-[38px] shrink-0 shadow-sm">
              {/* Visual Representation (Flawless, left-aligned to align with Region text kawan!) */}
              <div className="flex items-center gap-1.5 tablet:gap-2 overflow-hidden w-full pointer-events-none pr-8">
                <Calendar className="w-3.5 h-3.5 tablet:w-4 tablet:h-4 text-indigo-500 shrink-0" />
                {!startDate || !endDate ? (
                  <div className="h-3.5 w-[180px] lg-phone:w-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-md" />
                ) : (
                  <div className="flex items-center gap-1 tablet:gap-1.5 text-[10px] lg-phone:text-xs tablet:text-sm font-bold text-slate-700 dark:text-slate-300">
                    <span>{formatDisplayDate(startDate)}</span>
                    <span className="text-slate-400 font-bold shrink-0">-</span>
                    <span>{formatDisplayDate(endDate)}</span>
                  </div>
                )}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none absolute right-3 tablet:right-4" />

              {/* Under the hood: Invisible full-pill tap targets */}
              <div className="absolute inset-0 flex">
                {/* Left half: Tap to open Start Date picker */}
                <div className="relative w-1/2 h-full overflow-hidden">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20"
                    aria-label="Report start date"
                  />
                </div>
                {/* Right half: Tap to open End Date picker */}
                <div className="relative w-1/2 h-full overflow-hidden">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20"
                    aria-label="Report end date"
                  />
                </div>
              </div>
            </div>

            <div className="relative w-full lg-phone:w-auto shrink-0" ref={dropdownRef}>
              <button
                onClick={() => !isDataLoading && setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between gap-1 tablet:gap-3 bg-slate-100 dark:bg-slate-900 px-3 tablet:px-4 py-2.5 tablet:py-2 rounded-[1rem] border border-slate-200 dark:border-slate-800 w-full lg-phone:min-w-[125px] lg-phone:max-w-[150px] tablet:min-w-[160px] tablet:max-w-none h-[42px] tablet:h-[38px] hover:border-indigo-500/50 transition-all active:scale-95 shrink-0"
              >
                <div className="flex items-center gap-1.5 tablet:gap-2 overflow-hidden w-full">
                  <MapPin className="w-3.5 h-3.5 tablet:w-4 tablet:h-4 text-indigo-500 shrink-0" />
                  {isDataLoading ? (
                    <div className="h-3.5 w-full bg-slate-200 dark:bg-slate-800 animate-pulse rounded-md" />
                  ) : (
                    <span className="text-[10px] lg-phone:text-xs tablet:text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{selectedProvince}</span>
                  )}
                </div>
                {!isDataLoading && (
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <m.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
                  >
                    <div className="p-1">
                      {provinces.map((p: string) => (
                        <button
                          key={p}
                          onClick={() => {
                            setSelectedProvince(p);
                            setIsDropdownOpen(false);
                            setSearchQuery("");
                          }}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between group ${selectedProvince === p
                              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            }`}
                        >
                          {p}
                          {selectedProvince === p && <m.div layoutId="activeCheck" className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </button>
                      ))}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mobile & Tablet 3D Cover Flow Carousel */}
        <div 
          className="block lg:hidden h-[180px] sm:h-[240px] w-full relative overflow-hidden !-mt-2 sm:!-mt-4 !mb-6 touch-pan-y"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX.current - touchEndX;
            const N = dynamicData.metrics.length;
            if (diff > 40) {
              setActiveStat((prev) => (prev + 1) % N);
            } else if (diff < -40) {
              setActiveStat((prev) => (prev - 1 + N) % N);
            }
            touchStartX.current = null;
          }}
        >
          {isDataLoading ? (
            <div className="absolute inset-0 m-auto w-[230px] sm:w-[420px] h-[130px] sm:h-[180px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[1.5rem] shadow-xl" />
          ) : (
            dynamicData.metrics.map((kpi, i) => {
              const N = dynamicData.metrics.length;
              const offset = (i - activeStat + N) % N;
              
              const isCenter = offset === 0;
              const isRight = offset === 1;
              const isLeft = offset === N - 1;
              const isVisible = isCenter || isRight || isLeft;

              const x = isCenter ? "0%" : isRight ? "75%" : isLeft ? "-75%" : "0%";
              const scale = isCenter ? 1 : 0.8;
              const zIndex = isCenter ? 30 : (isVisible ? 20 : 10);
              const opacity = isCenter ? 1 : (isVisible ? 0.4 : 0);

              const isBad = kpi.trendType === "danger";
              const isGood = kpi.trendType === "up";

              return (
                <m.div
                  key={kpi.name}
                  onClick={() => isVisible && setActiveStat(i)}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(e, { offset }) => {
                    if (offset.x < -40) {
                      setActiveStat((prev) => (prev + 1) % N);
                    } else if (offset.x > 40) {
                      setActiveStat((prev) => (prev - 1 + N) % N);
                    }
                  }}
                  animate={{ x, scale, zIndex, opacity }}
                  transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                  className={cn(
                    "absolute inset-0 m-auto w-[230px] sm:w-[420px] h-[130px] sm:h-[180px] rounded-[1.5rem] sm:rounded-[2rem] cursor-pointer p-5 sm:p-8 flex flex-col justify-between transition-colors duration-300",
                    "bg-[#0f172a] border",
                    isCenter 
                      ? (isBad ? "border-orange-500 shadow-[0_0_25px_3px_rgba(249,115,22,0.3)] dark:shadow-[0_0_35px_5px_rgba(249,115,22,0.4)]" : "border-cyan-400 shadow-[0_0_25px_3px_rgba(34,211,238,0.3)] dark:shadow-[0_0_35px_5px_rgba(34,211,238,0.4)]")
                      : "border-slate-800 shadow-none",
                    !isVisible && "pointer-events-none"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={cn(
                        "w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors duration-300",
                        isCenter ? (isBad ? "bg-orange-500/20 text-orange-400" : "bg-cyan-500/20 text-cyan-400") : "bg-white/5 text-slate-500"
                      )}>
                        <kpi.icon className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <span className={cn(
                        "text-[10px] sm:text-sm font-black tracking-widest transition-colors duration-300 uppercase",
                        isCenter ? (isBad ? "text-orange-400" : "text-cyan-400") : "text-slate-500"
                      )}>
                        {kpi.name}
                      </span>
                    </div>
                    {isBad && isCenter && (
                      <m.div
                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]"
                      />
                    )}
                  </div>
                  
                  <div>
                    <div className={cn(
                      "text-3xl sm:text-5xl font-black tracking-tight transition-colors duration-300",
                      isCenter ? "text-white" : "text-slate-500"
                    )}>
                      {kpi.value}
                    </div>
                    <div className="mt-1 sm:mt-2">
                      {kpi.trendType !== "neutral" && (
                        <span className={cn(
                          "text-[8px] sm:text-[10px] font-black px-2 sm:px-3 py-1 rounded-full uppercase tracking-wider transition-colors",
                          isCenter 
                            ? (isGood ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")
                            : "bg-transparent text-slate-600"
                        )}>
                          {kpi.trend}
                        </span>
                      )}
                    </div>
                  </div>
                </m.div>
              );
            })
          )}
        </div>

        {/* Desktop Grid */}
        <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {isDataLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[165px] lg-phone:h-[170px] tablet:h-[160px] lg:h-[200px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl border border-slate-200 dark:border-slate-800" />
            ))
          ) : (
            dynamicData.metrics.map((kpi, i) => (
              <StatCard
                key={kpi.name}
                name={kpi.name}
                value={kpi.value}
                icon={kpi.icon}
                trend={kpi.trend}
                trendType={kpi.trendType as any}
                iconClassName="bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                description={kpi.detail}
                className="h-[165px] lg-phone:h-[170px] tablet:h-[160px] lg:h-[200px]"
              />
            ))
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <m.section initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 pb-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-8"><div><h3 className="text-xl font-black">Revenue Waterfall</h3><p className="text-xs text-slate-500 mt-1">Gross Margin vs Real Opex.</p></div><BarChart3 className="text-slate-300" size={28} /></div>
            <ChartContainer className="h-[400px] md:h-[500px] w-full">
              {isDataLoading ? (
                <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
              ) : (
                <WaterfallChart data={dynamicData.waterfallData} />
              )}
            </ChartContainer>
          </m.section>

          <div className="space-y-8">
            <m.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-black mb-8 text-slate-900 dark:text-white">Service Plan Mix</h3>
              <div className="flex flex-col sm:flex-row items-center gap-10">
                <ChartContainer className="h-[220px] w-full sm:w-1/2 relative group shrink-0">
                  {isDataLoading ? (
                    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[100%]" />
                  ) : (
                    <ServiceMixChart data={dynamicData.distribution as any} totalActiveUsers={dynamicData.totalActiveUsers} />
                  )}
                </ChartContainer>
                <div className="space-y-6 w-full sm:w-1/2">
                  {isDataLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-6 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                    ))
                  ) : (
                    dynamicData.distribution.map((item) => {
                      const total = dynamicData.distribution.reduce((sum, d) => sum + d.value, 0);
                      const percentage = total > 0 ? Math.round((item.value / total) * 100) : 0;
                      return (
                        <div key={item.name} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: (item as any).color }} />
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">{item.name}</span>
                          </div>
                          <span className="text-xl font-black text-slate-900 dark:text-slate-100">{percentage}%</span>
                        </div>
                      );
                    })
                  )}
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
                <ChartContainer className="h-[160px] w-full">
                  {isDataLoading ? (
                    <div className="w-full h-full bg-slate-800/50 animate-pulse rounded-2xl" />
                  ) : (
                    <ProfitabilityTrendChart data={dynamicData.growthTrend} />
                  )}
                </ChartContainer>
              </div>
            </m.section>
          </div>
        </div>
      </div>
    </div>
  );
}
