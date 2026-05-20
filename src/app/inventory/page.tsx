"use client";

import { m, AnimatePresence } from "framer-motion";
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
  Plus,
  MapPin
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAssetRoster, getStockAssets, getWarehouses, createAsset, deleteAsset, updateAssetCondition, deployAsset, startMaintenance } from "@/actions/assets";
import { Asset } from "@/types";
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
import { LoadingState } from "@/components/LoadingState";

const STATS_SKELETON_ITEMS = Array.from({ length: 7 });
const TABLE_SKELETON_ROWS = Array.from({ length: 10 });
const MOBILE_SKELETON_CARDS = Array.from({ length: 10 });

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

const ConditionLabelMap: Record<string, string> = {
  "Good": "Healthy",
  "Maintenance": "Maintenance",
  "Broken": "Broken",
  "Warning": "Warning"
};

function MobileAssetCard({
  asset,
  refetchAssets,
  refetchStock,
  cn
}: {
  asset: any;
  refetchAssets: () => void;
  refetchStock: () => void;
  cn: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isResolvingThis, setIsResolvingThis] = useState(false);
  const [isStartingMaintenanceThis, setIsStartingMaintenanceThis] = useState(false);
  const [isDeployingThis, setIsDeployingThis] = useState(false);
  const [isDeletingThis, setIsDeletingThis] = useState(false);

  const [deployData, setDeployData] = useState({ warehouse: '', city: '', province: '', latitude: -6.2088, longitude: 106.8456 });
  const [techName, setTechName] = useState("");
  const [techDesc, setTechDesc] = useState("");
  const [techNameStart, setTechNameStart] = useState("");
  const [maintenanceReason, setMaintenanceReason] = useState("");

  return (
    <div
      onClick={() => setIsOpen(!isOpen)}
      role="button"
      tabIndex={0}
      aria-expanded={isOpen}
      aria-label={`Asset ${asset.sn} details`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsOpen(!isOpen);
        }
      }}
      className={cn(
        "px-4 py-5 transition-all cursor-pointer relative overflow-hidden select-none border-b border-slate-100 dark:border-slate-800/50",
        isOpen ? "bg-slate-50/50 dark:bg-white/5" : "hover:bg-slate-50/30 dark:hover:bg-white/5"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left Side: Avatar Icon */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
            {asset.type === "Router" && <Router size={18} />}
            {asset.type === "Switch" && <Box size={18} />}
            {asset.type === "Server" && <Cpu size={18} />}
            {asset.type === "Access Point" && <Wifi size={18} />}
            {asset.type === "OLT" && <Cpu size={18} />}
            {asset.type === "ONT" && <Smartphone size={18} />}
            {asset.type === "ODP" && <Box size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0 w-full flex-wrap">
              <p className="font-black text-slate-900 dark:text-slate-100 text-xs md-phone:text-sm truncate">{asset.sn}</p>
              {!asset.isStock && asset.kepemilikan !== "Dijual" && asset.kepemilikan !== "Telah Dijual" && (
                <span className="bg-blue-100 text-blue-750 dark:bg-blue-900/30 dark:text-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tight whitespace-nowrap">
                  Deployed
                </span>
              )}
              {asset.isStock && (
                <span className="bg-amber-100 text-amber-750 dark:bg-amber-900/30 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tight whitespace-nowrap">
                  Stock
                </span>
              )}
            </div>
            <p className="text-[9px] md-phone:text-xs font-bold text-slate-500 mt-0.5 uppercase tracking-tighter truncate">{asset.type} • {asset.mac}</p>
          </div>
        </div>

        {/* Right Side: Status Badge & Chevron */}
        <div className="flex items-center gap-2 shrink-0">
          {(asset.kepemilikan !== "Dijual" && asset.kepemilikan !== "Telah Dijual") ? (
            <span className={cn(
              "text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-md border whitespace-nowrap uppercase",
              asset.condition === "Good" ? "bg-green-100 text-green-700 border-green-200/50" :
              asset.condition === "Maintenance" ? "bg-blue-100 text-blue-700 border-blue-200/50" :
              asset.condition === "Warning" ? "bg-orange-100 text-orange-700 border-orange-200/50" :
              "bg-red-105 text-red-705 border-red-200/50"
            )}>
              {asset.condition}
            </span>
          ) : (
            <span className="text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50 dark:bg-slate-900 whitespace-nowrap">
              SOLD
            </span>
          )}
          <div className="p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-slate-550 dark:text-slate-400">
            <ChevronDown size={13} className={cn("transition-transform duration-200", isOpen && "rotate-180")} />
          </div>
        </div>
      </div>

      {/* Accordion Detail Content */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mt-4 space-y-3.5 text-xs font-medium"
          >
            {/* Category & Ownership */}
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100 dark:border-slate-800/50 pt-2" onClick={e => e.stopPropagation()}>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block text-[9px] mb-1.5">Category</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-wider h-7">
                  {asset.type}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block text-[9px] mb-1.5 text-right">Kepemilikan</span>
                {(asset.kepemilikan === "Dimiliki" || !asset.kepemilikan) ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 h-7">
                    <ShieldCheck size={12} />
                    Dimiliki
                  </span>
                ) : asset.kepemilikan === "Sewa" ? (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-955/30 dark:text-blue-400 h-7">
                    <ShieldCheck size={12} />
                    Sewa
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-955/30 dark:text-red-400 h-7">
                    <ShieldX size={12} />
                    Sold
                  </span>
                )}
              </div>
            </div>

            {/* Location Details */}
            <div className="space-y-2 pb-3 border-b border-slate-100 dark:border-slate-800/50" onClick={e => e.stopPropagation()}>
              <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block text-[9px]">Location Detail</span>
              <div className="space-y-1 pl-2 border-l border-slate-200 dark:border-slate-700">
                <span className="text-[13px] font-black text-slate-900 dark:text-slate-100 block">
                  {asset.location || "Warehouse Stock"}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 block">
                  ZONE 4 / {asset.type === 'OLT' ? 'CORE' : 'DIST'}
                </span>
              </div>
            </div>

            {/* Action Buttons Block */}
            {(asset.kepemilikan !== "Dijual" && asset.kepemilikan !== "Telah Dijual") && (
              <div className="pt-3 mt-3 space-y-3">
                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block text-[9px]">Actions</span>
                
                {/* Normal Action Buttons */}
                {!isResolvingThis && !isStartingMaintenanceThis && !isDeployingThis && !isDeletingThis ? (
                  <div className="flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                    {asset.isStock ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDeployingThis(true);
                          setDeployData({ 
                            warehouse: asset.location || '', 
                            city: '', 
                            province: '', 
                            latitude: asset.latitude || -6.2088, 
                            longitude: asset.longitude || 106.8456 
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl hover:opacity-90 transition-all font-black text-[10px] uppercase shadow-sm"
                      >
                        <Wifi size={12} />
                        <span>Use Asset</span>
                      </button>
                    ) : (
                      <>
                        {asset.condition === 'Maintenance' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsResolvingThis(true);
                              setTechName("");
                              setTechDesc("");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl hover:opacity-90 transition-all font-black text-[10px] uppercase shadow-sm"
                          >
                            <CheckCircle2 size={12} />
                            <span>Mark Healthy</span>
                          </button>
                        )}
                        {asset.condition === 'Good' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsStartingMaintenanceThis(true);
                              setTechNameStart("");
                              setMaintenanceReason("");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl hover:opacity-90 transition-all font-black text-[10px] uppercase shadow-sm"
                          >
                            <Wrench size={12} />
                            <span>Maintenance</span>
                          </button>
                        )}
                      </>
                    )}
                    {asset.condition === 'Broken' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDeletingThis(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white rounded-xl hover:opacity-90 transition-all font-black text-[10px] uppercase shadow-sm"
                      >
                        <X size={12} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                ) : null}

                {/* Inline Deploy Form */}
                {isDeployingThis && (
                  <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                    <p className="text-[10px] font-black text-slate-450 uppercase">Deploy Asset Details</p>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="Warehouse Name" 
                        aria-label="Warehouse Name"
                        className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-850 dark:border-slate-700 bg-white dark:bg-slate-800"
                        value={deployData.warehouse}
                        onChange={(e) => setDeployData({...deployData, warehouse: e.target.value})}
                      />
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder="City" 
                          aria-label="City"
                          className="w-1/2 px-3 py-2 text-xs border rounded-xl dark:bg-slate-850 dark:border-slate-700 bg-white dark:bg-slate-800"
                          value={deployData.city}
                          onChange={(e) => setDeployData({...deployData, city: e.target.value})}
                        />
                        <input 
                          type="text" 
                          placeholder="Province" 
                          aria-label="Province"
                          className="w-1/2 px-3 py-2 text-xs border rounded-xl dark:bg-slate-855 dark:border-slate-700 bg-white dark:bg-slate-800"
                          value={deployData.province}
                          onChange={(e) => setDeployData({...deployData, province: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={() => setIsDeployingThis(false)}
                        className="flex-1 py-2 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-lg hover:opacity-90 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={async () => {
                          const fullLocation = `${deployData.warehouse}, ${deployData.city}, ${deployData.province}`;
                          const res = await deployAsset(asset.sn, { 
                            location: fullLocation, 
                            latitude: deployData.latitude || 0, 
                            longitude: deployData.longitude || 0 
                          });
                          if (res.success) {
                            toast.success("Asset deployed and moved to roster!");
                            setIsDeployingThis(false);
                            refetchAssets();
                            refetchStock();
                          } else {
                            toast.error("Failed to deploy asset.");
                          }
                        }}
                        className="flex-1 py-2 text-[10px] font-bold bg-primary text-white rounded-lg hover:opacity-90 shadow-lg shadow-primary/20 transition-all"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Resolve Maintenance Form */}
                {isResolvingThis && (
                  <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                    <p className="text-[10px] font-black text-slate-450 uppercase">Audit Resolution</p>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="Technician Name"
                        aria-label="Technician Name"
                        value={techName}
                        onChange={(e) => setTechName(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                      <textarea 
                        placeholder="Resolution details..."
                        aria-label="Resolution details"
                        rows={2}
                        value={techDesc}
                        onChange={(e) => setTechDesc(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={() => setIsResolvingThis(false)}
                        className="flex-1 py-2 text-[10px] font-bold text-slate-550 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg hover:opacity-90 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={async () => {
                          if (!techName || !techDesc) {
                            toast.error("Please fill in technician details.");
                            return;
                          }
                          if (!window.confirm(`Are you sure you want to mark asset ${asset.sn} as Healthy?`)) return;
                          const res = await resolveMaintenance(asset.sn, techName, techDesc);
                          if (res.success) {
                            toast.success("Maintenance resolved!");
                            setIsResolvingThis(false);
                            refetchAssets();
                            refetchStock();
                          } else {
                            toast.error("Failed to resolve.");
                          }
                        }}
                        className="flex-1 py-2 text-[10px] font-bold bg-emerald-600 text-white rounded-lg hover:opacity-90 shadow-lg shadow-emerald-500/20 transition-all"
                      >
                        Mark Healthy
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Initiate Maintenance Form */}
                {isStartingMaintenanceThis && (
                  <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                    <p className="text-[10px] font-black text-slate-450 uppercase">Initiate Maintenance</p>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="Technician Name"
                        aria-label="Technician Name"
                        value={techNameStart}
                        onChange={(e) => setTechNameStart(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold border-none outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                      />
                      <textarea 
                        placeholder="Describe the issue..."
                        aria-label="Describe the issue"
                        rows={2}
                        value={maintenanceReason}
                        onChange={(e) => setMaintenanceReason(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold border-none outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={() => setIsStartingMaintenanceThis(false)}
                        className="flex-1 py-2 text-[10px] font-bold text-slate-550 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg hover:opacity-90 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={async () => {
                          if (!techNameStart || !maintenanceReason) {
                            toast.error("Please fill in details.");
                            return;
                          }
                          if (!window.confirm(`Are you sure you want to move asset ${asset.sn} to Maintenance mode?`)) return;
                          const res = await startMaintenance(asset.sn, techNameStart, maintenanceReason);
                          if (res.success) {
                            toast.success("Asset moved to Maintenance!");
                            setIsStartingMaintenanceThis(false);
                            refetchAssets();
                            refetchStock();
                          } else {
                            toast.error("Failed to start maintenance.");
                          }
                        }}
                        className="flex-1 py-2 text-[10px] font-bold bg-blue-600 text-white rounded-lg hover:opacity-90 shadow-lg shadow-blue-500/20 transition-all"
                      >
                        Start
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Delete Form */}
                {isDeletingThis && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/30" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2 mb-2 text-rose-500">
                      <AlertCircle size={14} />
                      <span className="text-[10px] font-black uppercase tracking-tight">Confirm Delete</span>
                    </div>
                    <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                      Permanently remove asset <span className="font-bold text-slate-900 dark:text-white">{asset.sn}</span>?
                    </p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsDeletingThis(false)}
                        className="flex-1 py-2 text-[10px] font-bold text-slate-450 hover:text-slate-650 dark:hover:text-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={async () => {
                          const res = await deleteAsset(asset.sn);
                          if (res.success) {
                            toast.success("Asset deleted permanently.");
                            setIsDeletingThis(false);
                            refetchAssets();
                            refetchStock();
                          }
                        }}
                        className="flex-1 py-2 bg-rose-600 text-white rounded-lg text-[10px] font-black shadow-lg shadow-rose-500/20 hover:opacity-90 transition-all"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
  
  const [isStartingMaintenance, setIsStartingMaintenance] = useState(false);
  const [startingAssetSn, setStartingAssetSn] = useState<string | null>(null);
  const [maintenanceReason, setMaintenanceReason] = useState("");
  const [techNameStart, setTechNameStart] = useState("");
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingAssetSn, setDeletingAssetSn] = useState<string | null>(null);
  const [deployingAssetSn, setDeployingAssetSn] = useState<string | null>(null);
  const [deployData, setDeployData] = useState({ warehouse: '', city: '', province: '', latitude: -6.2088, longitude: 106.8456 });

  useEffect(() => {
    if (isRegisterModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isRegisterModalOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        // Jika ada form aksi yang aktif (Resolve, Maintenance, Delete, atau Deploy), jangan tutup dropdown
        if (isResolving || isStartingMaintenance || isDeleting || deployingAssetSn !== null) {
          return;
        }
        setActiveActionMenu(null);
        setIsResolving(false);
        setIsStartingMaintenance(false);
        setIsDeleting(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isResolving, isStartingMaintenance, isDeleting, deployingAssetSn]);

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

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    allAssets.forEach((a: any) => {
      if (a.type) types.add(a.type);
    });
    return Array.from(types).sort();
  }, [allAssets]);

  const uniqueConditions = useMemo(() => {
    const conditions = new Set<string>();
    allAssets.forEach((a: any) => {
      if (a.condition) conditions.add(a.condition);
    });
    return Array.from(conditions).sort();
  }, [allAssets]);

  const uniqueOwnerships = useMemo(() => {
    const ownerships = new Set<string>();
    allAssets.forEach((a: any) => {
      if (a.kepemilikan) {
        ownerships.add(a.kepemilikan);
      }
    });
    return Array.from(ownerships).sort();
  }, [allAssets]);

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
      
      const usageMatch = selectedUsage === "All" || (selectedUsage === "Stock" && !asset.is_used) || (selectedUsage === "Deployed" && asset.is_used);
      
      return typeMatch && conditionMatch && ownershipMatch && usageMatch;
    });
  }, [selectedType, selectedCondition, selectedOwnership, selectedUsage, mounted, allAssets]);

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const paginatedAssets = filteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


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
      setIsStartingMaintenance(false);
    } else if (condition === 'Maintenance') {
      setStartingAssetSn(sn);
      setIsStartingMaintenance(true);
      setIsResolving(false);
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

  const handleStartMaintenance = async () => {
    if (!startingAssetSn || !techNameStart || !maintenanceReason) {
      toast.error("Please fill in maintenance details.");
      return;
    }

    // User requested a pop-up confirmation
    if (!window.confirm(`Are you sure you want to move asset ${startingAssetSn} to Maintenance mode?`)) {
      return;
    }

    const res = await startMaintenance(startingAssetSn, techNameStart, maintenanceReason);
    if (res.success) {
      toast.success("Asset moved to Maintenance!");
      setIsStartingMaintenance(false);
      setActiveActionMenu(null);
      setStartingAssetSn(null);
      setTechNameStart("");
      setMaintenanceReason("");
      refetchAssets();
      refetchStock();
    } else {
      toast.error("Failed to start maintenance.");
    }
  };

  const handleResolveMaintenance = async () => {
    if (!resolvingAssetSn || !techName || !techDesc) {
      toast.error("Please fill in technician details.");
      return;
    }

    // User requested a pop-up confirmation
    if (!window.confirm(`Are you sure you want to mark asset ${resolvingAssetSn} as Healthy? This will set status to Online.`)) {
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

  const isLoadingAll = loadingAssets || loadingStock;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] p-4 md:p-6 pb-20 flex flex-col gap-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Asset Management</h1>
          <p className="text-lg font-medium text-slate-500 mt-2">Real-time tracking and health audit of ISP infrastructure hardware.</p>
        </div>
        <div className="flex items-center gap-3">
          <m.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsRegisterModalOpen(true)}
            aria-label="Register New Asset"
            className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:opacity-95 transition-all"
          >
            Register New Asset
          </m.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {isLoadingAll ? (
          STATS_SKELETON_ITEMS.map((_, i) => (
            <div key={i} className="min-h-[140px] tablet:h-28 lg:h-48 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl tablet:rounded-[2.5rem]" />
          ))
        ) : (
          dynamicStats.map((stat, index) => {
            const Icon = IconMap[stat.trendIcon as keyof typeof IconMap] || Cpu;
            return (
              <m.div
                key={stat.label}
                whileHover={{ y: -5 }}
                className={cn(
                  "p-4 lg-phone:p-5 tablet:p-6 lg:p-6 rounded-3xl tablet:rounded-[2.5rem] border shadow-sm flex flex-col tablet:flex-row lg:flex-col justify-between tablet:items-center lg:items-start lg:justify-between h-auto min-h-[140px] tablet:h-28 lg:h-48 relative overflow-hidden group transition-all",
                  stat.isAlert
                    ? "bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-900/50 hover:shadow-orange-500/10"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-primary/10 hover:border-primary/50"
                )}
              >
                {stat.isAlert && (
                  <m.div
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute top-4 right-4 w-3 h-3 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                  />
                )}
                
                {/* Left Side Group (Horizontal on Tablet, Stacked on Mobile/Desktop) */}
                <div className="flex flex-col tablet:flex-row lg:flex-col gap-3 tablet:gap-6 lg:gap-2 items-start tablet:items-center lg:items-start w-full tablet:w-auto">
                  <div className={cn(
                    "p-3.5 lg:p-2.5 rounded-2xl shrink-0",
                    stat.isAlert
                      ? "bg-orange-100 text-orange-600"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800/80 group-hover:bg-primary group-hover:text-white transition-all border border-slate-200/50 dark:border-slate-700/50"
                  )}>
                    <Icon size={24} />
                  </div>
                  
                  <div className="mt-1 tablet:mt-0">
                    <p className="text-[8px] lg-phone:text-[10px] font-bold text-slate-400 uppercase tracking-wider lg-phone:tracking-widest truncate">{stat.label}</p>
                    <h3 className="text-2xl lg-phone:text-3xl tablet:text-4xl font-black text-slate-900 dark:text-slate-100 mt-0.5 lg-phone:mt-1 leading-none">{stat.value}</h3>
                  </div>
                </div>

                {/* Right Side Group / Trend (Pushed to bottom on Mobile/Desktop, Right on Tablet) */}
                <div className="mt-3 tablet:mt-0 lg:mt-3 shrink-0">
                  <span className={cn(
                    "text-[8px] lg-phone:text-[10px] font-black px-2 lg-phone:px-3 py-1 lg-phone:py-1.5 rounded-lg lg-phone:rounded-xl uppercase tracking-wider border transition-colors whitespace-nowrap leading-tight block w-fit",
                    stat.isAlert
                      ? "bg-orange-50/50 text-orange-700 border-orange-200/50"
                      : "bg-slate-50/50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50 group-hover:border-primary/20"
                  )}>
                    {stat.trend}
                  </span>
                </div>
              </m.div>
            );
          })
        )}
      </div>

      {/* Assets Roster */}
      <m.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800"
      >
        <div className="p-6 md:p-8 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="shrink-0">
            <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Asset Roster</h3>
            <p className="text-[12px] font-medium text-slate-500 mt-0.5">Detailed list of managed network components.</p>
          </div>
          
          <div className="flex flex-row items-center gap-2 md:gap-3 w-full md:w-auto">
            <m.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleResetFilters}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary rounded-xl border border-slate-200 dark:border-slate-800 transition-all shadow-sm flex flex-row items-center justify-center gap-2 group shrink-0"
              title="Reset Filters"
            >
              <RotateCcw size={16} className="group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-widest">Reset</span>
            </m.button>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 flex-1 md:w-auto">
              <div className="relative group min-w-0">
                <select
                  aria-label="Filter by Type"
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-[10px] font-black text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none pr-10 shadow-sm"
                >
                  <option value="All">All Types</option>
                  {uniqueTypes.map((type) => (
                    <option key={type} value={type}>{type}s</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              
              <div className="relative group min-w-0">
                <select
                  aria-label="Filter by Condition"
                  value={selectedCondition}
                  onChange={(e) => {
                    setSelectedCondition(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-[10px] font-black text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none pr-10 shadow-sm"
                >
                  <option value="All">All Conditions</option>
                  {uniqueConditions.map((cond) => (
                    <option key={cond} value={cond}>{ConditionLabelMap[cond] || cond}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative group min-w-0">
                <select
                  aria-label="Filter by Status"
                  value={selectedUsage}
                  onChange={(e) => {
                    setSelectedUsage(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-[10px] font-black text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none pr-10 shadow-sm"
                >
                  <option value="All">All Status</option>
                  <option value="Stock">Stock</option>
                  <option value="Deployed">Deployed</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative group min-w-0">
                <select
                  aria-label="Filter by Ownership"
                  value={selectedOwnership}
                  onChange={(e) => {
                    setSelectedOwnership(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-3 py-2.5 text-[10px] font-black text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none pr-10 shadow-sm"
                >
                  <option value="All">Ownership</option>
                  {uniqueOwnerships.map((owner) => (
                    <option key={owner} value={owner}>
                      {owner === "Dimiliki" ? "Dimiliki" : owner === "Sewa" ? "Sewa" : owner === "Dijual" || owner === "Telah Dijual" ? "Sold" : owner}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto no-scrollbar min-h-[1020px] w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50">
                <th className="px-3 lg:px-4 xl:px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Asset Details</th>
                <th className="px-3 lg:px-4 xl:px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Category</th>
                <th className="px-3 lg:px-4 xl:px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Condition</th>
                <th className="px-3 lg:px-4 xl:px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Kepemilikan</th>
                <th className="px-3 lg:px-4 xl:px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Location</th>
                <th className="px-3 lg:px-4 xl:px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <AnimatePresence mode="popLayout">
                {isLoadingAll ? (
                  TABLE_SKELETON_ROWS.map((_, i) => (
                    <tr key={i} className="h-[96px] border-b border-slate-100 dark:border-slate-800 animate-pulse">
                      {/* Asset Details */}
                      <td className="px-3 lg:px-4 xl:px-6 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                          <div className="space-y-2">
                            <div className="w-28 h-4 bg-slate-100 dark:bg-slate-800 rounded" />
                            <div className="w-20 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
                          </div>
                        </div>
                      </td>
                      {/* Category */}
                      <td className="px-3 lg:px-4 xl:px-6 py-6 hidden sm:table-cell">
                        <div className="w-16 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg" />
                      </td>
                      {/* Condition */}
                      <td className="px-3 lg:px-4 xl:px-6 py-6">
                        <div className="w-20 h-6 bg-slate-100 dark:bg-slate-800 rounded-full" />
                      </td>
                      {/* Kepemilikan */}
                      <td className="px-3 lg:px-4 xl:px-6 py-6 hidden md:table-cell">
                        <div className="w-20 h-6 bg-slate-100 dark:bg-slate-800 rounded-full" />
                      </td>
                      {/* Location */}
                      <td className="px-3 lg:px-4 xl:px-6 py-6 hidden md:table-cell">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-xl mt-0.5" />
                          <div className="space-y-1.5 flex-1">
                            <div className="w-24 h-4 bg-slate-100 dark:bg-slate-800 rounded" />
                            <div className="w-16 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
                          </div>
                        </div>
                      </td>
                      {/* Action */}
                      <td className="px-3 lg:px-4 xl:px-6 py-6 text-right">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full inline-block" />
                      </td>
                    </tr>
                  ))
                ) : paginatedAssets.map((asset, index) => {
                  const CondIcon = ConditionIcon[asset.condition as keyof typeof ConditionIcon] || AlertCircle;
                  return (
                    <m.tr
                      key={asset.sn}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group relative"
                    >
                      <td className="px-3 lg:px-4 xl:px-6 py-6 max-w-[160px] lg:max-w-[200px]">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all shrink-0">
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
                              <p className="font-black text-slate-900 dark:text-slate-100 text-sm md:text-base truncate whitespace-nowrap" title={asset.sn}>{asset.sn}</p>
                              {!asset.isStock && asset.kepemilikan !== "Dijual" && asset.kepemilikan !== "Telah Dijual" && (
                                <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tight hidden sm:inline-block">
                                  Deployed
                                </span>
                              )}
                              {asset.isStock && (
                                <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tight hidden sm:inline-block">
                                  Stock
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter truncate whitespace-nowrap hidden md:block" title={asset.mac}>{asset.mac}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 lg:px-4 xl:px-6 py-6 hidden sm:table-cell">
                        <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap">
                          {asset.type}
                        </span>
                      </td>
                      <td className="px-3 lg:px-4 xl:px-6 py-6">
                        {(asset.kepemilikan !== "Dijual" && asset.kepemilikan !== "Telah Dijual") ? (
                          <div className={cn(
                            "flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 rounded-full w-fit whitespace-nowrap",
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
                      <td className="px-3 lg:px-4 xl:px-6 py-6 hidden md:table-cell">
                        <div className="flex items-center gap-2 whitespace-nowrap">
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
                      <td className="px-3 lg:px-4 xl:px-6 py-6 text-slate-900 dark:text-slate-100 hidden md:table-cell max-w-[180px] xl:max-w-[250px]">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0 mt-0.5 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                            <MapPin size={14} />
                          </div>
                          <div className="flex flex-col min-w-0 w-full overflow-hidden">
                            <span className="text-[13px] font-black text-slate-900 dark:text-slate-100 leading-tight truncate block" title={asset.location || "Warehouse"}>
                              {asset.location || "Warehouse"}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 flex items-center gap-1.5 whitespace-nowrap">
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                              ZONE 4 / {asset.type === 'OLT' ? 'CORE' : 'DIST'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 lg:px-4 xl:px-6 py-6 text-right relative">
                        {(asset.kepemilikan !== "Dijual" && asset.kepemilikan !== "Telah Dijual") ? (
                          <div ref={activeActionMenu === asset.sn ? actionMenuRef : null} className="inline-block">
                            {asset.condition !== 'Warning' && (
                              <m.button
                                aria-label="Action Menu"
                                whileHover={{ scale: 1.15, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setActiveActionMenu(activeActionMenu === asset.sn ? null : asset.sn)}
                                className="p-2 text-slate-300 hover:text-primary transition-colors"
                              >
                                <MoreVertical size={20} />
                              </m.button>
                            )}
                          
                          <AnimatePresence>
                            {activeActionMenu === asset.sn && (
                              <div className={cn(
                                "absolute right-0 z-50 flex gap-2",
                                (index >= Math.floor(paginatedAssets.length / 2) && paginatedAssets.length > 1) 
                                  ? "bottom-6 items-end" 
                                  : "top-6 items-start"
                              )}>
                                {/* The Action Menu itself */}                                  <m.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={cn(
                                      "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-2xl transition-all duration-350 text-left origin-right overflow-hidden",
                                      ((isStartingMaintenance && startingAssetSn === asset.sn) || (isResolving && resolvingAssetSn === asset.sn) || (isDeleting && deletingAssetSn === asset.sn) || deployingAssetSn === asset.sn)
                                        ? "w-80 p-5"
                                        : "w-48 p-2",
                                      (index >= Math.floor(paginatedAssets.length / 2) && paginatedAssets.length > 1) ? "bottom-full mb-2" : "top-full mt-1"
                                    )}
                                  >
                                    {/* 1. Confirm Delete Form */}
                                    {isDeleting && deletingAssetSn === asset.sn ? (
                                      <div className="p-2">
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
                                    ) : deployingAssetSn === asset.sn ? (
                                       /* 2. Deploy Form (Use Asset) */
                                       <div className="space-y-2 p-1">
                                         <p className="text-[10px] font-black text-slate-400 uppercase px-1">Deploy Details</p>
                                         <input 
                                           type="text" 
                                           placeholder="Warehouse Name" 
                                           aria-label="Warehouse Name"
                                           className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-150 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                           value={deployData.warehouse}
                                           onChange={(e) => setDeployData({...deployData, warehouse: e.target.value})}
                                         />
                                         <div className="flex gap-2">
                                           <input 
                                             type="text" 
                                             placeholder="City" 
                                             aria-label="City"
                                             className="w-1/2 px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-150 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                             value={deployData.city}
                                             onChange={(e) => setDeployData({...deployData, city: e.target.value})}
                                           />
                                           <input 
                                             type="text" 
                                             placeholder="Province" 
                                             aria-label="Province"
                                             className="w-1/2 px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-150 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                             value={deployData.province}
                                             onChange={(e) => setDeployData({...deployData, province: e.target.value})}
                                           />
                                         </div>
                                         <div className="flex gap-2 pt-1">
                                           <button 
                                             onClick={() => setDeployingAssetSn(null)}
                                             className="flex-1 py-2 text-[10px] font-bold text-slate-550 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
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
                                     ) : isStartingMaintenance && startingAssetSn === asset.sn ? (
                                       /* 3. Initiate Maintenance Form */
                                       <div className="space-y-4 p-1">
                                         <div className="flex justify-between items-center mb-2">
                                           <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-blue-500">Initiate Maintenance</h4>
                                           <button aria-label="Close Maintenance Modal" onClick={() => setIsStartingMaintenance(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                             <X size={14}/>
                                           </button>
                                         </div>
                                         <div className="space-y-3">
                                           <div className="space-y-1">
                                             <label htmlFor={`tech-start-${asset.sn}`} className="text-[9px] font-black uppercase text-slate-400 ml-1">Assigned Tech</label>
                                             <input 
                                               id={`tech-start-${asset.sn}`}
                                               type="text" 
                                               placeholder="Technician Name"
                                               value={techNameStart}
                                               onChange={(e) => setTechNameStart(e.target.value)}
                                               className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold border-none outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-slate-150"
                                             />
                                           </div>
                                           <div className="space-y-1">
                                             <label htmlFor={`reason-start-${asset.sn}`} className="text-[9px] font-black uppercase text-slate-400 ml-1">Problem Description</label>
                                             <textarea 
                                               id={`reason-start-${asset.sn}`}
                                               placeholder="Describe the issue..."
                                               rows={2}
                                               value={maintenanceReason}
                                               onChange={(e) => setMaintenanceReason(e.target.value)}
                                               className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold border-none outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-slate-900 dark:text-slate-150"
                                             />
                                           </div>
                                           <div className="flex gap-2 pt-1">
                                             <button 
                                               onClick={() => setIsStartingMaintenance(false)}
                                               className="flex-1 py-2 text-[10px] font-bold text-slate-550 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                             >
                                               Cancel
                                             </button>
                                             <button 
                                               onClick={handleStartMaintenance}
                                               className="flex-1 py-2 text-[10px] font-bold bg-blue-600 text-white rounded-lg hover:opacity-90 shadow-lg shadow-blue-500/20 transition-all"
                                             >
                                               Start
                                             </button>
                                           </div>
                                         </div>
                                       </div>
                                     ) : isResolving && resolvingAssetSn === asset.sn ? (
                                       /* 4. Audit Resolution Form */
                                       <div className="space-y-4 p-1">
                                         <div className="flex justify-between items-center mb-2">
                                           <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-emerald-500">Audit Resolution</h4>
                                           <button aria-label="Close Resolve Modal" onClick={() => setIsResolving(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                             <X size={14}/>
                                           </button>
                                         </div>
                                         <div className="space-y-3">
                                           <div className="space-y-1">
                                             <label htmlFor={`tech-resolve-${asset.sn}`} className="text-[9px] font-black uppercase text-slate-400 ml-1">Technician</label>
                                             <input 
                                               id={`tech-resolve-${asset.sn}`}
                                               type="text" 
                                               placeholder="Name"
                                               value={techName}
                                               onChange={(e) => setTechName(e.target.value)}
                                               className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-900 dark:text-slate-150"
                                             />
                                           </div>
                                           <div className="space-y-1">
                                             <label htmlFor={`desc-resolve-${asset.sn}`} className="text-[9px] font-black uppercase text-slate-400 ml-1">Resolution Details</label>
                                             <textarea 
                                               id={`desc-resolve-${asset.sn}`}
                                               placeholder="Resolution details..."
                                               rows={2}
                                               value={techDesc}
                                               onChange={(e) => setTechDesc(e.target.value)}
                                               className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none text-slate-900 dark:text-slate-150"
                                             />
                                           </div>
                                           <div className="flex gap-2 pt-1">
                                             <button 
                                               onClick={() => setIsResolving(false)}
                                               className="flex-1 py-2 text-[10px] font-bold text-slate-550 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                             >
                                               Cancel
                                             </button>
                                             <button 
                                               onClick={handleResolveMaintenance}
                                               className="flex-1 py-2 text-[10px] font-bold bg-emerald-600 text-white rounded-lg hover:opacity-90 shadow-lg shadow-emerald-500/20 transition-all"
                                             >
                                               Resolve
                                             </button>
                                           </div>
                                         </div>
                                       </div>
                                    ) : (
                                      /* 5. Actions Buttons List (Standard Dropdown Menu) */
                                      <div className="p-2 space-y-2">
                                        {asset.isStock ? (
                                          <>
                                            {asset.condition === 'Broken' ? (
                                              <button 
                                                onClick={() => {
                                                  setDeletingAssetSn(asset.sn);
                                                  setIsDeleting(true);
                                                }} 
                                                className="w-full text-left px-4 py-3 text-xs font-bold text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-xl transition-all flex items-center gap-3"
                                              >
                                                <X size={14} className="text-rose-500" /> Delete Asset
                                              </button>
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
                                          </>
                                        ) : (
                                          <>
                                            {(asset.kepemilikan === 'Dimiliki' || asset.kepemilikan === 'Sewa' || !asset.kepemilikan) && (
                                              <>
                                                {asset.condition === 'Maintenance' && (
                                                  <button 
                                                    onClick={() => handleUpdateCondition(asset.sn, 'Good')} 
                                                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-3"
                                                  >
                                                    <CheckCircle2 size={14} className="text-emerald-500" /> Mark Healthy
                                                  </button>
                                                )}
                                                {asset.condition === 'Good' && (
                                                  <button 
                                                    onClick={() => handleUpdateCondition(asset.sn, 'Maintenance')} 
                                                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-3"
                                                  >
                                                    <Wrench size={14} className="text-blue-500" /> Maintenance
                                                  </button>
                                                )}
                                                {asset.condition === 'Broken' && (
                                                  <button 
                                                    onClick={() => {
                                                      setDeletingAssetSn(asset.sn);
                                                      setIsDeleting(true);
                                                    }} 
                                                    className="w-full text-left px-4 py-3 text-xs font-bold text-rose-600 dark:text-rose-455 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-xl transition-all flex items-center gap-3"
                                                  >
                                                    <X size={14} className="text-rose-500" /> Delete Asset
                                                  </button>
                                                )}
                                              </>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </m.div>
                              </div>
                            )}
                          </AnimatePresence>
                        </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-300 italic pr-2">No Action</span>
                        )}
                      </td>
                    </m.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* MOBILE COLLAPSIBLE CARDS VIEW (hidden on desktop, block on mobile) */}
        <div className="md:hidden min-h-[852px]">
          {/* Mobile list header */}
          <div className="px-4 sm-phone:px-5 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/50 text-[10px] sm-phone:text-[11px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400 bg-slate-50/20 dark:bg-white/5">
            Asset Information
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {isLoadingAll ? (
              MOBILE_SKELETON_CARDS.map((_, i) => (
                <div key={i} className="px-4 py-5 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between gap-3 bg-white dark:bg-slate-900 h-[80.8px]">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="w-24 h-3 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                      <div className="w-32 h-2.5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-14 h-5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" />
                    <div className="w-7 h-7 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                  </div>
                </div>
              ))
            ) : paginatedAssets.length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-400">
                  <Search size={32} />
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">No results found</h2>
                <p className="text-slate-500 font-medium mt-1">Try adjusting your search or filters.</p>
              </div>
            ) : (
              paginatedAssets.map((asset, idx) => (
                <MobileAssetCard
                  key={asset.sn}
                  asset={asset}
                  refetchAssets={refetchAssets}
                  refetchStock={refetchStock}
                  cn={cn}
                />
              ))
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        {(filteredAssets.length > 0 || isLoadingAll) && (
          <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/30 dark:bg-white/5 min-h-[112px] sm:min-h-[96px]">
            {isLoadingAll ? (
              <>
                <div className="w-56 h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                <div className="flex items-center gap-2">
                  <div className="w-16 h-8 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
                  <div className="w-24 h-8 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
                  <div className="w-12 h-8 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-slate-400 text-center sm:text-left">
                  Showing <span className="text-slate-900 dark:text-white">{(currentPage-1)*itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(currentPage*itemsPerPage, filteredAssets.length)}</span> of <span className="text-slate-900 dark:text-white">{filteredAssets.length}</span> assets
                </p>
                <div className="flex flex-row items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 sm:px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum = currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i);
                      if (pageNum <= 0 || pageNum > totalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-[10px] sm:text-xs font-bold transition-all",
                            currentPage === pageNum ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 sm:px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </m.section>

      {/* Register Sidebar (Fixed Gap & Adaptive Height) */}
      <AnimatePresence>
        {isRegisterModalOpen && (
          <>
            {/* Backdrop Overlay */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRegisterModalOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[90]"
            />
            
            <div className="fixed top-0 right-0 z-[100] p-0 pointer-events-none w-full h-[100dvh] md:w-auto md:h-auto flex justify-end">
              <m.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative w-full h-[100dvh] md:max-w-md bg-white dark:bg-slate-900 md:h-fit md:max-h-screen shadow-[-20px_20px_60px_rgba(0,0,0,0.15)] rounded-none md:rounded-bl-[3.5rem] border-none md:border-l md:border-b border-slate-200 dark:border-slate-800 p-6 md:p-10 pointer-events-auto flex flex-col"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">Register Asset</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Add hardware to infrastructure.</p>
                  </div>
                  <m.button
                    aria-label="Close Modal"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    <X size={24} />
                  </m.button>
                </div>
                
                <form onSubmit={handleRegisterAsset} className="space-y-6 overflow-y-auto custom-scrollbar pr-2 flex-1">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="sn" className="text-[10px] font-black uppercase text-slate-400 px-1">Serial Number</label>
                      <input id="sn" required type="text" placeholder="SN-..." className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-primary/10 transition-all" value={newAsset.sn} onChange={e => setNewAsset({...newAsset, sn: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="mac" className="text-[10px] font-black uppercase text-slate-400 px-1">MAC Address</label>
                      <input id="mac" required type="text" placeholder="00:1A:..." className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-primary/10 transition-all" value={newAsset.mac} onChange={e => setNewAsset({...newAsset, mac: e.target.value})} />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="deviceType" className="text-[10px] font-black uppercase text-slate-400 px-1">Device Type</label>
                      <div className="relative">
                        <select id="deviceType" className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none" value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value})}>
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
                      <label htmlFor="location" className="text-[10px] font-black uppercase text-slate-400 px-1">Location / Warehouse</label>
                      <div className="relative">
                        <select 
                          id="location"
                          required
                          className="w-full bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none" 
                          value={newAsset.location} 
                          onChange={e => {
                            const wh = warehouses.find((w: any) => w.location === e.target.value);
                            if (wh) {
                              setNewAsset({
                                ...newAsset, 
                                location: wh.location,
                                latitude: Number(wh.latitude),
                                longitude: Number(wh.longitude)
                              });
                            }
                          }}
                        >
                          <option value="" disabled>Select Warehouse</option>
                          {warehouses.map((wh: any) => (
                            <option key={wh.id} value={wh.location}>
                              {wh.location} ({wh.city})
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
                    <button 
                      type="button" 
                      aria-label="Close Modal" 
                      onClick={() => setIsRegisterModalOpen(false)} 
                      className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-sm transition-all hover:bg-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </m.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
