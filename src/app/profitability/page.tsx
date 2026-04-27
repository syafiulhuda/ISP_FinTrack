"use client";

import { motion, AnimatePresence } from "framer-motion";
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
  Download,
  ChevronDown,
  Minus,
  Search,
  Check,
  X,
  RotateCcw
} from "lucide-react";
import jsPDF from "jspdf";
import { domToPng } from "modern-screenshot";
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
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [searchQuery, setSearchQuery] = useState("");

  const handleResetDates = () => {
    setStartDate("2026-01-01");
    setEndDate("2026-12-31");
  };

  const { data: customerList = [], isLoading: loadingCustomers } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const { data: serviceTiers = [], isLoading: loadingTiers } = useQuery({ queryKey: ['serviceTiers'], queryFn: getServiceTiers });
  const { data: expenseList = [], isLoading: loadingExpenses } = useQuery({ queryKey: ['expenses'], queryFn: getExpenses });
  const { data: transactions = [], isLoading: loadingTx } = useQuery({ 
    queryKey: ['transactions'], 
    queryFn: getTransactions,
    refetchInterval: 60000 
  });

  const provinces = useMemo(() => [
    "All Regions",
    ...Array.from(new Set(customerList.map((c: any) => c.province))).sort()
  ], [customerList]);

  const [mounted, setMounted] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDownloadConfirmOpen, setIsDownloadConfirmOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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
    const allocationFactor = isAllRegions ? 1 : (customerList.length > 0 ? (customerList.filter((c: any) => c.province === selectedProvince).length / customerList.length) : 0);
    
    // --- 1. Basic Stats Logic ---
    // Mapping Kota ke Provinsi untuk transaksi yang tidak punya ID Pelanggan
    const getProvinceFromCity = (city: string) => {
      if (!city) return null;
      const c = city.toLowerCase();
      if (c.includes("bandung") || c.includes("bogor") || c.includes("depok") || c.includes("bekasi")) return "Jawa Barat";
      if (c.includes("jakarta")) return "DKI Jakarta";
      if (c.includes("semarang") || c.includes("solo")) return "Jawa Tengah";
      if (c.includes("surabaya") || c.includes("malang")) return "Jawa Timur";
      if (c.includes("jogja") || c.includes("yogyakarta")) return "DI Yogyakarta";
      if (c.includes("bali") || c.includes("denpasar")) return "Bali";
      return null;
    };

    // Helper untuk memformat tanggal ke YYYY-MM-DD (Waktu Lokal)
    const getLocalDate = (d: any) => {
      if (!d) return "";
      try {
        const date = new Date(d);
        if (isNaN(date.getTime())) return String(d);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (e) {
        return String(d);
      }
    };

    // Helper untuk cek range tanggal
    const isInRange = (d: string) => {
      const dateStr = getLocalDate(d);
      return dateStr >= startDate && dateStr <= endDate;
    };

    // --- 1. Raw Stats (Untuk EBITDA & MRR) ---
    const getRawMonthStats = (monthStr: string) => {
      const txs = transactions.filter((tx: any) => {
        const isVerified = tx.status === "Verified" && tx.keterangan === "pemasukan";
        const matchesMonth = getLocalDate(tx.timestamp).startsWith(monthStr);
        if (!isVerified || !matchesMonth || !isInRange(tx.timestamp)) return false;

        if (isAllRegions) return true;
        
        const cityProvince = getProvinceFromCity(tx.city);
        if (cityProvince === selectedProvince) return true;

        const idSuffix = tx.id?.split('-')[1];
        const customer = customerList.find((c: any) => String(c.id) === idSuffix);
        return customer?.province === selectedProvince;
      });

      // Revenue (MRR) - 100% spesifik
      const rev = txs.reduce((sum: number, tx: any) => sum + (tx.numericAmount || 0), 0);

      // Kita fokus ke Transactions sebagai Source of Truth agar sinkron dengan Waterfall
      const txExps = transactions.filter((tx: any) => {
        const isExpense = tx.status === "Verified" && tx.keterangan === "pengeluaran";
        const matchesMonth = getLocalDate(tx.timestamp).startsWith(monthStr);
        if (!isExpense || !matchesMonth || !isInRange(tx.timestamp)) return false;
        
        if (isAllRegions) return true;

        const cityProvince = getProvinceFromCity(tx.city);
        if (cityProvince === selectedProvince) return true;

        const idSuffix = tx.id?.split('-')[1];
        const customer = customerList.find((c: any) => String(c.id) === idSuffix);
        return customer?.province === selectedProvince;
      });

      // Biaya - Hanya dari Transactions agar sinkron dengan Waterfall & Audit SQL
      const totalExp = txExps.reduce((sum: number, tx: any) => sum + (tx.numericAmount || 0), 0);

      const profit = rev - totalExp;
      const margin = rev > 0 ? (profit / rev) * 100 : 0;
      return { rev, totalExp, profit, margin };
    };

    // --- 2. Filtered Stats (Khusus Untuk NET PROFIT) ---
    const getFilteredMonthStats = (monthStr: string) => {
      const txs = transactions.filter((tx: any) => {
        const isVerified = tx.status === "Verified" && tx.keterangan === "pemasukan";
        const matchesMonth = getLocalDate(tx.timestamp).startsWith(monthStr);
        if (!isVerified || !matchesMonth || !isInRange(tx.timestamp)) return false;
        
        if (isAllRegions) return true;

        const cityProvince = getProvinceFromCity(tx.city);
        if (cityProvince === selectedProvince) return true;

        const idSuffix = tx.id?.split('-')[1];
        const customer = customerList.find((c: any) => String(c.id) === idSuffix);
        
        if (!customer) return false;
        return customer.province === selectedProvince;
      });
      const rev = txs.reduce((sum: number, tx: any) => sum + (tx.numericAmount || 0), 0);

      const txExps = transactions.filter((tx: any) => {
        const isExpense = tx.status === "Verified" && tx.keterangan === "pengeluaran";
        const matchesMonth = getLocalDate(tx.timestamp).startsWith(monthStr);
        if (!isExpense || !matchesMonth || !isInRange(tx.timestamp)) return false;

        if (isAllRegions) return true;

        const cityProvince = getProvinceFromCity(tx.city);
        if (cityProvince === selectedProvince) return true;

        const idSuffix = tx.id?.split('-')[1];
        const customer = customerList.find((c: any) => String(c.id) === idSuffix);

        if (!customer) return false;
        return customer.province === selectedProvince;
      });

      const exps = expenseList.filter((e: any) => getLocalDate(e.date).startsWith(monthStr) && isInRange(e.date));

      // Biaya - Hanya dari Transactions
      const totalExp = txExps.reduce((sum: number, tx: any) => sum + (tx.numericAmount || 0), 0);

      const profit = rev - totalExp;
      return { rev, totalExp, profit };
    };

    // --- 3. Analysis ---
    const allMonths = Array.from(new Set([
      ...transactions.filter(t => isInRange(t.timestamp)).map((t: any) => getLocalDate(t.timestamp).slice(0, 7)),
      ...expenseList.filter(e => isInRange(e.date)).map((e: any) => getLocalDate(e.date).slice(0, 7))
    ])).filter(m => m.match(/^\d{4}-\d{2}$/)).sort();

    const latestMonth = allMonths[allMonths.length - 1] || "2026-10";
    const prevMonths = allMonths.filter(m => m < latestMonth);

    // Raw Latest/Benchmark (Untuk EBITDA & MRR Trends)
    const rawLatest = getRawMonthStats(latestMonth);
    const rawPrevTotal = prevMonths.reduce((acc, m) => {
      const s = getRawMonthStats(m);
      return { rev: acc.rev + s.rev, margin: acc.margin + s.margin, count: acc.count + 1 };
    }, { rev: 0, margin: 0, count: 0 });
    const rawBenchmark = {
      rev: rawPrevTotal.count > 0 ? rawPrevTotal.rev / rawPrevTotal.count : 0,
      margin: rawPrevTotal.count > 0 ? rawPrevTotal.margin / rawPrevTotal.count : 0
    };

    // Filtered Latest/Benchmark (Untuk NET PROFIT Trends)
    const filtLatest = getFilteredMonthStats(latestMonth);
    const filtPrevTotal = prevMonths.reduce((acc, m) => {
      const s = getFilteredMonthStats(m);
      return { profit: acc.profit + s.profit, count: acc.count + 1 };
    }, { profit: 0, count: 0 });
    const filtBenchmark = {
      profit: filtPrevTotal.count > 0 ? filtPrevTotal.profit / filtPrevTotal.count : 0
    };

    // Annual Totals (Untuk Big Numbers)
    const totalRawRevenue = allMonths.reduce((sum, m) => sum + getRawMonthStats(m).rev, 0);
    const totalRawExp = allMonths.reduce((sum, m) => sum + getRawMonthStats(m).totalExp, 0);
    const totalRawProfit = totalRawRevenue - totalRawExp;
    const overallEbitdaMargin = totalRawRevenue > 0 ? (totalRawProfit / totalRawRevenue) * 100 : 0;

    const totalFiltProfit = allMonths.reduce((sum, m) => sum + getFilteredMonthStats(m).profit, 0);

    const calculateTrend = (current: number, benchmark: number) => {
      if (benchmark === 0) {
        if (current > 0) return { text: "+100%", type: "up" };
        if (current < 0) return { text: "-100%", type: "danger" };
        return { text: "0%", type: "neutral" };
      }
      const diff = ((current / benchmark) - 1) * 100;
      if (diff > 0) return { text: `+${diff.toFixed(1)}%`, type: "up" };
      if (diff < 0) return { text: `${diff.toFixed(1)}%`, type: "danger" };
      return { text: "0%", type: "neutral" };
    };


    // --- Dynamic Active Users Logic ---
    const activeCustomerIdsInRange = new Set(
      transactions
        .filter((tx: any) => tx.status === "Verified" && tx.keterangan === "pemasukan" && isInRange(tx.timestamp))
        .map((tx: any) => {
          // Ambil bagian setelah 'TRX-' atau 'TRX-CT'
          const fullId = tx.id?.split('-')[1]; // CT001
          return fullId;
        })
        .filter(Boolean)
    );

    const totalCount = customerList.filter((c: any) => {
      const joinDate = getLocalDate(c.createdAt || c.registration_date);
      if (joinDate > endDate) return false; 
      if (isAllRegions) return true;
      return c.province === selectedProvince;
    }).length;

    const activeCount = customerList.filter((c: any) => {
      const joinDate = getLocalDate(c.createdAt || c.registration_date);
      if (joinDate > endDate) return false;
      const hasTxInRange = activeCustomerIdsInRange.has(String(c.id));
      if (!hasTxInRange) return false;
      if (isAllRegions) return true;
      return c.province === selectedProvince;
    }).length;

    const inactiveCount = customerList.filter((c: any) => {
      const joinDate = getLocalDate(c.createdAt || c.registration_date);
      if (joinDate > endDate) return false;
      const isStatusInactive = c.status === "Inactive" || c.status === "Non-Active";
      if (!isStatusInactive) return false;
      if (isAllRegions) return true;
      return c.province === selectedProvince;
    }).length;

    const mrrTrend = calculateTrend(rawLatest.rev, rawBenchmark.rev);
    const marginTrend = calculateTrend(rawLatest.margin, rawBenchmark.margin);
    const profitTrend = calculateTrend(filtLatest.profit, filtBenchmark.profit);

    const metrics = [
      { 
        name: "MRR (Verified)", 
        value: formatCompactNumber(rawLatest.rev), 
        trend: mrrTrend.text, 
        trendType: mrrTrend.type, 
        icon: "trending", 
        detail: "Current Month Revenue" 
      },
      { 
        name: "EBITDA MARGIN", 
        value: `${rawLatest.margin.toFixed(1)}%`, 
        trend: marginTrend.text, 
        trendType: marginTrend.type, 
        icon: "target", 
        detail: "Current Month Margin" 
      },
      { 
        name: "NET PROFIT", 
        value: formatCompactNumber(filtLatest.profit), 
        trend: profitTrend.text, 
        trendType: profitTrend.type, 
        icon: "pie", 
        detail: "Current Month Result" 
      },
      { 
        name: "ACTIVE USERS", 
        value: String(activeCount), 
        trend: activeCount > 0 ? "Synced" : "Stable", 
        trendType: activeCount > 0 ? "up" : "neutral", 
        icon: "user", 
        detail: "Paying Subscribers" 
      },
      { 
        name: "INACTIVE USERS", 
        value: String(inactiveCount), 
        trend: inactiveCount > 0 ? "Attention" : "Healthy", 
        trendType: inactiveCount > 0 ? "danger" : "up", 
        icon: "target", 
        detail: "Non-Paying / Idle" 
      },
    ];

    const filteredCustomers = isAllRegions 
      ? customerList.filter((c: any) => c.status === "Active")
      : customerList.filter((c: any) => c.status === "Active" && c.province === selectedProvince);

    const residentialCount = filteredCustomers.filter((c: any) => c.type === "Residential").length;
    const businessCount = filteredCustomers.filter((c: any) => c.type === "Business").length;
    const totalFiltered = filteredCustomers.length;

    // 4. Service Plan Mix (Sekarang mengikuti Filter Tanggal & Region)
    const activeCustomers = customerList.filter((c: any) => {
      const isActiveInRange = activeCustomerIdsInRange.has(String(c.id));
      if (!isActiveInRange) return false;
      if (isAllRegions) return true;
      return c.province === selectedProvince;
    });

    const targetServices = ['Premium', 'Standard', 'Basic', 'Gamers'];
    const serviceCounts: Record<string, number> = { 'Premium': 0, 'Standard': 0, 'Basic': 0, 'Gamers': 0 };
    
    activeCustomers.forEach((c: any) => {
      const name = c.service === 'Gamers Node' ? 'Gamers' : c.service;
      if (targetServices.includes(name)) {
        serviceCounts[name] = (serviceCounts[name] || 0) + 1;
      }
    });

    const totalActiveWithPlan = Object.values(serviceCounts).reduce((a, b) => a + b, 0);

    const distribution = Object.entries(serviceCounts).map(([name, count]) => {
      const colors: Record<string, string> = {
        'Premium': '#004ac6',
        'Standard': '#64748b',
        'Basic': '#bc4800',
        'Gamers': '#16a34a'
      };
      return {
        name,
        count,
        value: totalActiveWithPlan > 0 ? Math.round((count / totalActiveWithPlan) * 100) : 0,
        color: colors[name] || '#94a3b8'
      };
    });

      const growthTrend = allMonths.map(mStr => {
        const stats = getRawMonthStats(mStr);
        const [year, month] = mStr.split("-");
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return {
          month: `${monthNames[parseInt(month)-1]} ${year.substring(2)}`,
          value: stats.profit
        };
      });

    const incomeByType: Record<string, number> = {};
    const expenseByType: Record<string, number> = {};
    transactions
      .filter((tx: any) => {
        const isVerified = tx.status === "Verified" && tx.keterangan === "pemasukan";
        const matchesMonth = getLocalDate(tx.timestamp).startsWith(latestMonth);
        if (!isVerified || !matchesMonth) return false;
        
        if (isAllRegions) return true;
        const idSuffix = tx.id?.split('-')[1];
        const customer = customerList.find((c: any) => String(c.id) === idSuffix);
        return customer?.province === selectedProvince;
      })
      .forEach((tx: any) => {
        const type = tx.type || "Other";
        incomeByType[type] = (incomeByType[type] || 0) + (tx.numericAmount || 0);
      });

    // B. Dari General Expenses (Allocated)
    expenseList
      .filter((exp: any) => isInRange(exp.date))
      .forEach((exp: any) => {
        const type = exp.category || "Operational";
        const amount = Math.abs(exp.amount || 0) * allocationFactor;
        expenseByType[type] = (expenseByType[type] || 0) + amount;
      });

    const waterfallData = [
      ...Object.entries(incomeByType).map(([name, value]) => ({
        name,
        value: Number(value),
        isExpense: false
      })),
      ...Object.entries(expenseByType).map(([name, value]) => ({
        name,
        value: -Number(value),
        isExpense: true
      }))
    ].filter(d => d.value !== 0);














    return {
      metrics,
      waterfallData,
      distribution,
      growthTrend,
      latestRevenue: rawLatest.rev,
      latestProfit: rawLatest.profit,
      avgMonthlyRevenue: rawBenchmark.rev
    };
  }, [selectedProvince, startDate, endDate, customerList, transactions, expenseList]);

  const filteredProvinces = useMemo(() => 
    provinces.filter((p: any) => p.toLowerCase().includes(searchQuery.toLowerCase())), 
    [searchQuery, provinces]
  );

  const handleDownload = async () => {
    if (!pageRef.current) return;
    setIsDownloadConfirmOpen(false);
    setIsDownloading(true);
    try {
      const dataUrl = await domToPng(pageRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`ISP-Profitability-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Download failed", error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loadingCustomers || loadingTiers || loadingExpenses || loadingTx) {
    return <div className="h-full w-full flex items-center justify-center animate-pulse text-slate-500 font-medium">Loading Profitability Data...</div>;
  }

  if (!mounted) return null;

  return (
    <div className="relative">
      <AnimatePresence>
        {isDownloadConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDownloadConfirmOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-10 text-center">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-6"><Download size={40} /></div>
              <h3 className="text-2xl font-black mb-2">Export Analysis?</h3>
              <p className="text-slate-500 mb-8 leading-relaxed">System will generate a detailed report for {selectedProvince}.</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleDownload} className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl hover:opacity-90 transition-all">Confirm & Download</button>
                <button onClick={() => setIsDownloadConfirmOpen(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
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
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center gap-3 px-6 py-3.5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-sm font-bold min-w-[200px]">
                <Filter size={18} className="text-primary" />
                <span className="flex-1 text-left">{selectedProvince}</span>
                <ChevronDown size={16} className={cn("transition-transform", isDropdownOpen && "rotate-180")} />
              </motion.button>
              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} className="absolute right-0 top-full mt-2 w-[320px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800"><div className="relative flex items-center"><Search className="absolute left-3 text-slate-400" size={16} /><input autoFocus className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" placeholder="Search regions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div></div>
                    <div className="max-h-[300px] overflow-y-auto p-2">{filteredProvinces.map((p) => (<button key={p} onClick={() => { setSelectedProvince(p); setIsDropdownOpen(false); }} className={cn("w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold mb-1", p === selectedProvince ? "bg-primary text-white shadow-md" : "hover:bg-slate-100 dark:hover:bg-slate-800")}>{p}{p === selectedProvince && <Check size={16} />}</button>))}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsDownloadConfirmOpen(true)} className={cn("p-4 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20", isDownloading && "animate-pulse")}>
              <Download size={20} />
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {dynamicData.metrics.map((kpi, i) => (
            <motion.div key={kpi.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:shadow-primary/5 transition-all group">
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
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.section initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 pb-4 border border-slate-200 dark:border-slate-800 shadow-sm">
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
                        <p className="opacity-60 mb-1">{payload[0].name}</p>
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
          </motion.section>

          <div className="space-y-8">
            <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-black mb-8">Service Plan Mix</h3>
              <div className="flex items-center gap-10">
                <div className="h-[220px] w-1/2">
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
            </motion.section>

            <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] p-10 border border-slate-700/30 shadow-xl relative overflow-hidden">
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
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}
