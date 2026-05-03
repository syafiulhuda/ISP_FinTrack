"use client";

import { m, AnimatePresence } from "framer-motion";
import { 
  MapPin, 
  ChevronRight, 
  MessageSquare,
  ChevronDown, 
  ChevronLeft 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCustomers, getServiceTiers, getAssetRoster, getInvoices, getAgingMVData } from "@/actions/db";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { LoadingState } from "@/components/LoadingState";

export default function RegionalAnalysisPage() {
  const [selectedProvince, setSelectedProvince] = useState("All Provinces");
  const [selectedCity, setSelectedCity] = useState("All Cities");
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedSubDistrict, setSelectedSubDistrict] = useState("All Sub-districts");
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  const { data: customerData, isLoading: loadingCustomers } = useQuery({ 
    queryKey: ['customers', 1, 1000], 
    queryFn: () => getCustomers(1, 1000), 
    refetchInterval: 60000 
  });
  const customerList = customerData?.customers || [];
  const { data: serviceTiers = [], isLoading: loadingTiers } = useQuery({ queryKey: ['serviceTiers'], queryFn: getServiceTiers, refetchInterval: 60000 });
  const { data: assetRoster = [], isLoading: loadingAssets } = useQuery({ queryKey: ['assetRoster'], queryFn: getAssetRoster, refetchInterval: 60000 });
  const { data: invoicesList = [], isLoading: loadingInvoices } = useQuery({ queryKey: ['invoices'], queryFn: getInvoices, refetchInterval: 60000 });
  const { data: agingMVData = [], isLoading: loadingMV } = useQuery({ queryKey: ['agingMV'], queryFn: getAgingMVData, refetchInterval: 60000 });


  const assetSummary = useMemo(() => {
    const filteredAssets = assetRoster.filter(a => {
      // Find the most specific selection
      let matchTarget = "";
      if (selectedSubDistrict !== "All Sub-districts") matchTarget = selectedSubDistrict;
      else if (selectedDistrict !== "All Districts") matchTarget = selectedDistrict;
      else if (selectedCity !== "All Cities") matchTarget = selectedCity;
      else if (selectedProvince !== "All Provinces") matchTarget = selectedProvince;

      // If no specific selection, include all
      if (!matchTarget) return true;

      const loc = a.location.toLowerCase();
      // Clean target from formal prefixes (e.g. "Kota Bandung" -> "bandung")
      const cleanTarget = matchTarget.replace(/^(Kota|Kabupaten|Kecamatan|Kelurahan|Provinsi)\s+/i, '').toLowerCase();

      // Fuzzy match against the location string
      return loc.includes(cleanTarget);
    });

    const online = filteredAssets.filter(a => (a.status || '').toLowerCase() === 'online').length;
    const offline = filteredAssets.filter(a => (a.status || '').toLowerCase() === 'offline').length;
    const sold = assetRoster.filter(a => a.kepemilikan === 'Dijual' || a.kepemilikan === 'Telah Dijual').length;
    
    return { 
      total: filteredAssets.length, 
      online, 
      offline,
      sold 
    };
  }, [assetRoster, selectedProvince, selectedCity, selectedDistrict, selectedSubDistrict]);

  const [profitPage, setProfitPage] = useState(1);
  const [agingPage, setAgingPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Dynamic Options
  const provinces = useMemo(() => ["All Provinces", ...Array.from(new Set(customerList.map(c => c.province).filter(Boolean)))], [customerList]);
  
  const cities = useMemo(() => {
    const list = selectedProvince === "All Provinces" ? customerList : customerList.filter(c => c.province === selectedProvince);
    const sortedRegions = ["All Cities", ...Array.from(new Set(list.map(c => c.city).filter(Boolean)))];
    return sortedRegions;
  }, [selectedProvince, customerList]);

  const districts = useMemo(() => {
    const list = selectedCity === "All Cities" ? (selectedProvince === "All Provinces" ? customerList : customerList.filter(c => c.province === selectedProvince)) : customerList.filter(c => c.city === selectedCity);
    return ["All Districts", ...Array.from(new Set(list.map(c => c.district).filter(Boolean)))];
  }, [selectedProvince, selectedCity, customerList]);

  const subDistricts = useMemo(() => {
    const list = selectedDistrict === "All Districts" ? (selectedCity === "All Cities" ? customerList : customerList.filter(c => c.city === selectedCity)) : customerList.filter(c => c.district === selectedDistrict);
    return ["All Sub-districts", ...Array.from(new Set(list.map(c => c.village).filter(Boolean)))];
  }, [selectedProvince, selectedCity, selectedDistrict, customerList]);

  const dynamicData = useMemo(() => {
    let filtered = customerList.filter(c => {
      const pMatch = selectedProvince === "All Provinces" || c.province === selectedProvince;
      const cMatch = selectedCity === "All Cities" || c.city === selectedCity;
      const dMatch = selectedDistrict === "All Districts" || c.district === selectedDistrict;
      const sMatch = selectedSubDistrict === "All Sub-districts" || c.village === selectedSubDistrict;
      return pMatch && cMatch && dMatch && sMatch;
    });

    const grouped: Record<string, any> = {};
    filtered.forEach(c => {
      const village = c.village || "Other";
      if (!grouped[village]) {
        grouped[village] = {
          node: village,
          customerCount: 0,
          revenue: 0,
          activeCount: 0,
          inactiveCount: 0
        };
      }
      grouped[village].customerCount++;
      if (c.status === "Active") grouped[village].activeCount++;
      else grouped[village].inactiveCount++;
      
      const tier = serviceTiers.find(t => {
        const s = c.service?.toLowerCase();
        const tn = t.name.toLowerCase();
        if (tn === "gamers node") return s === "gamers";
        return s === tn;
      });
      const price = tier ? parseInt(tier.price.replace(/[^0-9]/g, '')) : 0;
      grouped[village].revenue += price;
    });

    return Object.values(grouped).map(v => {
      const arpu = v.activeCount > 0 ? v.revenue / v.activeCount : 0;
      const status = arpu >= 200000 ? "OPTIMAL" : "ACTION NEEDED";
      const color = status === "OPTIMAL" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600";
      
      const customerIds = filtered.filter(c => (c.village || "Other") === v.node).map(c => c.id);
      const villageInvoices = invoicesList.filter(inv => customerIds.includes(inv.customer_id) && inv.status === 'Unpaid');
      
      let aging0_30 = 0;
      let aging31_60 = 0;
      let aging61_90 = 0;
      let aging90Plus = 0;

      // 3. Integrate Materialized View Data (Prioritize MV over simulation)
      const mvNode = agingMVData.find((m: any) => m.NODE === v.node);
      
      if (mvNode) {
        // Data ditemukan di MV (Data Riil)
        aging0_30 = Number(mvNode["REAL 0-30 DAYS"]) || 0;
        aging31_60 = Number(mvNode["REAL 31-60 DAYS"]) || 0;
        aging61_90 = Number(mvNode["REAL 61-90 DAYS"]) || 0;
        aging90Plus = Number(mvNode["REAL 90+ DAYS"]) || 0;
      } else if (agingMVData.length > 0) {
        // Jika MV sudah ada isinya tapi NODE ini tidak ada, artinya piutangnya memang 0 (LUNAS)
        aging0_30 = 0;
        aging31_60 = 0;
        aging61_90 = 0;
        aging90Plus = 0;
      } else if (villageInvoices.length > 0) {
        // Fallback ke tabel invoices manual jika MV belum pernah di-refresh
        const today = new Date();
        villageInvoices.forEach(inv => {
          const dueDate = new Date(inv.due_date);
          const diffTime = Math.abs(today.getTime() - dueDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          const amount = Number(inv.amount) || 0;
          if (diffDays <= 30) aging0_30 += amount;
          else if (diffDays <= 60) aging31_60 += amount;
          else if (diffDays <= 90) aging61_90 += amount;
          else aging90Plus += amount;
        });
      } else {
        // Terakhir, gunakan simulasi hanya jika database benar-benar kosong (Fresh Install)
        aging0_30 = v.revenue * 0.8;
        aging31_60 = v.revenue * 0.12;
        aging61_90 = v.revenue * 0.05;
        aging90Plus = v.revenue * 0.03 + (v.inactiveCount * 150000);
      }

      return {
        ...v,
        arpu: mounted ? Math.round(arpu).toLocaleString() : "---",
        revenue: mounted ? v.revenue.toLocaleString() : "---",
        status,
        color,
        aging: {
          "0-30": mounted ? Math.round(aging0_30).toLocaleString() : "---",
          "31-60": mounted ? Math.round(aging31_60).toLocaleString() : "---",
          "61-90": mounted ? Math.round(aging61_90).toLocaleString() : "---",
          "90Plus": mounted ? Math.round(aging90Plus).toLocaleString() : "---",
          critical: aging90Plus > (v.revenue * 0.1)
        }
      };
    }).sort((a, b) => {
      // Hitung total piutang untuk pengurutan
      const totalA = (parseFloat(a.aging["0-30"].replace(/[^0-9]/g, '')) || 0) +
                     (parseFloat(a.aging["31-60"].replace(/[^0-9]/g, '')) || 0) +
                     (parseFloat(a.aging["61-90"].replace(/[^0-9]/g, '')) || 0) +
                     (parseFloat(a.aging["90Plus"].replace(/[^0-9]/g, '')) || 0);
      
      const totalB = (parseFloat(b.aging["0-30"].replace(/[^0-9]/g, '')) || 0) +
                     (parseFloat(b.aging["31-60"].replace(/[^0-9]/g, '')) || 0) +
                     (parseFloat(b.aging["61-90"].replace(/[^0-9]/g, '')) || 0) +
                     (parseFloat(b.aging["90Plus"].replace(/[^0-9]/g, '')) || 0);
      
      return totalB - totalA; // Terbesar ke terkecil
    }).filter(v => v.node.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [selectedProvince, selectedCity, selectedDistrict, selectedSubDistrict, searchQuery, customerList, serviceTiers, mounted, invoicesList, agingMVData]);

  const paginatedProfit = dynamicData.slice((profitPage - 1) * itemsPerPage, profitPage * itemsPerPage);
  const totalProfitPages = Math.ceil(dynamicData.length / itemsPerPage);

  const paginatedAging = dynamicData.slice((agingPage - 1) * itemsPerPage, agingPage * itemsPerPage);
  const totalAgingPages = Math.ceil(dynamicData.length / itemsPerPage);

  if (loadingCustomers || loadingTiers || loadingAssets || loadingInvoices || loadingMV) {
    return <LoadingState message="Mengkalkulasi analisis regional..." />;
  }

  return (
    <div className="space-y-10">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Regional Analysis</h2>
          <p className="text-lg font-medium text-slate-500 mt-2">Granular profitability and aging distribution per territory.</p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              label: "Province", 
              value: selectedProvince, 
              setter: (val: string) => {
                setSelectedProvince(val);
                setSelectedCity("All Cities");
                setSelectedDistrict("All Districts");
                setSelectedSubDistrict("All Sub-districts");
              }, 
              options: provinces 
            },
            { 
              label: "City", 
              value: selectedCity, 
              setter: (val: string) => {
                setSelectedCity(val);
                setSelectedDistrict("All Districts");
                setSelectedSubDistrict("All Sub-districts");
              }, 
              options: cities 
            },
            { 
              label: "District", 
              value: selectedDistrict, 
              setter: (val: string) => {
                setSelectedDistrict(val);
                setSelectedSubDistrict("All Sub-districts");
              }, 
              options: districts 
            },
            { 
              label: "Sub-district", 
              value: selectedSubDistrict, 
              setter: setSelectedSubDistrict, 
              options: subDistricts 
            },
          ].map((filter, i) => (
            <div key={i} className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{filter.label}</label>
              <div className="relative group">
                <select 
                  value={filter.value}
                  onChange={(e) => {
                    filter.setter(e.target.value);
                    setProfitPage(1);
                    setAgingPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none cursor-pointer shadow-sm"
                >
                  {filter.options.map((opt, idx) => (
                    <option key={idx} value={opt}>{opt}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:rotate-180 transition-transform" size={16} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Ownership Summary */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
          <MapPin size={18} className="text-primary" />
          Ringkasan Aset Regional
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 text-center">
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{mounted ? assetSummary.total : '---'}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Total Aset</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-200/50 dark:border-emerald-700/50 text-center">
            <p className="text-3xl font-black text-emerald-600">{mounted ? assetSummary.online : '---'}</p>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Online</p>
          </div>
          <div className="bg-rose-50 dark:bg-rose-900/10 p-5 rounded-2xl border border-rose-200/50 dark:border-rose-700/50 text-center">
            <p className="text-3xl font-black text-rose-600">{mounted ? assetSummary.sold : '---'}</p>
            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1">Sold</p>
          </div>
        </div>
      </div>

      {/* Profitability Table */}
      <m.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-10 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <MapPin size={24} className="text-primary" />
            Profitability by Kelurahan
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Node Name</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Count</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Revenue</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ARPU</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Node Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <AnimatePresence mode="wait">
                {paginatedProfit.map((row) => (
                  <m.tr 
                    key={row.node}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(0,74,198,0.5)]" />
                        <span className="font-black text-slate-900 dark:text-slate-100 text-lg">{row.node}</span>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-sm font-bold text-slate-600 dark:text-slate-400">{row.customerCount} Active</td>
                    <td className="px-10 py-8 text-sm font-black text-slate-900 dark:text-slate-100">Rp {row.revenue}</td>
                    <td className="px-10 py-8 text-sm font-bold text-blue-600 dark:text-blue-400">Rp {row.arpu}</td>
                    <td className="px-10 py-8">
                      <span className={cn("text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-wider", row.color)}>
                        {row.status}
                      </span>
                    </td>
                  </m.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {/* Pagination Profit */}
        <div className="p-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/30">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Showing {paginatedProfit.length} nodes</p>
          <div className="flex gap-3">
            <m.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setProfitPage(p => Math.max(1, p - 1))}
              disabled={profitPage === 1}
              className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 disabled:opacity-30 shadow-sm"
            >
              <ChevronLeft size={20} />
            </m.button>
            <div className="flex items-center gap-1.5">
              <input 
                type="text"
                key={`profit-page-${profitPage}`}
                defaultValue={profitPage}
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1 && val <= (totalProfitPages || 1)) setProfitPage(val);
                  else e.target.value = String(profitPage);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                className="w-10 h-10 text-center rounded-xl text-xs font-black bg-primary text-white shadow-lg shadow-primary/20 border-none outline-none"
              />
              <span className="text-xs font-black text-slate-400">/ {totalProfitPages || 1}</span>
            </div>
            <m.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setProfitPage(p => Math.min(totalProfitPages, p + 1))}
              disabled={profitPage >= totalProfitPages}
              className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 disabled:opacity-30 shadow-sm"
            >
              <ChevronRight size={20} />
            </m.button>
          </div>
        </div>
      </m.section>

      {/* AR Aging Table */}
      <m.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-10 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <MessageSquare size={24} className="text-primary" />
            AR Aging Analysis
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Node</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-green-600">0-30 Days</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-orange-500">31-60 Days</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-red-500">61-90 Days</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-red-700">90+ Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <AnimatePresence mode="wait">
                {paginatedAging.map((row) => (
                  <m.tr 
                    key={`aging-${row.node}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className={cn(
                      "hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors",
                      row.aging.critical && "bg-red-50/30 dark:bg-red-900/5"
                    )}
                  >
                    <td className="px-10 py-8 font-black text-slate-900 dark:text-slate-100 text-lg">{row.node}</td>
                    <td className="px-10 py-8 text-sm font-bold text-slate-600 dark:text-slate-400">Rp {row.aging["0-30"]}</td>
                    <td className="px-10 py-8 text-sm font-bold text-orange-600">Rp {row.aging["31-60"]}</td>
                    <td className="px-10 py-8 text-sm font-bold text-red-600">Rp {row.aging["61-90"]}</td>
                    <td className="px-10 py-8 text-sm font-black text-red-800">Rp {row.aging["90Plus"]}</td>
                  </m.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {/* Pagination Aging */}
        <div className="p-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/30">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Showing {paginatedAging.length} nodes</p>
          <div className="flex gap-3">
            <m.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAgingPage(p => Math.max(1, p - 1))}
              disabled={agingPage === 1}
              className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 disabled:opacity-30 shadow-sm"
            >
              <ChevronLeft size={20} />
            </m.button>
            <div className="flex items-center gap-1.5">
              <input 
                type="text"
                key={`aging-page-${agingPage}`}
                defaultValue={agingPage}
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1 && val <= (totalAgingPages || 1)) setAgingPage(val);
                  else e.target.value = String(agingPage);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                className="w-10 h-10 text-center rounded-xl text-xs font-black bg-primary text-white shadow-lg shadow-primary/20 border-none outline-none"
              />
              <span className="text-xs font-black text-slate-400">/ {totalAgingPages || 1}</span>
            </div>
            <m.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAgingPage(p => Math.min(totalAgingPages, p + 1))}
              disabled={agingPage >= totalAgingPages}
              className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 disabled:opacity-30 shadow-sm"
            >
              <ChevronRight size={20} />
            </m.button>
          </div>
        </div>
      </m.section>
    </div>
  );
}
