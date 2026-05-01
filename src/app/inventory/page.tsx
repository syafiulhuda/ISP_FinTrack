"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Warehouse,
  Search,
  RotateCcw,
  Loader2,
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
  Calendar,
  X,
  Plus
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAssetRoster, getStockAssets, getWarehouses, createAsset, deleteAsset, updateAssetCondition, deployAsset } from "@/actions/db";
import { 
  getMapAssets, 
  addMapNode, 
  dispatchTechnician, 
  getMaintenanceHistory,
  resolveMaintenance
} from "@/actions/map";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";

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
  const { data: assetRoster = [], isLoading: loadingAssets, refetch: refetchAssets } = useQuery({ 
    queryKey: ['assetRoster'], 
    queryFn: getAssetRoster,
    refetchInterval: 60000
  });

  const { data: stockAssets = [], isLoading: loadingStock, refetch: refetchStock } = useQuery({ 
    queryKey: ['stockAssets'], 
    queryFn: getStockAssets,
    refetchInterval: 60000
  });
  
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: getWarehouses
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [selectedOwnership, setSelectedOwnership] = useState("All");
  const [selectedUsage, setSelectedUsage] = useState("All");
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const itemsPerPage = 10;

  // Form State
  const [newAsset, setNewAsset] = useState<{
    sn: string;
    mac: string;
    type: string;
    location: string;
    condition: string;
    kepemilikan: string;
    latitude?: number;
    longitude?: number;
  }>({
    sn: '', mac: '', type: 'Router', location: '', condition: 'Good', kepemilikan: 'Dimiliki'
  });

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [resolvingAssetSn, setResolvingAssetSn] = useState<string | null>(null);
  const [techName, setTechName] = useState("");
  const [techDesc, setTechDesc] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingAssetSn, setDeletingAssetSn] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActiveActionMenu(null);
        setIsResolving(false); // Reset resolving when clicking outside
        setIsDeleting(false); // Reset deleting when clicking outside
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dynamicStats = useMemo(() => {
    const total = assetRoster.length + stockAssets.length;
    const active = assetRoster.filter((a: any) => a.condition === "Good" && a.kepemilikan !== "Dijual" && a.kepemilikan !== "Telah Dijual").length;
    const faulty = assetRoster.filter((a: any) => (a.condition === "Broken" || a.condition === "Maintenance" || a.condition === "Warning") && a.kepemilikan !== "Dijual" && a.kepemilikan !== "Telah Dijual").length;
    const stock = stockAssets.length;
    const owned = assetRoster.filter((a: any) => a.kepemilikan === "Dimiliki" || !a.kepemilikan).length;
    const rented = assetRoster.filter((a: any) => a.kepemilikan === "Sewa").length;
    const sold = assetRoster.filter((a: any) => a.kepemilikan === "Dijual" || a.kepemilikan === "Telah Dijual").length;

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
        label: "Sewa",
        value: mounted ? rented.toLocaleString() : "---",
        trend: "Aset sewa",
        trendIcon: "check-circle",
        color: "bg-blue-500/10",
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

  const allAssets = useMemo(() => {
    const deployed = assetRoster.map((a: any) => ({ ...a, isStock: false, is_used: true }));
    const stock = stockAssets.map((a: any) => ({ ...a, isStock: true, is_used: !!a.is_used }));
    return [...deployed, ...stock];
  }, [assetRoster, stockAssets]);

  const filteredAssets = useMemo(() => {
    return allAssets.filter(asset => {
      const typeMatch = selectedType === "All" || asset.type === selectedType;
      const conditionMatch = selectedCondition === "All" || asset.condition === selectedCondition;
      const isSold = asset.kepemilikan === "Dijual" || asset.kepemilikan === "Telah Dijual";
      
      // Ownership logic: Sold assets only show when specifically filtered for "Sold"
      let ownershipMatch = false;
      if (selectedOwnership === "All") {
        ownershipMatch = !isSold; // Hidden by default in "All"
      } else if (selectedOwnership === "Dijual") {
        ownershipMatch = isSold; // Show ONLY sold assets
      } else {
        // Specific filters (Dimiliki, Sewa) - naturally shouldn't match sold anyway
        ownershipMatch = asset.kepemilikan === selectedOwnership || (selectedOwnership === "Dimiliki" && !asset.kepemilikan);
      }
      
      const usageMatch = selectedUsage === "All" || (selectedUsage === "Stock" && !asset.is_used) || (selectedUsage === "In Use" && asset.is_used);
      
      return typeMatch && conditionMatch && ownershipMatch && usageMatch;
    });
  }, [selectedType, selectedCondition, selectedOwnership, selectedUsage, mounted, allAssets]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const paginatedAssets = filteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleResetFilters = () => {
    setSelectedType("All");
    setSelectedCondition("All");
    setSelectedOwnership("All");
    setSelectedUsage("All");
    setCurrentPage(1);
  };

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createAsset(newAsset);
    if (res.success) {
      toast.success("Asset registered successfully!");
      setIsRegisterModalOpen(false);
      setNewAsset({ sn: '', mac: '', type: 'Router', location: '', condition: 'Good', kepemilikan: 'Dimiliki', latitude: undefined, longitude: undefined });
      refetchAssets();
      refetchStock();
    } else {
      toast.error("Failed to register asset.");
    }
  };

  const handleDeleteAsset = (sn: string) => {
    setDeletingAssetSn(sn);
    setIsDeleting(true);
  };

  const handleFinalDelete = async () => {
    if (!deletingAssetSn) return;
    const res = await deleteAsset(deletingAssetSn);
    if (res.success) {
      toast.success("Asset deleted permanently.");
      refetchAssets();
      refetchStock();
    }
    setIsDeleting(false);
    setDeletingAssetSn(null);
    setActiveActionMenu(null);
  };

  const [deployingAssetSn, setDeployingAssetSn] = useState<string | null>(null);
  const [deployData, setDeployData] = useState({ warehouse: '', city: '', province: '', latitude: -6.2088, longitude: 106.8456 });

  const handleDeploy = async (sn: string) => {
    const fullLocation = `${deployData.warehouse}, ${deployData.city}, ${deployData.province}`;
    const res = await deployAsset(sn, { 
      location: fullLocation, 
      latitude: deployData.latitude || 0, 
      longitude: deployData.longitude || 0 
    });
    if (res.success) {
      toast.success("Asset deployed and moved to roster!");
      setDeployingAssetSn(null);
      setActiveActionMenu(null);
      refetchAssets();
      refetchStock();
    } else {
      toast.error("Failed to deploy asset.");
    }
  };

  const handleUpdateCondition = async (sn: string, condition: string) => {
    if (condition === 'Good') {
      setResolvingAssetSn(sn);
      setIsResolving(true);
    } else {
      const res = await updateAssetCondition(sn, condition);
      if (res.success) {
        toast.success(`Asset marked as ${condition}`);
        refetchAssets();
        refetchStock();
      }
      setActiveActionMenu(null);
    }
  };

  const handleResolveMaintenance = async () => {
    if (!resolvingAssetSn || !techName || !techDesc) {
      toast.error("Please fill in technician details.");
      return;
    }
    const res = await resolveMaintenance(resolvingAssetSn, techName, techDesc);
    if (res.success) {
      toast.success("Maintenance resolved!");
      setIsResolving(false);
      setActiveActionMenu(null);
      setResolvingAssetSn(null);
      setTechName("");
      setTechDesc("");
      refetchAssets();
      refetchStock();
    } else {
      toast.error("Failed to resolve.");
    }
  };

  if (loadingAssets || loadingStock) {
    return <div className="h-full w-full flex items-center justify-center"><div className="animate-pulse flex flex-col items-center gap-4"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div><p className="text-slate-500 font-medium">Loading Inventory Data...</p></div></div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#0f172a] p-4 md:p-6 pb-20 flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Asset Management</h2>
          <p className="text-lg font-medium text-slate-500 mt-2">Real-time tracking and health audit of ISP infrastructure hardware.</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsRegisterModalOpen(true)}
            className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:opacity-95 transition-all"
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
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-6">
          <div className="shrink-0">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Asset Roster</h3>
            <p className="text-[12px] font-medium text-slate-500 mt-0.5">Detailed list of managed network components.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full 2xl:w-auto">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleResetFilters}
              className="w-full sm:w-auto p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary rounded-xl border border-slate-200 dark:border-slate-800 transition-all shadow-sm flex items-center justify-center gap-2 group shrink-0"
              title="Reset Filters"
            >
              <RotateCcw size={16} className="group-hover:text-primary transition-colors" />
              <span className="text-[9px] font-black uppercase tracking-widest">Reset</span>
            </motion.button>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full 2xl:w-auto">
              <div className="relative group min-w-0">
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-[10px] font-black text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none pr-8 shadow-sm"
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
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              
              <div className="relative group min-w-0">
                <select
                  value={selectedCondition}
                  onChange={(e) => {
                    setSelectedCondition(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-[10px] font-black text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none pr-8 shadow-sm"
                >
                  <option value="All">All Conditions</option>
                  <option value="Good">Healthy</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative group min-w-0">
                <select
                  value={selectedUsage}
                  onChange={(e) => {
                    setSelectedUsage(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-[10px] font-black text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none pr-8 shadow-sm"
                >
                  <option value="All">All Status</option>
                  <option value="Stock">Ready Stock</option>
                  <option value="In Use">In Use</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative group min-w-0">
                <select
                  value={selectedOwnership}
                  onChange={(e) => {
                    setSelectedOwnership(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-[10px] font-black text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none pr-8 shadow-sm"
                >
                  <option value="All">Ownership</option>
                  <option value="Dimiliki">Dimiliki</option>
                  <option value="Sewa">Sewa</option>
                  <option value="Dijual">Sold</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-visible min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Asset Details</th>
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Condition</th>
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Kepemilikan</th>
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <AnimatePresence mode="popLayout">
                {paginatedAssets.map((asset, index) => {
                  const CondIcon = ConditionIcon[asset.condition as keyof typeof ConditionIcon] || AlertCircle;
                  return (
                    <motion.tr
                      key={asset.sn}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group relative"
                    >
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all shrink-0">
                            {asset.type === "Router" && <Router size={24} />}
                            {asset.type === "Switch" && <Box size={24} />}
                            {asset.type === "Server" && <Cpu size={24} />}
                            {asset.type === "Access Point" && <Wifi size={24} />}
                            {asset.type === "OLT" && <Cpu size={24} />}
                            {asset.type === "ONT" && <Smartphone size={24} />}
                            {asset.type === "ODP" && <Box size={24} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-black text-slate-900 dark:text-slate-100 text-base truncate">{asset.sn}</p>
                              {!asset.isStock && asset.kepemilikan !== "Dijual" && asset.kepemilikan !== "Telah Dijual" && (
                                <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tight">
                                  Deployed
                                </span>
                              )}
                              {asset.isStock && (
                                <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tight">
                                  Stock
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter truncate">{asset.mac}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                          {asset.type}
                        </span>
                      </td>
                      <td className="px-6 py-6">
                        {(asset.kepemilikan !== "Dijual" && asset.kepemilikan !== "Telah Dijual") ? (
                          <div className={cn(
                            "flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 rounded-full w-fit",
                            asset.condition === "Good" ? "bg-green-100 text-green-700" :
                            asset.condition === "Maintenance" ? "bg-blue-100 text-blue-700" :
                            asset.condition === "Warning" ? "bg-orange-100 text-orange-700" :
                            "bg-red-100 text-red-700"
                          )}>
                            <CondIcon size={12} />
                            {asset.condition}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 italic">---</span>
                        )}
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          {(asset.kepemilikan === "Dimiliki" || !asset.kepemilikan) ? (
                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 rounded-full w-fit bg-emerald-100 text-emerald-700">
                              <ShieldCheck size={12} />
                              Dimiliki
                            </div>
                          ) : asset.kepemilikan === "Sewa" ? (
                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 rounded-full w-fit bg-blue-100 text-blue-700">
                              <ShieldCheck size={12} />
                              Sewa
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 rounded-full w-fit bg-red-100 text-red-700">
                              <ShieldX size={12} />
                              Sold
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex flex-col min-w-[120px]">
                          <span className="text-[13px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                            {asset.location ? (
                              <span className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse shrink-0" />
                                {asset.location}
                              </span>
                            ) : "Warehouse"}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5 bg-slate-50 dark:bg-slate-800/50 w-fit px-1.5 py-0.5 rounded-md">
                            ZONE 4 / {asset.type === 'OLT' ? 'CORE' : 'DIST'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right relative">
                        {(asset.kepemilikan !== "Dijual" && asset.kepemilikan !== "Telah Dijual") ? (
                          <div ref={activeActionMenu === asset.sn ? actionMenuRef : null} className="inline-block">
                            <motion.button
                              whileHover={{ scale: 1.15, rotate: 90 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setActiveActionMenu(activeActionMenu === asset.sn ? null : asset.sn)}
                              className="p-2 text-slate-300 hover:text-primary transition-colors"
                            >
                              <MoreVertical size={20} />
                            </motion.button>
                          
                          <AnimatePresence>
                            {activeActionMenu === asset.sn && (
                              <div className="absolute right-0 z-50 flex items-start gap-2">
                                {/* The Action Menu itself */}
                                {!isResolving && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={cn(
                                      "w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-2 text-left origin-right",
                                      (index >= Math.floor(paginatedAssets.length / 2) && paginatedAssets.length > 1) ? "bottom-full mb-2" : "top-full mt-1"
                                    )}
                                  >
                                    {!isDeleting ? (
                                      <>
                                        {asset.isStock ? (
                                          <div className="p-2 space-y-2">
                                            {deployingAssetSn === asset.sn ? (
                                              <div className="space-y-2 p-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase px-1">Deploy Details</p>
                                                <input 
                                                  type="text" 
                                                  placeholder="Warehouse Name" 
                                                  className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                                                  value={deployData.warehouse}
                                                  onChange={(e) => setDeployData({...deployData, warehouse: e.target.value})}
                                                />
                                                <div className="flex gap-2">
                                                  <input 
                                                    type="text" 
                                                    placeholder="City" 
                                                    className="w-1/2 px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                                                    value={deployData.city}
                                                    onChange={(e) => setDeployData({...deployData, city: e.target.value})}
                                                  />
                                                  <input 
                                                    type="text" 
                                                    placeholder="Province" 
                                                    className="w-1/2 px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700"
                                                    value={deployData.province}
                                                    onChange={(e) => setDeployData({...deployData, province: e.target.value})}
                                                  />
                                                </div>
                                                <div className="flex gap-2 pt-1">
                                                  <button 
                                                    onClick={() => setDeployingAssetSn(null)}
                                                    className="flex-1 py-2 text-[10px] font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                                  >
                                                    Cancel
                                                  </button>
                                                  <button 
                                                    onClick={() => handleDeploy(asset.sn)}
                                                    className="flex-1 py-2 text-[10px] font-bold bg-primary text-white rounded-lg hover:opacity-90 shadow-lg shadow-primary/20 transition-all"
                                                  >
                                                    Confirm
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <button 
                                                onClick={() => {
                                                  setDeployingAssetSn(asset.sn);
                                                  setDeployData({ 
                                                    warehouse: asset.location || '', 
                                                    city: '', 
                                                    province: '', 
                                                    latitude: asset.latitude || -6.2088, 
                                                    longitude: asset.longitude || 106.8456 
                                                  });
                                                }} 
                                                className="w-full text-left px-4 py-3 text-xs font-bold text-primary hover:bg-primary/5 rounded-xl transition-all flex items-center gap-3"
                                              >
                                                <Wifi size={14} /> Use Asset
                                              </button>
                                            )}
                                          </div>
                                        ) : (
                                          <>
                                            {(asset.kepemilikan === 'Dimiliki' || !asset.kepemilikan) && (
                                              <>
                                                {asset.condition === 'Maintenance' && (
                                                  <button onClick={() => handleUpdateCondition(asset.sn, 'Good')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-3">
                                                    <CheckCircle2 size={14} className="text-emerald-500" /> Mark Healthy
                                                  </button>
                                                )}
                                                {asset.condition === 'Good' && (
                                                  <button onClick={() => handleUpdateCondition(asset.sn, 'Maintenance')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-3">
                                                    <Wrench size={14} className="text-blue-500" /> Maintenance
                                                  </button>
                                                )}
                                                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                                              </>
                                            )}
                                            <button onClick={() => handleDeleteAsset(asset.sn)} className="w-full text-left px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all flex items-center gap-3">
                                              <AlertCircle size={14} /> Delete Asset
                                            </button>
                                          </>
                                        )}
                                      </>
                                    ) : (
                                      <div className="p-3">
                                        <div className="flex items-center gap-2 mb-3 text-rose-500">
                                          <AlertCircle size={16} />
                                          <span className="text-[10px] font-black uppercase tracking-tight">Confirm Delete</span>
                                        </div>
                                        <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                                          This action will permanently remove asset <span className="font-bold text-slate-900 dark:text-white">{asset.sn}</span>. This action cannot be undone.
                                        </p>
                                        <div className="flex flex-col gap-2">
                                          <button 
                                            onClick={handleFinalDelete}
                                            className="w-full py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-rose-500/20 hover:opacity-90 transition-all uppercase"
                                          >
                                            Delete Permanently
                                          </button>
                                          <button 
                                            onClick={() => setIsDeleting(false)}
                                            className="w-full py-2 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </motion.div>
                                )}

                                {/* Contextual Audit Form (anchored side-by-side) */}
                                {isResolving && resolvingAssetSn === asset.sn && (
                                  <motion.div
                                    initial={{ opacity: 0, x: 20, scale: 0.9 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 20, scale: 0.9 }}
                                    className={cn(
                                      "w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] p-6 text-left origin-right",
                                      (index >= Math.floor(paginatedAssets.length / 2) && paginatedAssets.length > 1) ? "bottom-0" : "top-0"
                                    )}
                                  >
                                    <div className="flex justify-between items-center mb-4">
                                      <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">Audit Resolution</h4>
                                      <button onClick={() => setIsResolving(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                        <X size={16}/>
                                      </button>
                                    </div>
                                    <div className="space-y-4">
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Technician</label>
                                        <input 
                                          type="text" 
                                          placeholder="Name"
                                          value={techName}
                                          onChange={(e) => setTechName(e.target.value)}
                                          className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Details</label>
                                        <textarea 
                                          placeholder="Resolution details..."
                                          rows={2}
                                          value={techDesc}
                                          onChange={(e) => setTechDesc(e.target.value)}
                                          className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                                        />
                                      </div>
                                      <button 
                                        onClick={handleResolveMaintenance}
                                        className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                                      >
                                        <CheckCircle2 size={14} /> Mark Healthy
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            )}
                          </AnimatePresence>
                        </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 italic pr-2">No Action</span>
                        )}
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
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl text-xs font-black text-slate-600 dark:text-slate-300 disabled:opacity-30 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">Previous</button>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-6 py-3 bg-primary text-white rounded-2xl text-xs font-black shadow-lg shadow-primary/20 disabled:opacity-30 transition-all">Next</button>
          </div>
        </div>
      </motion.section>

      {/* Register Sidebar (Fixed Gap & Adaptive Height) */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <div className="fixed top-0 right-0 z-[100] p-0 pointer-events-none">
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 h-fit max-h-screen shadow-[-20px_20px_60px_rgba(0,0,0,0.15)] rounded-bl-[3.5rem] border-l border-b border-slate-200 dark:border-slate-800 p-8 md:p-10 pointer-events-auto flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Register Asset</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Add hardware to infrastructure.</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-primary transition-colors"
                >
                  <X size={24} />
                </motion.button>
              </div>
              
              <form onSubmit={handleRegisterAsset} className="space-y-6 overflow-y-auto custom-scrollbar pr-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">Serial Number</label>
                    <input required type="text" placeholder="SN-..." className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-primary/10 transition-all" value={newAsset.sn} onChange={e => setNewAsset({...newAsset, sn: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">MAC Address</label>
                    <input required type="text" placeholder="00:1A:..." className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-primary/10 transition-all" value={newAsset.mac} onChange={e => setNewAsset({...newAsset, mac: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">Device Type</label>
                    <div className="relative">
                      <select className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none" value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value})}>
                        <option value="Router">Router</option>
                        <option value="Switch">Switch</option>
                        <option value="OLT">OLT</option>
                        <option value="ONT">ONT</option>
                        <option value="Server">Server</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">Location / Warehouse</label>
                    <div className="relative">
                      <select 
                        required
                        className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none" 
                        value={newAsset.location.split(',')[0]} 
                        onChange={e => {
                          const wh = warehouses.find((w: any) => w.warehouse_name === e.target.value);
                          if (wh) {
                            setNewAsset({
                              ...newAsset, 
                              location: wh.warehouse_name,
                              latitude: Number(wh.latitude),
                              longitude: Number(wh.longitude)
                            });
                          }
                        }}
                      >
                        <option value="" disabled>Select Warehouse</option>
                        {warehouses.map((wh: any) => (
                          <option key={wh.warehouse_name} value={wh.warehouse_name}>
                            {wh.warehouse_name} ({wh.city_name.trim()})
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                  <button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all hover:opacity-90 flex items-center justify-center gap-2">
                    <Plus size={18} /> Register Asset
                  </button>
                  <button type="button" onClick={() => setIsRegisterModalOpen(false)} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-sm transition-all hover:bg-slate-200">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
