"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getExecutiveReport } from "@/actions/executive";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ComposedChart
} from "recharts";
import { 
  TrendingUp, Users, DollarSign, Activity, Calendar, MapPin, Package, Server, 
  Wifi, CreditCard, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Target,
  ChevronDown
} from "lucide-react";
import { AnimatePresence, m } from "framer-motion";

// Define Types for Data
interface ExecutiveData {
  customers: any[];
  transactions: any[];
  expenses: any[];
  assetRoster: any[];
  stockAssets: any[];
}

export default function ExecutiveDashboard() {
  const { data, isLoading, isError } = useQuery<ExecutiveData>({
    queryKey: ['executiveReport'],
    queryFn: async () => {
      const res = await getExecutiveReport();
      return res as ExecutiveData;
    }
  });

  const [activeTab, setActiveTab] = useState("financial");
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [selectedProvince, setSelectedProvince] = useState("All Regions");
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRegionOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Derive provinces list
  const provinces = useMemo(() => {
    if (!data?.customers) return ["All Regions"];
    const provs = new Set(data.customers.map((c: any) => c.province).filter(Boolean));
    return ["All Regions", ...Array.from(provs)];
  }, [data?.customers]);

  const processedData = useMemo(() => {
    if (!data) return null;

    const { customers, transactions, expenses, assetRoster, stockAssets } = data;
    const isAllRegions = selectedProvince === "All Regions";

    // --- UTILITIES ---
    const getLocalDate = (d?: string | Date | null) => {
      if (!d) return "";
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d).split('T')[0];
      const localTime = date.getTime() + (7 * 60 * 60 * 1000);
      const localDate = new Date(localTime);
      const year = localDate.getUTCFullYear();
      const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(localDate.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const getProvinceFromCity = (city?: string | null) => {
      if (!city) return null;
      const c = city.toLowerCase();
      
      // Maluku - Priority check
      if (c.includes("ambon") || c.includes("tual") || c.includes("buru") || c.includes("maluku") || c.includes("seram") || c.includes("arru") || c.includes("kei") || c.includes("warehouse east")) return "Maluku";

      // DKI Jakarta
      if (c.includes("jakarta") || c.includes("data center") || c.includes("client home a") || c.includes("warehouse main")) return "DKI Jakarta";
      
      // Jawa Barat
      if (c.includes("bandung") || c.includes("bogor") || c.includes("depok") || c.includes("bekasi") || c.includes("cimahi") || c.includes("tasikmalaya") || c.includes("garut") || c.includes("cianjur") || c.includes("sukabumi") || c.includes("bdo") || c.includes("node")) return "Jawa Barat";
      
      // Jawa Timur
      if (c.includes("surabaya") || c.includes("malang") || c.includes("sidoarjo") || c.includes("gresik") || c.includes("mojokerto") || c.includes("pasuruan") || c.includes("banyuwangi") || c.includes("jember") || c.includes("kediri") || c.includes("madiun") || c.includes("gubeng")) return "Jawa Timur";
      
      // Sulawesi Selatan
      if (c.includes("makassar") || c.includes("gowa") || c.includes("maros") || c.includes("takalar") || c.includes("pangkep") || c.includes("barru") || c.includes("panakkukang")) return "Sulawesi Selatan";
      
      // Bali
      if (c.includes("bali") || c.includes("denpasar") || c.includes("kuta") || c.includes("ubud") || c.includes("warehouse south")) return "Bali";
      
      // DI Yogyakarta
      if (c.includes("yogyakarta") || c.includes("sleman") || c.includes("bantul") || c.includes("kulon progo") || c.includes("gunung kidul")) return "DI Yogyakarta";
      
      // Jawa Tengah
      if (c.includes("semarang") || c.includes("solo") || c.includes("surakarta") || c.includes("magelang") || c.includes("pekalongan") || c.includes("tegal") || c.includes("purwokerto") || c.includes("cilacap") || c.includes("kebumen")) return "Jawa Tengah";
      
      // Sumatera Utara
      if (c.includes("medan") || c.includes("binjai") || c.includes("pematang siantar") || c.includes("tanjung balai") || c.includes("tebing tinggi")) return "Sumatera Utara";

      return null;
    };

    // --- FILTERED BASE DATA ---
    const filteredCustomers = customers.filter((c: any) => {
      const joinDate = getLocalDate(c.createdAt || c.registration_date);
      if (joinDate > endDate) return false;
      if (!isAllRegions && c.province !== selectedProvince) return false;
      return true;
    });

    const activeCustomers = filteredCustomers.filter((c: any) => c.status === "Active");

    const filteredAssetRoster = assetRoster.filter((a: any) => {
      // Filter Region
      let prov = getProvinceFromCity(a.location) || a.location;
      
      // Fallback: Detect Province by Coordinates if name mapping fails
      if (!getProvinceFromCity(a.location)) {
        const lat = Number(a.latitude);
        const lon = Number(a.longitude);
        if (lon > 124 && lon < 136 && lat > -9 && lat < 2) prov = "Maluku";
        else if (lon > 118 && lon < 121 && lat > -7 && lat < -4) prov = "Sulawesi Selatan";
        else if (lon > 112 && lon < 116 && lat > -9 && lat < -6) prov = "Jawa Timur";
        else if (lon > 106 && lon < 109 && lat > -8 && lat < -5) prov = "Jawa Barat";
        else if (lon > 106.5 && lon < 107 && lat > -6.5 && lat < -6) prov = "DKI Jakarta";
      }

      if (!isAllRegions && !String(prov).toLowerCase().includes(selectedProvince.toLowerCase())) return false;
      return true;
    });

    const filteredStockAssets = stockAssets.filter((a: any) => {
      // Filter Region
      let prov = getProvinceFromCity(a.location) || a.location;

      // Fallback: Detect Province by Coordinates
      if (!getProvinceFromCity(a.location)) {
        const lat = Number(a.latitude);
        const lon = Number(a.longitude);
        if (lon > 124 && lon < 136 && lat > -9 && lat < 2) prov = "Maluku";
        else if (lon > 118 && lon < 121 && lat > -7 && lat < -4) prov = "Sulawesi Selatan";
        else if (lon > 112 && lon < 116 && lat > -9 && lat < -6) prov = "Jawa Timur";
        else if (lon > 106 && lon < 109 && lat > -8 && lat < -5) prov = "Jawa Barat";
        else if (lon > 106.5 && lon < 107 && lat > -6.5 && lat < -6) prov = "DKI Jakarta";
      }

      if (!isAllRegions && !String(prov).toLowerCase().includes(selectedProvince.toLowerCase())) return false;
      return true;
    });

    // --- FINANCIAL CALCULATIONS BY PROVINCE ---
    let totalRevenue = 0;
    let totalExpenses = 0;
    let directCosts = 0; // COGS: Server, Maintenance, Listrik
    const monthlyRevenue: Record<string, number> = {};
    const monthlyExpenses: Record<string, number> = {};
    const profitByProvince: Record<string, number> = {};

    transactions.forEach((tx: any) => {
      const txDate = getLocalDate(tx.timestamp);
      if (txDate < startDate || txDate > endDate) return;

      let txProvince = "Unknown";
      const cityProv = getProvinceFromCity(tx.city) || tx.city;
      
      if (tx.keterangan === "pemasukan") {
        const idSuffix = tx.id?.split('-')[1];
        const cust = customers.find((c: any) => String(c.id) === idSuffix);
        txProvince = cust?.province || cityProv || "Other";
      } else {
        txProvince = cityProv || "Other";
      }

      if (!isAllRegions && !String(txProvince).toLowerCase().includes(selectedProvince.toLowerCase())) return;

      const amt = Number(tx.numericAmount || String(tx.amount).replace(/[^0-9]/g, ''));
      const monthStr = txDate.substring(0, 7);

      if (tx.status === "Verified") {
        if (tx.keterangan === "pemasukan") {
          totalRevenue += amt;
          monthlyRevenue[monthStr] = (monthlyRevenue[monthStr] || 0) + amt;
          profitByProvince[txProvince] = (profitByProvince[txProvince] || 0) + amt;
        }
        if (tx.keterangan === "pengeluaran") {
          totalExpenses += amt;
          directCosts += amt; // Assuming transaction-level expenses are direct
          monthlyExpenses[monthStr] = (monthlyExpenses[monthStr] || 0) + amt;
          profitByProvince[txProvince] = (profitByProvince[txProvince] || 0) - amt;
        }
      }
    });

    expenses.forEach((exp: any) => {
      const expDate = getLocalDate(exp.date);
      if (expDate < startDate || expDate > endDate) return;
      
      const txProvince = getProvinceFromCity(exp.city) || exp.city || "Other";
      if (!isAllRegions && !String(txProvince).toLowerCase().includes(selectedProvince.toLowerCase())) return;

      const amt = Number(exp.amount || 0);
      const monthStr = expDate.substring(0, 7);
      totalExpenses += amt;
      
      // Categorize Direct Costs
      const cat = String(exp.category || '').toLowerCase();
      if (cat.includes('server') || cat.includes('maintenance') || cat.includes('listrik')) {
        directCosts += amt;
      }

      monthlyExpenses[monthStr] = (monthlyExpenses[monthStr] || 0) + amt;
      profitByProvince[txProvince] = (profitByProvince[txProvince] || 0) - amt;
    });

    const grossProfit = totalRevenue - directCosts;
    const netProfit = totalRevenue - totalExpenses;
    const trendData = Array.from(new Set([...Object.keys(monthlyRevenue), ...Object.keys(monthlyExpenses)])).sort().map(month => ({
      month,
      revenue: monthlyRevenue[month] || 0,
      expenses: monthlyExpenses[month] || 0,
      profit: (monthlyRevenue[month] || 0) - (monthlyExpenses[month] || 0)
    }));

    // --- INVENTORY GROUPINGS ---
    const assetByType: Record<string, number> = {};
    const assetByLocation: Record<string, number> = {};
    const stockByType: Record<string, number> = {};
    const stockByLocation: Record<string, number> = {};
    const ownershipDist: Record<string, number> = {};

    filteredAssetRoster.forEach((a: any) => {
      assetByType[a.type || 'Other'] = (assetByType[a.type || 'Other'] || 0) + 1;
      const loc = a.location || 'Unknown';
      assetByLocation[loc] = (assetByLocation[loc] || 0) + 1;
      ownershipDist[a.kepemilikan || 'Company'] = (ownershipDist[a.kepemilikan || 'Company'] || 0) + 1;
    });

    filteredStockAssets.forEach((a: any) => {
      stockByType[a.type || 'Other'] = (stockByType[a.type || 'Other'] || 0) + 1;
      const loc = a.location || 'Unknown';
      stockByLocation[loc] = (stockByLocation[loc] || 0) + 1;
    });

    const assetValuation = [...filteredAssetRoster, ...filteredStockAssets].reduce((sum: number, item: any) => {
      const val = Number(String(item.harga_beli || '0').replace(/[^0-9]/g, ''));
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    // --- REGIONAL GROUPINGS ---
    const subscriberByCity: Record<string, number> = {};
    activeCustomers.forEach((c: any) => {
      const city = c.city || "Other";
      subscriberByCity[city] = (subscriberByCity[city] || 0) + 1;
    });

    const formatCurrency = (val: number) => {
      const sign = val < 0 ? "-" : "";
      const absVal = Math.abs(val);
      if (absVal >= 1000000000) return `${sign}Rp ${(absVal / 1000000000).toFixed(2)}B`;
      if (absVal >= 1000000) return `${sign}Rp ${(absVal / 1000000).toFixed(2)}M`;
      if (absVal >= 1000) return `${sign}Rp ${(absVal / 1000).toFixed(1)}k`;
      return `${sign}Rp ${absVal.toFixed(0)}`;
    };

    return {
      financial: {
        totalRevenue: formatCurrency(totalRevenue),
        grossProfit: formatCurrency(grossProfit),
        netProfit: formatCurrency(netProfit),
        totalExpense: formatCurrency(totalExpenses),
        activeCustomers: activeCustomers.length,
        trendData
      },
      inventory: {
        total: filteredAssetRoster.length + filteredStockAssets.length,
        valuation: formatCurrency(assetValuation),
        assetByType: Object.entries(assetByType).map(([name, value]) => ({ name: name as string, value: value as number })),
        assetByLocation: Object.entries(assetByLocation).map(([name, value]) => ({ name: name as string, value: value as number })),
        stockByType: Object.entries(stockByType).map(([name, value]) => ({ name: name as string, value: value as number })),
        stockByLocation: Object.entries(stockByLocation).map(([name, value]) => ({ name: name as string, value: value as number })),
        ownershipDist: Object.entries(ownershipDist).map(([name, value]) => ({ name: name as string, value: value as number })),
        broken: filteredAssetRoster.filter((a: any) => a.condition === "Broken").length + filteredStockAssets.filter((a: any) => a.condition === "Broken").length
      },
      regional: {
        subscribers: activeCustomers.length,
        cityDist: Object.entries(subscriberByCity).map(([name, value]) => ({ name: name as string, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 8),
        provinceProfit: Object.entries(profitByProvince).map(([name, value]) => ({ name: name as string, value: value as number, formatted: formatCurrency(value as number) })).sort((a, b) => (b.value as number) - (a.value as number)),
        provinceSubscribers: Object.entries(
          activeCustomers.reduce((acc: any, c: any) => {
            acc[c.province || 'Other'] = (acc[c.province || 'Other'] || 0) + 1;
            return acc;
          }, {})
        ).map(([name, value]: any) => ({ name: name as string, value: value as number })).sort((a, b) => b.value - a.value)
      }
    };
  }, [data, startDate, endDate, selectedProvince]);

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] text-rose-500 font-bold">
        Error loading executive data. Please check your connection.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="animate-pulse flex flex-col items-center gap-4 text-slate-500">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="font-medium tracking-widest uppercase text-xs">Compiling Executive Data...</p>
        </div>
      </div>
    );
  }

  if (!processedData) return null;

  return (
    <div className="min-h-screen pb-20">
      {/* GLOBAL CONTROL PANEL */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 p-4 md:px-8 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Unified Executive Summary</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Single-pane-of-glass overview of ISP-FinTrack metrics.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 outline-none" />
              <span className="text-slate-300">-</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 outline-none" />
            </div>

            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsRegionOpen(!isRegionOpen)}
                className="flex items-center justify-between gap-3 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 min-w-[160px] hover:border-indigo-500/50 transition-all active:scale-95"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedProvince}</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-300 ${isRegionOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isRegionOpen && (
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
                            setIsRegionOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between group ${
                            selectedProvince === p 
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

        {/* DYNAMIC TABS */}
        <div className="flex gap-1 overflow-x-auto pb-1 hide-scrollbar">
          {[
            { id: 'financial', label: 'Financial & Profitability', icon: DollarSign },
            { id: 'inventory', label: 'Inventory & Assets', icon: Server },
            { id: 'regional', label: 'Regional Analytics', icon: MapPin },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-t-xl font-semibold text-sm transition-all duration-300 ${
                activeTab === tab.id 
                  ? "bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-500" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-8">
        <AnimatePresence mode="wait">
          <m.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* TAB 1: FINANCIAL OVERVIEW */}
            {activeTab === 'financial' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { title: "Revenue", val: processedData.financial.totalRevenue, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { title: "Gross Profit", val: processedData.financial.grossProfit, icon: Target, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { title: "Net Profit", val: processedData.financial.netProfit, icon: DollarSign, color: "text-indigo-500", bg: "bg-indigo-500/10" },
                    { title: "Expense", val: processedData.financial.totalExpense, icon: Activity, color: "text-rose-500", bg: "bg-rose-500/10" },
                    { title: "Active Customer", val: processedData.financial.activeCustomers, icon: Users, color: "text-amber-500", bg: "bg-amber-500/10" }
                  ].map((k, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                      <div className="flex justify-between items-start mb-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{k.title}</p>
                        <div className={`p-2 rounded-lg ${k.bg} ${k.color}`}><k.icon className="w-4 h-4" /></div>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{k.val}</h3>
                    </div>
                  ))}
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500"/> Revenue & Net Profit Trajectory
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={processedData.financial.trendData}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                        <YAxis tickFormatter={(val) => `Rp${val/1000000}M`} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <RechartsTooltip formatter={(value: any) => new Intl.NumberFormat('id-ID', {style: 'currency', currency: 'IDR'}).format(Number(value) || 0)} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} formatter={(value) => <span className="text-slate-400 font-medium mr-6">{value}</span>} />
                        <Area type="monotone" dataKey="revenue" name="Gross Revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                        <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: INVENTORY & ASSETS */}
            {activeTab === 'inventory' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Total Asset Valuation</p>
                    <h3 className="text-4xl font-black text-emerald-500">{processedData.inventory.valuation}</h3>
                    <p className="text-xs text-slate-400 mt-1">Combined value of {processedData.inventory.total} devices</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-center">
                    <p className="text-xs font-bold text-slate-500 mb-1 uppercase">Total Assets</p>
                    <h4 className="text-3xl font-black">{processedData.inventory.total}</h4>
                  </div>
                  <div className="bg-red-500/10 p-5 rounded-2xl border border-red-500/20 flex flex-col justify-center">
                    <p className="text-xs font-bold text-red-500 mb-1 uppercase">Broken Devices</p>
                    <h4 className="text-3xl font-black text-red-600">{processedData.inventory.broken}</h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Asset Type Distribution */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6">Assets Group by Type (Deployed)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedData.inventory.assetByType}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                          <RechartsTooltip contentStyle={{borderRadius: '12px'}} />
                          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Stock Asset Group by Type */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6">Stock Assets by Type (Unused)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedData.inventory.stockByType}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                          <RechartsTooltip contentStyle={{borderRadius: '12px'}} />
                          <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Assets by Location */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6">Assets by Location (Deployed)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedData.inventory.assetByLocation} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1} />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} width={100} />
                          <RechartsTooltip />
                          <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Stock Assets by Province */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6">Stock Location (Warehouse)</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedData.inventory.stockByLocation} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1} />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} width={100} />
                          <RechartsTooltip />
                          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Ownership Distribution */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6">Ownership & Acquisition Model</h3>
                    <div className="h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={processedData.inventory.ownershipDist}
                            cx="50%" cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={({name, percent}: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          >
                            {processedData.inventory.ownershipDist.map((_: any, i: number) => <Cell key={i} fill={["#4f46e5", "#06b6d4", "#f43f5e"][i % 3]} />)}
                          </Pie>
                          <RechartsTooltip />
                          <Legend verticalAlign="middle" align="right" layout="vertical" />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: REGIONAL ANALYTICS */}
            {activeTab === 'regional' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Subscriber Distribution by Province */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-500"/> Subscriber Distribution by Province
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedData.regional.provinceSubscribers} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} width={120} />
                          <RechartsTooltip />
                          <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#64748b', fontSize: 10 }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Distribution by City (Top 8) */}
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-cyan-500"/> Distribution by City (Top 8)
                    </h3>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={processedData.regional.cityDist} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.1} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} width={100} />
                          <RechartsTooltip />
                          <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#64748b', fontSize: 10 }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Profit per Province */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-500"/> Profit Bersih tiap Province (Filter Range)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {processedData.regional.provinceProfit.map((p: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-600 dark:text-slate-300">{p.name}</span>
                        <span className={`font-black ${p.value >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{p.formatted}</span>
                      </div>
                    ))}
                    {processedData.regional.provinceProfit.length === 0 && <p className="text-slate-500 italic">No financial data for selected filters.</p>}
                  </div>
                </div>
              </div>
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
