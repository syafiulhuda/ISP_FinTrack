"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Warehouse,
  Search,
  ChevronDown,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Smartphone,
  Router,
  Box,
  Cpu,
  Wifi,
  ShieldCheck,
  ShieldX,
  Calendar
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAssetRoster, getStockAssets } from "@/actions/db";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";

const IconMap = {
  "trending-up": Cpu,
  "check-circle": CheckCircle2,
  "warning": AlertCircle,
  "warehouse": Warehouse,
};

const ConditionIcon = {
  "Good": CheckCircle2,
  "Maintenance": Wrench,
  "Broken": AlertCircle,
  "Warning": AlertCircle
};

export default function InventoryPage() {
  const { data: assetRoster = [], isLoading: loadingAssets } = useQuery({ 
    queryKey: ['assetRoster'], 
    queryFn: getAssetRoster,
    refetchInterval: 5000
  });

  const { data: stockAssets = [], isLoading: loadingStock } = useQuery({ 
    queryKey: ['stockAssets'], 
    queryFn: getStockAssets,
    refetchInterval: 5000
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [selectedOwnership, setSelectedOwnership] = useState("All");
  const [mounted, setMounted] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    setMounted(true);
  }, []);

  const dynamicStats = useMemo(() => {
    const total = assetRoster.length + stockAssets.length;
    const active = assetRoster.filter(a => a.condition === "Good").length;
    const faulty = assetRoster.filter(a => a.condition === "Broken" || a.condition === "Maintenance").length;
    const stock = stockAssets.length;
    const owned = assetRoster.filter(a => a.kepemilikan === "Dimiliki" || !a.kepemilikan).length;
    const sold = assetRoster.filter(a => a.kepemilikan === "Telah Dijual").length;

    const deploymentRate = total > 0 ? Math.round((active / total) * 100) : 0;

    return [
      {
        label: "Total Hardware",
        value: mounted ? total.toLocaleString() : "---",
        trend: "+12% this month",
        trendIcon: "trending-up",
        color: "bg-primary/5",
        isAlert: false
      },
      {
        label: "Active Deployed",
        value: mounted ? active.toLocaleString() : "---",
        trend: `${deploymentRate}% deployment rate`,
        trendIcon: "check-circle",
        color: "bg-primary/5",
        isAlert: false
      },
      {
        label: "Faulty / RMA",
        value: mounted ? faulty.toLocaleString() : "---",
        trend: "Action Required",
        trendIcon: "warning",
        color: "bg-orange-500/10",
        isAlert: true
      },
      {
        label: "Warehouse Stock",
        value: mounted ? stock.toLocaleString() : "---",
        trend: "Ready for dispatch",
        trendIcon: "warehouse",
        color: "bg-primary/5",
        isAlert: false
      },
      {
        label: "Dimiliki",
        value: mounted ? owned.toLocaleString() : "---",
        trend: "Aset aktif",
        trendIcon: "check-circle",
        color: "bg-emerald-500/10",
        isAlert: false
      },
      {
        label: "Telah Dijual",
        value: mounted ? sold.toLocaleString() : "---",
        trend: sold > 0 ? "Archived" : "None sold",
        trendIcon: "warning",
        color: "bg-red-500/10",
        isAlert: sold > 0
      },
    ];
  }, [mounted, assetRoster, stockAssets]);

  const filteredAssets = useMemo(() => {
    return assetRoster.filter(asset => {
      const typeMatch = selectedType === "All" || asset.type === selectedType;
      const conditionMatch = selectedCondition === "All" || asset.condition === selectedCondition;
      const ownershipMatch = selectedOwnership === "All" || asset.kepemilikan === selectedOwnership || (selectedOwnership === "Dimiliki" && !asset.kepemilikan);
      return typeMatch && conditionMatch && ownershipMatch;
    });
  }, [selectedType, selectedCondition, selectedOwnership, mounted, assetRoster]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const paginatedAssets = filteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (loadingAssets || loadingStock) {
    return <div className="h-full w-full flex items-center justify-center"><div className="animate-pulse flex flex-col items-center gap-4"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div><p className="text-slate-500 font-medium">Loading Inventory Data...</p></div></div>;
  }

  return (

    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Asset Management</h2>
          <p className="text-lg font-medium text-slate-500 mt-2">Real-time tracking and health audit of ISP infrastructure hardware.</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-4 text-slate-400 hover:text-primary rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800"
          >
            <Search size={22} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="
              bg-primary 
              text-primary-foreground
              px-8 py-4 rounded-2xl font-black text-sm
              shadow-lg shadow-primary/20
              hover:opacity-95 transition-all
            "
          // className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:opacity-95 transition-all"
          >
            Register New Asset
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dynamicStats.map((stat, index) => {
          const Icon = IconMap[stat.trendIcon as keyof typeof IconMap] || Cpu;
          return (
            <motion.div
              key={stat.label}
              whileHover={{ y: -5 }}
              className={cn(
                "p-8 rounded-[2.5rem] border shadow-sm flex flex-col justify-between h-48 relative overflow-hidden group transition-all",
                stat.isAlert
                  ? "bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-900/50 hover:shadow-orange-500/10"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-primary/10 hover:border-primary/50"
              )}
            >
              {stat.isAlert && (
                <motion.div
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute top-6 right-6 w-3 h-3 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                />
              )}
              <div className="flex justify-between items-start gap-4">
                <div className={cn(
                  "p-3.5 rounded-2xl shrink-0",
                  stat.isAlert
                    ? "bg-orange-100 text-orange-600"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800/80 group-hover:bg-primary group-hover:text-white transition-all border border-slate-200/50 dark:border-slate-700/50"
                )}>
                  <Icon size={24} />
                </div>
                <span className={cn(
                  "text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider border transition-colors",
                  stat.isAlert
                    ? "bg-orange-50/50 text-orange-700 border-orange-200/50"
                    : "bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50 group-hover:border-primary/20"
                )}>
                  {stat.trend}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-4xl font-black text-slate-900 dark:text-slate-100 mt-1">{stat.value}</h3>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Assets Roster */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-10 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Asset Roster</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">Detailed list of managed network components.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none pr-12 shadow-sm"
              >
                <option value="All">All Types</option>
                <option value="Router">Routers</option>
                <option value="Switch">Switches</option>
                <option value="Server">Servers</option>
                <option value="Access Point">Access Points</option>
                <option value="OLT">OLT</option>
                <option value="ONT">ONT</option>
                <option value="ODP">ODP</option>
              </select>
              <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative group">
              <select
                value={selectedCondition}
                onChange={(e) => {
                  setSelectedCondition(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none pr-12 shadow-sm"
              >
                <option value="All">All Conditions</option>
                <option value="Good">Healthy</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Broken">Broken</option>
              </select>
              <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative group">
              <select
                value={selectedOwnership}
                onChange={(e) => {
                  setSelectedOwnership(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-6 py-3.5 text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none pr-12 shadow-sm"
              >
                <option value="All">Semua Kepemilikan</option>
                <option value="Dimiliki">Dimiliki</option>
                <option value="Telah Dijual">Telah Dijual</option>
              </select>
              <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Details</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Condition</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kepemilikan</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <AnimatePresence mode="wait">
                {paginatedAssets.map((asset) => {
                  const CondIcon = ConditionIcon[asset.condition as keyof typeof ConditionIcon] || AlertCircle;
                  return (
                    <motion.tr
                      key={asset.sn}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                            {asset.type === "Router" && <Router size={28} />}
                            {asset.type === "Switch" && <Box size={28} />}
                            {asset.type === "Core Switch" && <Box size={28} />}
                            {asset.type === "Server" && <Cpu size={28} />}
                            {asset.type === "Access Point" && <Wifi size={28} />}
                            {asset.type === "OLT" && <Cpu size={28} />}
                            {asset.type === "ONT" && <Smartphone size={28} />}
                            {asset.type === "ODP" && <Box size={28} />}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 dark:text-slate-100 text-lg">{asset.sn}</p>
                            <p className="text-[11px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">{asset.mac}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg uppercase tracking-wider">
                          {asset.type}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <div className={cn(
                          "flex items-center gap-2 text-[10px] font-black uppercase px-4 py-2 rounded-full w-fit",
                          asset.condition === "Good" ? "bg-green-100 text-green-700 shadow-sm shadow-green-100/50" :
                            asset.condition === "Maintenance" ? "bg-blue-100 text-blue-700 shadow-sm shadow-blue-100/50" :
                              asset.condition === "Warning" ? "bg-orange-100 text-orange-700 shadow-sm shadow-orange-100/50" :
                                "bg-red-100 text-red-700 shadow-sm shadow-red-100/50"
                        )}>
                          <CondIcon size={14} />
                          {asset.condition}
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-2">
                          {(asset.kepemilikan === "Dimiliki" || !asset.kepemilikan) ? (
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase px-4 py-2 rounded-full w-fit bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-100/50">
                              <ShieldCheck size={14} />
                              Dimiliki
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase px-4 py-2 rounded-full w-fit bg-red-100 text-red-700 shadow-sm shadow-red-100/50">
                              <ShieldX size={14} />
                              Telah Dijual
                            </div>
                          )}
                        </div>
                        {asset.tanggal_perubahan && (
                          <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400">
                            <Calendar size={10} />
                            {asset.tanggal_perubahan}
                          </div>
                        )}
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{asset.location}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">DC Zone 4</span>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <motion.button
                          whileHover={{ scale: 1.15, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          className="p-3 text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                          <MoreVertical size={24} />
                        </motion.button>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-10 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/30">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Showing <span className="text-slate-900 dark:text-slate-100">{paginatedAssets.length}</span> of <span className="text-slate-900 dark:text-slate-100">{filteredAssets.length}</span> assets
          </p>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl text-xs font-black text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-all border border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary/30"
            >
              Previous
            </motion.button>
            <div className="flex items-center gap-1.5">
              <input 
                type="text"
                key={`inv-page-${currentPage}`}
                defaultValue={currentPage}
                onBlur={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1 && val <= totalPages) handlePageChange(val);
                  else e.target.value = String(currentPage);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                className="w-10 h-10 text-center rounded-xl text-xs font-black bg-primary text-white shadow-lg shadow-primary/20 border-none outline-none"
              />
              <span className="text-xs font-black text-slate-400">/ {totalPages}</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-6 py-3 bg-primary text-white rounded-2xl text-xs font-black shadow-lg shadow-primary/20 disabled:opacity-30 transition-all"
            >
              Next
            </motion.button>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
