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
  const [searchQuery, setSearchQuery] = useState("");

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

  const dynamicData = useMemo(() => {
    const isAllRegions = selectedProvince === "All Regions";
    
    // 1. Filter Transactions (Verified Income Only)
    const verifiedIncomeTx = transactions.filter((tx: any) => {
      const isVerified = tx.status === "Verified" && tx.keterangan === "pemasukan";
      if (!isVerified) return false;
      if (isAllRegions) return true;
      const customer = customerList.find((c: any) => String(c.id) === String(tx.linked_id));
      return customer?.province === selectedProvince;
    });

    const annualRevenue = verifiedIncomeTx.reduce((sum: number, tx: any) => sum + (tx.numericAmount || 0), 0);
    
    // 2. Expenses Calculation (Total Absolute)
    const allocationFactor = isAllRegions ? 1 : (customerList.length > 0 ? (customerList.filter((c: any) => c.province === selectedProvince).length / customerList.length) : 0);
    const totalExpenses = expenseList.reduce((sum: number, e: any) => sum + Math.abs(Number(e.amount) || 0), 0) * allocationFactor;

    const netProfit = annualRevenue - totalExpenses;
    const ebitdaMargin = annualRevenue > 0 ? (netProfit / annualRevenue) * 100 : 0;

    // 3. MRR (Total Verified Income - All Dates)
    const mrrVerified = verifiedIncomeTx
      .reduce((sum: number, tx: any) => sum + (tx.numericAmount || 0), 0);

    // 4. Waterfall Data (Distribution by Type + Expenses)
    const incomeByType: Record<string, number> = {};
    verifiedIncomeTx.forEach((tx: any) => {
      const type = tx.type || "Other";
      incomeByType[type] = (incomeByType[type] || 0) + (tx.numericAmount || 0);
    });

    const waterfallData = [
      ...Object.entries(incomeByType).map(([name, value]) => ({ 
        name, 
        value: value, 
        color: "#16a34a" 
      })),
      ...Array.from(new Set(expenseList.map((e: any) => e.category))).map(cat => {
        const catValue = expenseList
          .filter((e: any) => e.category === cat)
          .reduce((sum: number, e: any) => sum + Math.abs(Number(e.amount) || 0), 0) * allocationFactor;
        return { 
          name: cat, 
          value: -catValue, 
          color: "#f43f5e" 
        };
      })
    ];

    // 5. Growth Trend Calculation
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyGroups: Record<string, number> = {};

    verifiedIncomeTx.forEach((tx: any) => {
      const dateStr = tx.timestamp.split('T')[0];
      const [year, month] = dateStr.split('-');
      const key = `${year}-${month}`;
      monthlyGroups[key] = (monthlyGroups[key] || 0) + (tx.numericAmount || 0);
    });

    const growthTrend = Object.keys(monthlyGroups).sort().map(key => {
      const [year, month] = key.split("-");
      const mIdx = parseInt(month) - 1;
      return {
        month: `${monthNames[mIdx]} ${year.substring(2)}`,
        value: monthlyGroups[key]
      };
    });

    const activeCount = isAllRegions 
      ? customerList.filter((c: any) => c.status === "Active").length 
      : customerList.filter((c: any) => c.status === "Active" && c.province === selectedProvince).length;

    const metrics = [
      { name: "MRR (Verified)", value: mrrVerified >= 1000000 ? `Rp ${(mrrVerified/1000000).toFixed(2)}M` : `Rp ${(mrrVerified/1000).toFixed(0)}k`, trend: "+12%", trendType: "up" as const, icon: "trending", detail: "Total Verified Income" },
      { name: "EBITDA MARGIN", value: `${ebitdaMargin.toFixed(1)}%`, trend: "Stable", trendType: "neutral" as const, icon: "target", detail: "Profit after total Opex" },
      { name: "NET PROFIT", value: `Rp ${(netProfit/1000000).toFixed(2)}M`, trend: "Annual", trendType: "neutral" as const, icon: "pie", detail: "Revenue - Total Expense" },
      { name: "ACTIVE USERS", value: String(activeCount), trend: "Synced", trendType: "up" as const, icon: "user", detail: "Paying Subscribers" },
    ];

    const totalRevenue = growthTrend.reduce((sum, item) => sum + item.value, 0);
    const avgMonthlyRevenue = growthTrend.length > 0 ? totalRevenue / growthTrend.length : 0;

    const filteredCustomers = isAllRegions 
      ? customerList.filter((c: any) => c.status === "Active")
      : customerList.filter((c: any) => c.status === "Active" && c.province === selectedProvince);

    const residentialCount = filteredCustomers.filter((c: any) => c.type === "Residential").length;
    const businessCount = filteredCustomers.filter((c: any) => c.type === "Business").length;
    const totalFiltered = filteredCustomers.length;

    // 4. Service Plan Mix (Client-side calculation for consistency)
    const activeCustomers = isAllRegions 
      ? customerList.filter((c: any) => c.status === "Active")
      : customerList.filter((c: any) => c.status === "Active" && c.province === selectedProvince);

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
        value: totalActiveWithPlan > 0 ? Math.round((count / totalActiveWithPlan) * 100) : 0,
        color: colors[name] || '#94a3b8'
      };
    });



    return {
      metrics,
      waterfallData,
      distribution,
      growthTrend,
      avgMonthlyRevenue
    };
  }, [selectedProvince, customerList, transactions, expenseList]);

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
          <div className="flex items-center gap-3">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {dynamicData.metrics.map((kpi, i) => (
            <motion.div key={kpi.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:shadow-primary/5 transition-all group">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  {kpi.icon === "trending" && <TrendingUp size={24} />}
                  {kpi.icon === "target" && <Target size={24} />}
                  {kpi.icon === "user" && <UserCheck size={24} />}
                  {kpi.icon === "pie" && <PieChartIcon size={24} />}
                </div>
                <div className={cn("text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1", kpi.trendType === "up" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}>
                  {kpi.trendType === "up" && <ArrowUp size={12} />}{kpi.trend}
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{kpi.name}</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">{kpi.value}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-tighter">{kpi.detail}</p>
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
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#64748b' }} dy={10} />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }} 
                    content={({ active, payload }) => active && payload && payload.length && (
                      <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xl">
                        {payload[0].name}: Rp {Number(payload[0].value).toLocaleString()}
                      </div>
                    )} 
                  />
                  <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={50}>{dynamicData.waterfallData.map((entry, index) => (<Cell key={`cell-${index}`} fill={(entry as any).color} />))}</Bar>
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
                      <Tooltip content={<CustomTooltip />} />
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
                <div className="flex items-center justify-between mb-6"><div><h3 className="text-xl font-black text-white mb-1">Growth Trend</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Revenue Month-over-Month</p></div><div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-2"><div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /><span className="text-[10px] font-black text-green-400 uppercase tracking-wider">Live</span></div></div>
                <div className="mb-6">
                  <span className="text-4xl font-black text-white tracking-tight">
                    {(() => {
                      const val = dynamicData.avgMonthlyRevenue;
                      return val >= 1000000 
                        ? `Rp ${(val / 1000000).toFixed(2)}M` 
                        : `Rp ${(val / 1000).toFixed(0)}k`;
                    })()}
                  </span>
                  <span className="text-sm font-bold text-green-400 ml-3">↑ trending</span>
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
