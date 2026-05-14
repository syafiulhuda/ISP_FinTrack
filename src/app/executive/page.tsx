"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getExecutiveReport } from "@/actions/executive";
import { getTransactionDateRange } from "@/actions/transactions";

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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("All Regions");
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [datesInitialized, setDatesInitialized] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: dateRange } = useQuery({
    queryKey: ['transactionDateRange'],
    queryFn: getTransactionDateRange,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!datesInitialized && dateRange?.startDate && dateRange?.endDate) {
      setStartDate(dateRange.startDate);
      setEndDate(dateRange.endDate);
      setDatesInitialized(true);
    }
  }, [dateRange, datesInitialized]);


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
    const rawProvs = data.customers.map((c: any) => c.province).filter(Boolean) as string[];
    const normalized = new Map<string, string>();
    
    rawProvs.forEach(p => {
      const trimmed = p.trim();
      const key = trimmed.toLowerCase();
      if (!normalized.has(key) || (trimmed !== key && normalized.get(key) === key)) {
        const formatted = trimmed.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        normalized.set(key, formatted);
      }
    });

    return ["All Regions", ...Array.from(normalized.values()).sort()];
  }, [data?.customers]);

  const processedData = useMemo(() => {
    if (!data) return null;

    const { customers, transactions, expenses, assetRoster, stockAssets } = data;
    const isAllRegions = selectedProvince === "All Regions";
    const normalize = (val: any) => val ? String(val).toLowerCase().trim() : "";
    const selectedProvLower = normalize(selectedProvince);
    const toTitleCase = (val: string) => {
      if (!val) return "";
      return val.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

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
      if (!isAllRegions && normalize(c.province || "") !== selectedProvLower) return false;
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

      if (!isAllRegions && !normalize(String(prov)).includes(selectedProvLower)) return false;
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

      if (!isAllRegions && !normalize(String(prov)).includes(selectedProvLower)) return false;
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

      if (!isAllRegions && !normalize(String(txProvince)).includes(selectedProvLower)) return;

      const amt = Number(tx.numericAmount || String(tx.amount).replace(/[^0-9]/g, ''));
      const monthStr = txDate.substring(0, 7);

      if (tx.status === "Verified") {
        if (tx.keterangan === "pemasukan") {
          totalRevenue += amt;
          const normProv = toTitleCase(txProvince);
          monthlyRevenue[monthStr] = (monthlyRevenue[monthStr] || 0) + amt;
          profitByProvince[normProv] = (profitByProvince[normProv] || 0) + amt;
        }
        if (tx.keterangan === "pengeluaran") {
          totalExpenses += amt;
          
          // Categorize Direct Costs from transactions
          const cat = String(tx.type || '').toLowerCase();
          if (cat.includes('server') || cat.includes('maintenance') || cat.includes('listrik') || cat.includes('hardware')) {
            directCosts += amt;
          }

          const normProv = toTitleCase(txProvince);
          monthlyExpenses[monthStr] = (monthlyExpenses[monthStr] || 0) + amt;
          profitByProvince[normProv] = (profitByProvince[normProv] || 0) - amt;
        }
      }
    });

    // Note: We skip the separate "expenses" table loop because all expense records 
    // are already included in the "transactions" table with keterangan='pengeluaran'.

    const grossProfit = totalRevenue - directCosts;
    const netProfit = totalRevenue - totalExpenses;
    // Calculate monthly stats from transactions only
    const allMonths = Array.from(new Set([...Object.keys(monthlyRevenue), ...Object.keys(monthlyExpenses)]))
      .filter(m => (monthlyRevenue[m] || 0) > 0 || (monthlyExpenses[m] || 0) > 0) // Strictly only months with data
      .sort();

    const trendData = allMonths.map(month => ({
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
    const inventoryByCondition: Record<string, number> = {};

    filteredAssetRoster.forEach((a: any) => {
      assetByType[a.type || 'Other'] = (assetByType[a.type || 'Other'] || 0) + 1;
      const loc = a.province || getProvinceFromCity(a.location) || 'Unknown';
      assetByLocation[loc] = (assetByLocation[loc] || 0) + 1;
      ownershipDist[a.kepemilikan || 'Company'] = (ownershipDist[a.kepemilikan || 'Company'] || 0) + 1;
      
      const cond = a.condition || 'Unknown';
      inventoryByCondition[cond] = (inventoryByCondition[cond] || 0) + 1;
    });

    filteredStockAssets.forEach((a: any) => {
      stockByType[a.type || 'Other'] = (stockByType[a.type || 'Other'] || 0) + 1;
      const loc = a.province || getProvinceFromCity(a.location) || 'Unknown';
      stockByLocation[loc] = (stockByLocation[loc] || 0) + 1;
      ownershipDist[a.kepemilikan || 'Company'] = (ownershipDist[a.kepemilikan || 'Company'] || 0) + 1;
      
      const cond = a.condition || 'Unknown';
      inventoryByCondition[cond] = (inventoryByCondition[cond] || 0) + 1;
    });

    const assetValuation = [...filteredAssetRoster, ...filteredStockAssets].reduce((sum: number, item: any) => {
      // Handle formatting like "Rp 1.000.000,00" or raw numbers
      const raw = String(item.harga_beli || '0')
        .replace(/[^0-9,.]/g, '') // Remove everything except digits, comma, dot
        .replace(/(\d+)\.(\d+)\.(\d+)/g, '$1$2$3') // Remove thousand separators (dots between digits)
        .replace(',', '.'); // Convert comma to dot for parseFloat
      
      const val = parseFloat(raw);
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
      
      // Support Trillions (T), Billions (B), Millions (M)
      if (absVal >= 1000000000000) return `${sign}Rp ${(absVal / 1000000000000).toFixed(2)}T`;
      if (absVal >= 1000000000) return `${sign}Rp ${(absVal / 1000000000).toFixed(2)}B`;
      if (absVal >= 1000000) return `${sign}Rp ${(absVal / 1000000).toFixed(1)}M`;
      if (absVal >= 1000) return `${sign}Rp ${(absVal / 1000).toFixed(0)}k`;
      
      return `${sign}Rp ${absVal.toLocaleString('id-ID')}`;
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
        byCondition: inventoryByCondition,
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

  const isDataLoading = isLoading || !processedData;

  return (
    <div className="min-h-screen pb-20">
      {/* GLOBAL CONTROL PANEL */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 p-4 md:px-8 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">Unified Executive Summary</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">Single-pane-of-glass overview of ISP-FinTrack metrics.</p>
          </div>

          <div className="flex flex-row items-center justify-between gap-1 w-full tablet:w-auto">
            <div className="flex items-center justify-between gap-1 tablet:gap-2 bg-slate-100 dark:bg-slate-900 px-1.5 tablet:px-3 py-1.5 tablet:py-2 rounded-[1rem] border border-slate-200 dark:border-slate-800 shrink-0 shadow-sm">
              <Calendar className="w-3 h-3 tablet:w-4 tablet:h-4 text-slate-400 shrink-0 hidden sm-phone:block" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[8px] lg-phone:text-[10px] tablet:text-sm font-medium text-slate-700 dark:text-slate-300 outline-none w-[76px] lg-phone:w-24 tablet:w-auto px-0.5" />
              <span className="text-slate-300 text-[8px] tablet:text-sm shrink-0">-</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[8px] lg-phone:text-[10px] tablet:text-sm font-medium text-slate-700 dark:text-slate-300 outline-none w-[76px] lg-phone:w-24 tablet:w-auto px-0.5" />
            </div>

            <div className="relative shrink-0" ref={dropdownRef}>
              <button 
                onClick={() => setIsRegionOpen(!isRegionOpen)}
                className="flex items-center justify-between gap-1 tablet:gap-3 bg-slate-100 dark:bg-slate-900 px-2 tablet:px-4 py-1.5 tablet:py-2 rounded-[1rem] border border-slate-200 dark:border-slate-800 min-w-[84px] tablet:min-w-[160px] max-w-[110px] lg-phone:max-w-[140px] tablet:max-w-none hover:border-indigo-500/50 transition-all active:scale-95 shrink-0"
              >
                <div className="flex items-center gap-1 tablet:gap-2 overflow-hidden">
                  <MapPin className="w-3 h-3 tablet:w-4 tablet:h-4 text-indigo-500 shrink-0 hidden sm-phone:block" />
                  <span className="text-[8px] tablet:text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{selectedProvince}</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform duration-300 ${isRegionOpen ? 'rotate-180' : ''}`} />
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

        {/* DYNAMIC TABS - Segmented Control Style */}
        <div className="bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl flex gap-1 overflow-x-auto no-scrollbar w-full tablet:w-fit mx-auto tablet:mx-0">
          {[
            { id: 'financial', label: 'Financial & Profitability', mobileLabel: 'Financial', icon: DollarSign },
            { id: 'inventory', label: 'Inventory & Assets', mobileLabel: 'Inventory', icon: Server },
            { id: 'regional', label: 'Regional Analytics', mobileLabel: 'Regional', icon: MapPin },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-1 tablet:flex-none items-center justify-center gap-2 px-3 lg-phone:px-6 py-2.5 tablet:py-3 rounded-xl font-bold text-[10px] lg-phone:text-[11px] tablet:text-sm whitespace-nowrap transition-all duration-300 group ${
                activeTab === tab.id 
                  ? "text-white shadow-lg shadow-indigo-500/20" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {activeTab === tab.id && (
                <m.div 
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-indigo-500 rounded-xl z-0"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <tab.icon className={`w-3.5 h-3.5 lg-phone:w-4 lg-phone:h-4 shrink-0 relative z-10 transition-transform group-hover:scale-110 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} />
              <span className="hidden lg-phone:inline relative z-10">{tab.label}</span>
              <span className="lg-phone:hidden relative z-10">{tab.mobileLabel}</span>
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
                {isDataLoading ? (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-[120px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
                      ))}
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="h-6 w-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg mb-6" />
                      <div className="h-80 w-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
                      <h3 className="text-lg lg:text-xl font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">{k.val}</h3>
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
                        <RechartsTooltip 
                          cursor={{ stroke: '#6366f1', strokeWidth: 2, strokeDasharray: '5 5' }} 
                          content={({ active, payload }) => active && payload && payload.length && (
                            <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-3 rounded-2xl text-xs font-black shadow-2xl border border-white/10">
                              <p className="opacity-60 mb-2 uppercase tracking-tighter text-[9px]">{payload[0].payload.month}</p>
                              <div className="flex flex-col gap-2">
                                {payload.map((entry: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between gap-6">
                                    <span className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                      {entry.name}
                                    </span>
                                    <span className="font-mono">{new Intl.NumberFormat('id-ID', {style: 'currency', currency: 'IDR', maximumFractionDigits: 0}).format(entry.value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )} 
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          content={({ payload }) => (
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-6">
                              {payload?.map((entry: any, index: number) => (
                                <div key={`item-${index}`} className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 tablet:w-2 tablet:h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-[10px] tablet:text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    {entry.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        />
                        <Area type="monotone" dataKey="revenue" name="Gross Revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                        <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                        <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                </>
              )}
              </div>
            )}

            {/* TAB 2: INVENTORY & ASSETS */}
            {activeTab === 'inventory' && (
              <div className="space-y-8">
                {isDataLoading ? (
                  <div className="animate-pulse space-y-8">
                    <div className="h-32 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="h-80 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
                      <div className="h-80 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Total Asset Valuation</p>
                    <h3 className="text-4xl font-black text-emerald-500">{processedData.inventory.valuation}</h3>
                    <p className="text-xs text-slate-400 mt-1">Combined value of {processedData.inventory.total} devices</p>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-widest">Total Assets</p>
                      <h4 className="text-3xl font-black text-slate-900 dark:text-white">{processedData.inventory.total}</h4>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                          {processedData.inventory.byCondition['Good'] || 0} Good
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase">
                          {processedData.inventory.byCondition['Maintenance'] || 0} Maint.
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase">
                          {processedData.inventory.byCondition['Broken'] || 0} Broken
                        </span>
                      </div>
                    </div>
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
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                          <RechartsTooltip 
                            cursor={{ fill: 'transparent' }} 
                            content={({ active, payload }) => active && payload && payload.length && (
                              <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-sm font-black shadow-2xl border border-white/10">
                                {Number(payload[0].value).toLocaleString()}
                              </div>
                            )} 
                          />
                          <defs>
                            <linearGradient id="barGradient1" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                            </linearGradient>
                          </defs>
                          <Bar dataKey="value" fill="url(#barGradient1)" radius={[10, 10, 0, 0]} barSize={40} />
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
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                          <RechartsTooltip 
                            cursor={{ fill: 'transparent' }} 
                            content={({ active, payload }) => active && payload && payload.length && (
                              <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-sm font-black shadow-2xl border border-white/10">
                                {Number(payload[0].value).toLocaleString()}
                              </div>
                            )} 
                          />
                          <defs>
                            <linearGradient id="barGradient2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={1} />
                              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.8} />
                            </linearGradient>
                          </defs>
                          <Bar dataKey="value" fill="url(#barGradient2)" radius={[10, 10, 0, 0]} barSize={40} />
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
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} width={100} />
                          <RechartsTooltip 
                            cursor={{ fill: 'transparent' }} 
                            content={({ active, payload }) => active && payload && payload.length && (
                              <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-sm font-black shadow-2xl border border-white/10">
                                {Number(payload[0].value).toLocaleString()}
                              </div>
                            )} 
                          />
                          <defs>
                            <linearGradient id="barGradient3" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                              <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                            </linearGradient>
                          </defs>
                          <Bar dataKey="value" fill="url(#barGradient3)" radius={[0, 10, 10, 0]} barSize={20} />
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
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} width={100} />
                          <RechartsTooltip 
                            cursor={{ fill: 'transparent' }} 
                            content={({ active, payload }) => active && payload && payload.length && (
                              <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-sm font-black shadow-2xl border border-white/10">
                                {Number(payload[0].value).toLocaleString()}
                              </div>
                            )} 
                          />
                          <defs>
                            <linearGradient id="barGradient4" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
                              <stop offset="100%" stopColor="#2563eb" stopOpacity={0.8} />
                            </linearGradient>
                          </defs>
                          <Bar dataKey="value" fill="url(#barGradient4)" radius={[0, 10, 10, 0]} barSize={20} />
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
                          <RechartsTooltip 
                            content={({ active, payload }) => active && payload && payload.length && (
                              <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-sm font-black shadow-2xl border border-white/10">
                                {Number(payload[0].value).toLocaleString()}
                              </div>
                            )} 
                          />
                          <Legend verticalAlign="middle" align="right" layout="vertical" formatter={(value) => <span className="text-slate-400 font-bold text-xs">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                </>
              )}
              </div>
            )}

            {/* TAB 3: REGIONAL ANALYTICS */}
            {activeTab === 'regional' && (
              <div className="space-y-8">
                {isDataLoading ? (
                  <div className="animate-pulse space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
                      <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-3xl" />
                    </div>
                  </div>
                ) : (
                  <>
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
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 700}} width={120} />
                          <RechartsTooltip 
                            cursor={{ fill: 'transparent' }} 
                            content={({ active, payload }) => active && payload && payload.length && (
                              <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-2xl text-xs font-black shadow-2xl border border-white/10">
                                <p className="opacity-60 mb-1 uppercase tracking-tighter text-[9px]">{payload[0].payload.name}</p>
                                <p className="text-sm font-black">{Number(payload[0].value).toLocaleString()}</p>
                              </div>
                            )} 
                          />
                          <defs>
                            <linearGradient id="regGradient1" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8} />
                            </linearGradient>
                          </defs>
                          <Bar dataKey="value" fill="url(#regGradient1)" radius={[0, 10, 10, 0]} barSize={24} label={{ position: 'right', fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
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
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 700}} width={100} />
                          <RechartsTooltip 
                            cursor={{ fill: 'transparent' }} 
                            content={({ active, payload }) => active && payload && payload.length && (
                              <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-2 rounded-2xl text-xs font-black shadow-2xl border border-white/10">
                                <p className="opacity-60 mb-1 uppercase tracking-tighter text-[9px]">{payload[0].payload.name}</p>
                                <p className="text-sm font-black">{Number(payload[0].value).toLocaleString()}</p>
                              </div>
                            )} 
                          />
                          <defs>
                            <linearGradient id="regGradient2" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                              <stop offset="100%" stopColor="#0891b2" stopOpacity={0.8} />
                            </linearGradient>
                          </defs>
                          <Bar dataKey="value" fill="url(#regGradient2)" radius={[0, 10, 10, 0]} barSize={18} label={{ position: 'right', fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
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
                </>
              )}
              </div>
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
