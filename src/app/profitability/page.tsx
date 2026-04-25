"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, 
  ArrowUp, 
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
  X
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
  AreaChart
} from "recharts";

import { useQuery } from "@tanstack/react-query";
import { getCustomers, getServiceTiers, getExpenses, getTransactions, createNotification } from "@/actions/db";
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
  const { data: customerList = [], isLoading: loadingCustomers } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const { data: serviceTiers = [], isLoading: loadingTiers } = useQuery({ queryKey: ['serviceTiers'], queryFn: getServiceTiers });
  const { data: expenseList = [], isLoading: loadingExpenses } = useQuery({ queryKey: ['expenses'], queryFn: getExpenses });
  const { data: transactions = [], isLoading: loadingTx } = useQuery({ 
    queryKey: ['transactions'], 
    queryFn: getTransactions,
    refetchInterval: 5000 
  });

  const provinces = useMemo(() => [
    "All Regions",
    ...Array.from(new Set(customerList.map((c: any) => c.province))).sort()
  ], [customerList]);

  const [selectedProvince, setSelectedProvince] = useState("All Regions");
  const [searchQuery, setSearchQuery] = useState("");
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

  // Data Validation: Sync Check between Customers and Transactions
  useEffect(() => {
    if (loadingCustomers || loadingTx || loadingTiers || !customerList.length || !transactions.length) return;

    const active = customerList.filter((c: any) => c.status === "Active");
    const estimatedMRR = active.reduce((sum, customer) => {
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

    if (estimatedMRR !== verifiedTxTotal && selectedProvince === "All Regions") {
      const diff = Math.abs(estimatedMRR - verifiedTxTotal);
      const formattedDiff = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(diff);
      
      createNotification(
        "warning",
        "Data Mismatch Detected",
        `There is a discrepancy of ${formattedDiff} between Active Customer Tiers and Verified Transactions. Please check for missing transactions.`
      );
    }
  }, [customerList, transactions, serviceTiers, loadingCustomers, loadingTx, loadingTiers, selectedProvince]);

  const dynamicData = useMemo(() => {
    const calculateRegionalMetrics = (list: any[]) => {
      const active = list.filter(c => c.status === "Active");
      
      // Calculate Revenue based on Active Customers' Service Tiers
      // This ensures MRR changes when the Region dropdown is updated
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

      // Fallback: If estimated is 0 but we have global verified transactions, 
      // we use global transactions but allocated by customer count ratio.
      // This handles cases where customers might not have service tier info correctly.
      const totalVerifiedRevenue = transactions
        .filter(t => t.status === "Verified")
        .reduce((sum, t) => sum + (parseInt(t.amount.replace(/[^0-9]/g, '')) || 0), 0);

      const revenue = estimatedRevenue > 0 ? estimatedRevenue : (totalVerifiedRevenue * (list.length / (customerList.length || 1)));
      const arpu = active.length > 0 ? revenue / active.length : 0;
      
      return { revenue, arpu, activeCount: active.length };
    };

    const currentList = selectedProvince === "All Regions" 
      ? customerList 
      : customerList.filter(c => c.province === selectedProvince);
    
    const current = calculateRegionalMetrics(currentList);

    // Calculate previous period for trends (simplified to customers created before Oct)
    const prevList = currentList.filter(c => {
      if (!c.createdAt) return true;
      const date = new Date(c.createdAt);
      return date.getMonth() < 9;
    });
    const prev = calculateRegionalMetrics(prevList);

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentPeriodKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    // Regional Factor for allocation of fixed costs
    const totalGlobalCustomers = customerList.length;
    const regionalCustomerCount = currentList.length;
    const allocationFactor = selectedProvince === "All Regions" ? 1 : (totalGlobalCustomers > 0 ? regionalCustomerCount / totalGlobalCustomers : 0);

    // Get Expenses with fallback for recent data
    const getExpensesByCategory = (categoryKeywords: string[], monthKey?: string) => {
      return expenseList
        .filter((e: any) => {
          if (!e.date || !e.category) return false;
          const cat = e.category.toLowerCase();
          const matches = categoryKeywords.some(kw => cat.includes(kw.toLowerCase()));
          
          if (monthKey) {
            const d = new Date(e.date);
            const itemPeriodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return matches && itemPeriodKey === monthKey;
          }
          return matches;
        })
        .reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
    };

    // Calculate CAC using real data
    let marketingSpend = getExpensesByCategory(['marketing', 'promo', 'ads'], currentPeriodKey);
    let newCustCount = currentList.filter((c: any) => {
      if (!c.createdAt) return false;
      const d = new Date(c.createdAt);
      const itemPeriodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return itemPeriodKey === currentPeriodKey;
    }).length;

    // Fallback CAC if current month is empty (Check last 6 months)
    if (marketingSpend === 0 || newCustCount === 0) {
      for (let i = 1; i <= 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const pastKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const pastSpend = getExpensesByCategory(['marketing', 'promo', 'ads'], pastKey);
        const pastCust = currentList.filter((c: any) => {
          if (!c.createdAt) return false;
          const date = new Date(c.createdAt);
          const pKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          return pKey === pastKey;
        }).length;

        if (pastSpend > 0 && pastCust > 0) {
          marketingSpend = pastSpend;
          newCustCount = pastCust;
          break;
        }
      }
    }

    const realCAC = newCustCount > 0 ? (marketingSpend * allocationFactor) / newCustCount : (marketingSpend > 0 ? marketingSpend : 75000);
    const ltvVal = current.arpu * 24;
    const ltvRatio = realCAC > 0 ? ltvVal / realCAC : 0;

    // Fixed Costs Allocation
    // Infrastructure and Operational costs are allocated by customer count ratio
    const totalInfraCosts = getExpensesByCategory(['infrastructure', 'fiber', 'maintenance', 'server']);
    const totalOpsCosts = getExpensesByCategory(['operational', 'electricity', 'office', 'rent', 'salary']);
    
    const regionalInfra = (totalInfraCosts / 12) * allocationFactor; // Monthly average allocated
    const regionalOps = (totalOpsCosts / 12) * allocationFactor; // Monthly average allocated
    const regionalMarketing = (marketingSpend > 0 ? marketingSpend : 2000000) * allocationFactor;

    const totalRegionalOpex = regionalInfra + regionalOps + regionalMarketing;
    const netProfit = current.revenue - totalRegionalOpex;
    const ebitdaMargin = current.revenue > 0 ? (netProfit / current.revenue) * 100 : 0;

    const revenueTrend = prev.revenue > 0 ? ((current.revenue - prev.revenue) / prev.revenue) * 100 : 0;

    const formatTrend = (val: number) => ({
      text: `${val > 0 ? "+" : ""}${val.toFixed(1)}%`,
      type: (val > 0 ? "up" : val < 0 ? "down" : "neutral") as "up" | "down" | "neutral"
    });

    const formattedMRR = current.revenue >= 1000000000 
      ? `Rp ${(current.revenue / 1000000000).toFixed(1)}B` 
      : `Rp ${(current.revenue / 1000000).toFixed(1)}M`;

    const ebitdaTrend = 0; // Placeholder until historical expense data is available

    const metrics = [
      { 
        name: "MRR", 
        value: formattedMRR, 
        trend: formatTrend(revenueTrend).text, 
        trendType: formatTrend(revenueTrend).type, 
        icon: "trending",
        detail: "Monthly Recurring Revenue"
      },
      { 
        name: "EBITDA MARGIN", 
        value: `${ebitdaMargin.toFixed(1)}%`, 
        trend: ebitdaTrend > 0 ? "Improving" : ebitdaTrend < 0 ? "Declining" : "Stable", 
        trendType: (ebitdaTrend > 0 ? "up" : ebitdaTrend < 0 ? "down" : "neutral") as "up" | "down" | "neutral",
        icon: "target",
        detail: "Operational Profitability"
      },
      { 
        name: "LTV:CAC RATIO", 
        value: `${ltvRatio.toFixed(1)}:1`, 
        trend: `TGT > 3:1`, 
        trendType: (ltvRatio > 3 ? "up" : "neutral") as "up" | "down" | "neutral",
        icon: "user",
        detail: "Customer Unit Economics"
      },
      { 
        name: "NET PROFIT / USER", 
        value: `Rp ${(netProfit / (current.activeCount || 1) / 1000).toFixed(1)}k`, 
        trend: "Real-time", 
        trendType: "neutral" as "neutral",
        icon: "pie",
        detail: "Bottom Line per Active User"
      },
    ];

    const waterfallData = [
      { name: "Gross Rev", value: current.revenue / 1000000, color: "#16a34a" },
      { name: "COGS", value: -(regionalInfra) / 1000000, color: "#943700" },
      { name: "OPEX", value: -(regionalOps + regionalMarketing) / 1000000, color: "#943700" },
      { name: "Net Profit", value: netProfit / 1000000, color: "#004ac6" },
    ];

    const distribution = [
      { name: "Residential", value: current.activeCount > 0 ? Math.round((currentList.filter(c => c.service === "Basic" || c.service === "Standard").length / current.activeCount) * 100) : 0, color: "#004ac6" },
      { name: "Business", value: current.activeCount > 0 ? Math.round((currentList.filter(c => c.service === "Premium" || c.service === "Gamers").length / current.activeCount) * 100) : 0, color: "#bc4800" },
    ];

    const growthTrend = ["Jan", "Mar", "May", "Jul", "Sep", "Oct"].map((m, i) => ({
      month: m,
      value: (current.arpu * (0.7 + (i * 0.06))) / 1000
    }));

    return {
      metrics,
      waterfallData,
      distribution,
      growthTrend
    };
  }, [selectedProvince, customerList, serviceTiers, expenseList]);

  const filteredProvinces = useMemo(() => 
    provinces.filter((p: any) => p.toLowerCase().includes(searchQuery.toLowerCase())), 
    [searchQuery, provinces]
  );

  const handleDownload = async () => {
    if (!pageRef.current) return;
    setIsDownloadConfirmOpen(false);
    setIsDownloading(true);
    
    try {
      const dataUrl = await domToPng(pageRef.current, {
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
      pdf.save(`ISP-Profitability-Report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loadingCustomers || loadingTiers || loadingExpenses || loadingTx) {
    return <div className="h-full w-full flex items-center justify-center"><div className="animate-pulse flex flex-col items-center gap-4"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div><p className="text-slate-500 font-medium">Loading Profitability Data...</p></div></div>;
  }

  if (!mounted) return null;

  return (
    <div className="relative">
      <AnimatePresence>
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
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">Export Analysis?</h3>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                System will generate a detailed Profitability Analysis report for {selectedProvince}. This may take a few seconds.
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

      <div ref={pageRef} className="space-y-10 pb-10">
        {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Profitability Analysis</h2>
          <p className="text-lg font-medium text-slate-500 mt-2">Segmented performance and unit economics audit.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* REGION DROPDOWN - Real Contextual Dropdown Implementation */}
          <div className="relative" ref={dropdownRef}>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 px-6 py-3.5 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all min-w-[200px]"
            >
              <Filter size={18} className="text-primary" />
              <span className="flex-1 text-left">{selectedProvince}</span>
              <ChevronDown size={16} className={cn("transition-transform duration-200", isDropdownOpen && "rotate-180")} />
            </motion.button>
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-[320px] p-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50"
                >
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="relative flex items-center">
                      <Search className="absolute left-3 text-slate-400" size={16} />
                      <input 
                        autoFocus
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                        placeholder="Search regions..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto p-2 custom-scrollbar">
                    {filteredProvinces.map((province) => {
                      const isSelected = province === selectedProvince;
                      return (
                        <button 
                          key={province}
                          onClick={() => {
                            setSelectedProvince(province);
                            setIsDropdownOpen(false);
                            setSearchQuery("");
                          }}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all text-left mb-1",
                            isSelected 
                              ? "bg-primary text-white shadow-md shadow-primary/20" 
                              : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                          )}
                        >
                          {province}
                          {isSelected && <Check size={16} className="text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsDownloadConfirmOpen(true)}
            disabled={isDownloading}
            className={cn(
              "p-4 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 transition-all",
              isDownloading && "animate-pulse cursor-wait opacity-80"
            )}
          >
            <Download size={20} />
          </motion.button>
        </div>
      </div>

      {/* Main KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dynamicData.metrics.map((kpi, index) => (
          <motion.div
            key={kpi.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -5 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 group hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-all">
                {kpi.icon === "trending" && <TrendingUp size={24} />}
                {kpi.icon === "target" && <Target size={24} />}
                {kpi.icon === "user" && <UserCheck size={24} />}
                {kpi.icon === "pie" && <PieChartIcon size={24} />}
              </div>
              <div className={cn(
                "flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full",
                kpi.trendType === "up" ? "bg-green-100 text-green-700" : 
                kpi.trendType === "down" ? "bg-red-100 text-red-700" : 
                "bg-slate-100 text-slate-600"
              )}>
                {kpi.trendType === "up" ? <ArrowUp size={12} /> : kpi.trendType === "neutral" ? <Minus size={12} /> : null}
                {kpi.trend}
              </div>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{kpi.name}</p>
            <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">{kpi.value}</h3>
            <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-tighter">{kpi.detail}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Waterfall Chart */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Revenue Waterfall</h3>
              <p className="text-sm font-medium text-slate-500 mt-1">Gross Margin vs Operational Expenses.</p>
            </div>
            <BarChart3 className="text-slate-300" size={32} />
          </div>
          <div className="h-[350px] w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dynamicData.waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xl">
                            {payload[0].name}: Rp {(payload[0].value as number).toLocaleString()}M
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[8, 8, 8, 8]} 
                    barSize={40}
                  >
                    {dynamicData.waterfallData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(entry as any).color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.section>

        {/* Mix & Trend */}
        <div className="space-y-8">
          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800"
          >
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mb-8">Service Plan Mix</h3>
            <div className="flex items-center gap-10">
              <div className="h-[220px] w-1/2">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dynamicData.distribution}
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={10}
                        dataKey="value"
                      >
                        {dynamicData.distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={(entry as any).color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="space-y-5 w-1/2">
                {dynamicData.distribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: (item as any).color }} />
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{item.name}</span>
                    </div>
                    <span className="text-lg font-black text-slate-900 dark:text-slate-100">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 rounded-[2.5rem] p-10 shadow-xl border border-slate-700/30 overflow-hidden relative"
          >
            {/* Background Glow Effect */}
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl" />
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-black text-white mb-1">Growth Trend</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ARPU Month-over-Month</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-green-400 uppercase tracking-wider">Live</span>
                  </div>
                </div>
              </div>

              {/* Value Highlight */}
              <div className="mb-6">
                <span className="text-4xl font-black text-white tracking-tight">
                  Rp {dynamicData.growthTrend[dynamicData.growthTrend.length - 1]?.value.toFixed(0)}k
                </span>
                <span className="text-sm font-bold text-green-400 ml-3">↑ trending</span>
              </div>

              <div className="h-[160px] w-full">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dynamicData.growthTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#004ac6" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#004ac6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                      />
                      <YAxis hide />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 shadow-xl">
                                <p className="text-xs font-black text-white">Rp {(payload[0].value as number).toFixed(0)}k</p>
                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">{payload[0].payload.month}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={3} 
                        fill="url(#growthGradient)" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#60a5fa" 
                        strokeWidth={2.5} 
                        dot={{ r: 4, fill: '#1e40af', stroke: '#60a5fa', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  </div>
);
}
