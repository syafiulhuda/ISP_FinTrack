import { m, AnimatePresence } from "framer-motion";
import { Asset } from "@/types";
import { 
  Wifi, 
  Router, 
  Box, 
  Cpu, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Wrench, 
  MapPin, 
  MoreVertical, 
  X,
  ChevronDown,
  ShieldCheck,
  ShieldX,
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const TABLE_SKELETON_ROWS = Array.from({ length: 10 });

const ConditionIcon = {
  "Good": CheckCircle2,
  "Maintenance": Wrench,
  "Broken": AlertCircle,
  "Warning": AlertCircle
};

// Paste MobileAssetCard here
function MobileAssetCard({
  asset,
  inventory,
  cn
}: {
  asset: Asset & { isStock?: boolean };
  inventory: any; // Keep as any if we don't have Inventory type handy here
  cn: (...args: string[]) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isResolvingThis, setIsResolvingThis] = useState(false);
  const [isStartingMaintenanceThis, setIsStartingMaintenanceThis] = useState(false);
  const [isDeployingThis, setIsDeployingThis] = useState(false);
  const [isDeletingThis, setIsDeletingThis] = useState(false);
  const [isSellingThis, setIsSellingThis] = useState(false);

  const [deployData, setDeployData] = useState({ warehouse: '', city: '', province: '', latitude: -6.2088, longitude: 106.8456 });
  const [techName, setTechName] = useState("");
  const [techDesc, setTechDesc] = useState("");
  const [techNameStart, setTechNameStart] = useState("");
  const [maintenanceReason, setMaintenanceReason] = useState("");
  const [localBuyerName, setLocalBuyerName] = useState("");
  const [localSellPrice, setLocalSellPrice] = useState("");
  const [localSellNotes, setLocalSellNotes] = useState("");

  const { 
    isTimLapangan, 
    handleUpdateCondition, 
    handleDeleteAsset, 
    handleDeploy, 
    handleStartMaintenance, 
    handleResolveMaintenance,
    handleSellAsset,
    setDeletingAssetSn,
    setIsDeleting,
    setDeployingAssetSn,
    setDeployData: setGlobalDeployData,
    setStartingAssetSn,
    setIsStartingMaintenance,
    setTechNameStart: setGlobalTechNameStart,
    setMaintenanceReason: setGlobalMaintenanceReason,
    setResolvingAssetSn,
    setIsResolving,
    setTechName: setGlobalTechName,
    setTechDesc: setGlobalTechDesc,
    setSellingAssetSn,
    setSellBuyerName: setGlobalSellBuyerName,
    setSellPrice: setGlobalSellPrice,
    setSellNotes: setGlobalSellNotes,
  } = inventory;

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
        "px-3 sm:px-4 py-4 sm:py-5 transition-all cursor-pointer relative overflow-hidden select-none border-b border-slate-100 dark:border-slate-800/50",
        isOpen ? "bg-slate-50/50 dark:bg-white/5" : "hover:bg-slate-50/30 dark:hover:bg-white/5"
      )}
    >
      <div className="flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Left Side: Avatar Icon */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
            {asset.type === "Router" && <Router className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
            {asset.type === "Switch" && <Box className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
            {asset.type === "Server" && <Cpu className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
            {asset.type === "Access Point" && <Wifi className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
            {asset.type === "OLT" && <Cpu className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
            {asset.type === "ONT" && <Smartphone className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
            {asset.type === "ODP" && <Box className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-black text-slate-900 dark:text-slate-100 text-xs md-phone:text-sm truncate">{asset.sn}</p>
              {!asset.isStock && asset.kepemilikan !== "Dijual" && asset.kepemilikan !== "Telah Dijual" && (
                <span className="bg-blue-100 text-blue-750 dark:bg-blue-900/30 dark:text-blue-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tight whitespace-nowrap shrink-0">
                  Deployed
                </span>
              )}
              {asset.isStock && (
                <span className="bg-amber-100 text-amber-750 dark:bg-amber-900/30 dark:text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tight whitespace-nowrap shrink-0">
                  Stock
                </span>
              )}
            </div>
            <p className="text-[9px] md-phone:text-xs font-bold text-slate-500 mt-0.5 uppercase tracking-tighter truncate">{asset.type} • {asset.mac}</p>
          </div>
        </div>

        {/* Right Side: Status Badge & Chevron */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
            <ChevronDown size={13} className={cn("transition-transform duration-200", isOpen ? "rotate-180" : "")} />
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
            className="overflow-hidden mt-3 flex flex-col gap-3 text-xs font-medium"
          >
            {/* Category & Ownership */}
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100 dark:border-slate-800/50 pt-1" onClick={e => e.stopPropagation()}>
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
              <div className="space-y-3">
                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block text-[9px]">Actions</span>
                
                {/* Normal Action Buttons */}
                {!isResolvingThis && !isStartingMaintenanceThis && !isDeployingThis && !isDeletingThis && !isSellingThis ? (
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
                            latitude: Number(asset.latitude) || -6.2088, 
                            longitude: Number(asset.longitude) || 106.8456 
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
                              setMaintenanceReason("");
                              setTechNameStart("");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl hover:opacity-90 transition-all font-black text-[10px] uppercase shadow-sm"
                          >
                            <Wrench size={12} />
                            <span>Maintenance</span>
                          </button>
                        )}
                      </>
                    )}

                    {!isTimLapangan && !asset.isStock && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSellingThis(true);
                          setLocalBuyerName("");
                          setLocalSellPrice("");
                          setLocalSellNotes("");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 rounded-xl hover:opacity-90 transition-all font-black text-[10px] uppercase shadow-sm ml-auto"
                      >
                        <DollarSign size={12} />
                        <span>Sell Asset</span>
                      </button>
                    )}
                  </div>
                ) : isDeployingThis ? (
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                    <p className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-primary">Deploy Details</p>
                    <input 
                      type="text" 
                      placeholder="Warehouse Name" 
                      className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 bg-white text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                      value={deployData.warehouse}
                      onChange={(e) => setDeployData({...deployData, warehouse: e.target.value})}
                    />
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="City" 
                        className="w-1/2 px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 bg-white text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                        value={deployData.city}
                        onChange={(e) => setDeployData({...deployData, city: e.target.value})}
                      />
                      <input 
                        type="text" 
                        placeholder="Province" 
                        className="w-1/2 px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 bg-white text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                        value={deployData.province}
                        onChange={(e) => setDeployData({...deployData, province: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => setIsDeployingThis(false)}
                        className="flex-1 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          setDeployingAssetSn(asset.sn);
                          setGlobalDeployData(deployData);
                          // We trigger the actual deploy after state updates, or we can just call handleDeploy directly
                          setTimeout(() => handleDeploy(asset.sn), 0);
                        }}
                        className="flex-1 py-2.5 text-[10px] font-black bg-primary text-white rounded-xl hover:opacity-90 shadow-lg shadow-primary/20 transition-all uppercase tracking-wider"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                ) : isStartingMaintenanceThis ? (
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                    <p className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-blue-500">Initiate Maintenance</p>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="Technician Name"
                        value={techNameStart}
                        onChange={(e) => setTechNameStart(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 bg-white text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold"
                      />
                      <textarea 
                        placeholder="Problem Description..."
                        rows={2}
                        value={maintenanceReason}
                        onChange={(e) => setMaintenanceReason(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 bg-white text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold resize-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => setIsStartingMaintenanceThis(false)}
                        className="flex-1 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          setStartingAssetSn(asset.sn);
                          setGlobalTechNameStart(techNameStart);
                          setGlobalMaintenanceReason(maintenanceReason);
                          setTimeout(handleStartMaintenance, 0);
                        }}
                        className="flex-1 py-2.5 text-[10px] font-black bg-blue-600 text-white rounded-xl hover:opacity-90 shadow-lg shadow-blue-500/20 transition-all uppercase tracking-wider"
                      >
                        Start
                      </button>
                    </div>
                  </div>
                ) : isResolvingThis ? (
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                    <p className="text-[10px] font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-emerald-500">Audit Resolution</p>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="Technician Name"
                        value={techName}
                        onChange={(e) => setTechName(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 bg-white text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold"
                      />
                      <textarea 
                        placeholder="Resolution details..."
                        rows={2}
                        value={techDesc}
                        onChange={(e) => setTechDesc(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 bg-white text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-bold resize-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => setIsResolvingThis(false)}
                        className="flex-1 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          setResolvingAssetSn(asset.sn);
                          setGlobalTechName(techName);
                          setGlobalTechDesc(techDesc);
                          setTimeout(handleResolveMaintenance, 0);
                        }}
                        className="flex-1 py-2.5 text-[10px] font-black bg-emerald-600 text-white rounded-xl hover:opacity-90 shadow-lg shadow-emerald-500/20 transition-all uppercase tracking-wider"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                ) : isDeletingThis ? (
                  <div className="space-y-3 bg-rose-50 dark:bg-rose-955/20 p-3 rounded-2xl border border-rose-100 dark:border-rose-900/30" onClick={e => e.stopPropagation()}>
                    <p className="text-[10px] font-black text-rose-600 dark:text-rose-455 uppercase tracking-tighter">Confirm Deletion</p>
                    <p className="text-xs text-rose-700/80 dark:text-rose-300 font-medium">Are you sure you want to permanently delete this asset?</p>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={() => setIsDeletingThis(false)}
                        className="flex-1 py-2.5 text-[10px] font-black text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl transition-all uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          setDeletingAssetSn(asset.sn);
                          setTimeout(() => handleDeleteAsset(), 0);
                        }}
                        className="flex-1 py-2.5 text-[10px] font-black bg-rose-600 text-white rounded-xl hover:opacity-90 shadow-lg shadow-rose-500/20 transition-all uppercase tracking-wider"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : isSellingThis ? (
                  <div className="space-y-3 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-2xl border border-amber-100 dark:border-amber-800/30" onClick={e => e.stopPropagation()}>
                    <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-tighter">Sell Asset</p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Buyer Name *"
                        value={localBuyerName}
                        onChange={(e) => setLocalBuyerName(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 bg-white text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Sale Price (Rp) *"
                        value={localSellPrice}
                        onChange={(e) => setLocalSellPrice(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 bg-white text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-bold"
                      />
                      <textarea
                        placeholder="Notes (optional)"
                        rows={2}
                        value={localSellNotes}
                        onChange={(e) => setLocalSellNotes(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs border border-slate-200 dark:border-slate-700 rounded-xl dark:bg-slate-900 bg-white text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-bold resize-none"
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setIsSellingThis(false)}
                        className="flex-1 py-2.5 text-[10px] font-black text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          setSellingAssetSn(asset.sn);
                          setGlobalSellBuyerName(localBuyerName);
                          setGlobalSellPrice(localSellPrice);
                          setGlobalSellNotes(localSellNotes);
                          setTimeout(handleSellAsset, 0);
                        }}
                        className="flex-1 py-2.5 text-[10px] font-black bg-amber-600 text-white rounded-xl hover:opacity-90 shadow-lg shadow-amber-500/20 transition-all uppercase tracking-wider"
                      >
                        Confirm Sale
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function InventoryTable({ inventory }: { inventory: any }) {
  const {
    paginatedAssets, isLoadingAll, isTimLapangan,
    currentPage, setCurrentPage, totalPages,
    selectedType, setSelectedType, selectedCondition, setSelectedCondition,
    uniqueTypes, uniqueConditions, handleResetFilters,
    activeActionMenu, setActiveActionMenu, actionMenuRef, mounted,
    isDeleting, setIsDeleting, deletingAssetSn, setDeletingAssetSn, handleDeleteAsset,
    deployingAssetSn, setDeployingAssetSn, deployData, setDeployData, handleDeploy,
    isStartingMaintenance, setIsStartingMaintenance, startingAssetSn, setStartingAssetSn, techNameStart, setTechNameStart, maintenanceReason, setMaintenanceReason, handleStartMaintenance,
    isResolving, setIsResolving, resolvingAssetSn, setResolvingAssetSn, techName, setTechName, techDesc, setTechDesc, handleResolveMaintenance,
    handleUpdateCondition,
    handleSellAsset, sellingAssetSn, setSellingAssetSn, isSelling, setIsSelling,
    sellBuyerName, setSellBuyerName, sellPrice, setSellPrice, sellNotes, setSellNotes
  } = inventory;

  return (
    <div className="w-full">
      {/* Mobile view omitted for brevity, mapping to MobileAssetCard */}
      <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {isLoadingAll ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[96px] bg-slate-50 dark:bg-slate-800/50 animate-pulse border-b border-slate-100 dark:border-slate-800/50" />
          ))
        ) : paginatedAssets.map((asset: Asset & { isStock?: boolean }) => (
          <MobileAssetCard key={asset.sn} asset={asset} inventory={inventory} cn={cn} />
        ))}
      </div>

      <div className="hidden lg:block overflow-x-auto min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-100 dark:border-slate-800">
              <th className="px-3 lg:px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Asset Details</th>
              <th className="px-3 lg:px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell whitespace-nowrap">Category</th>
              <th className="px-3 lg:px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Condition</th>
              <th className="px-3 lg:px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell whitespace-nowrap">Kepemilikan</th>
              <th className="px-3 lg:px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell whitespace-nowrap">Location</th>
              <th className="px-3 lg:px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <AnimatePresence mode="popLayout">
              {isLoadingAll ? (
                TABLE_SKELETON_ROWS.map((_, i) => (
                  <tr key={i} className="h-[96px] border-b border-slate-100 dark:border-slate-800 animate-pulse">
                    {/* Skeleton columns */}
                    <td className="px-3 lg:px-4 py-6"><div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl" /></td>
                    <td className="px-3 lg:px-4 py-6"><div className="w-16 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg" /></td>
                    <td className="px-3 lg:px-4 py-6"><div className="w-20 h-6 bg-slate-100 dark:bg-slate-800 rounded-full" /></td>
                    <td className="px-3 lg:px-4 py-6"><div className="w-20 h-6 bg-slate-100 dark:bg-slate-800 rounded-full" /></td>
                    <td className="px-3 lg:px-4 py-6"><div className="w-24 h-4 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                    <td className="px-3 lg:px-4 py-6 text-right"><div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full inline-block" /></td>
                  </tr>
                ))
              ) : paginatedAssets.map((asset: Asset & { isStock?: boolean }) => {
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
                    <td className="px-3 lg:px-4 py-6 max-w-[160px]">
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
                            <p className="font-black text-slate-900 dark:text-slate-100 text-sm md:text-base whitespace-nowrap" title={asset.sn}>{asset.sn}</p>
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
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter whitespace-nowrap hidden md:block" title={asset.mac ?? undefined}>{asset.mac}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 lg:px-4 py-6 hidden sm:table-cell">
                      <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg uppercase tracking-wider whitespace-nowrap">
                        {asset.type}
                      </span>
                    </td>
                    <td className="px-3 lg:px-4 py-6">
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
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 rounded-full w-fit whitespace-nowrap bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700">
                          SOLD
                        </div>
                      )}
                    </td>
                    <td className="px-3 lg:px-4 py-6 hidden md:table-cell">
                      {(asset.kepemilikan === "Dimiliki" || !asset.kepemilikan) ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 h-7 whitespace-nowrap">
                          <ShieldCheck size={12} />
                          Dimiliki
                        </span>
                      ) : asset.kepemilikan === "Sewa" ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-955/30 dark:text-blue-400 h-7 whitespace-nowrap">
                          <ShieldCheck size={12} />
                          Sewa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-955/30 dark:text-red-400 h-7 whitespace-nowrap">
                          <ShieldX size={12} />
                          Sold
                        </span>
                      )}
                    </td>
                    <td className="px-3 lg:px-4 py-6 hidden md:table-cell">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl mt-0.5 shrink-0">
                          <MapPin size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate" title={asset.location || "Warehouse Stock"}>
                            {asset.location || "Warehouse Stock"}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">ZONE 4 / {asset.type === 'OLT' ? 'CORE' : 'DIST'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 lg:px-4 py-6 text-right relative">
                      {asset.kepemilikan !== "Dijual" && asset.kepemilikan !== "Telah Dijual" && (
                        <div className="relative inline-block" ref={activeActionMenu === asset.sn ? actionMenuRef : null}>
                          <button
                            onClick={() => {
                              if (activeActionMenu === asset.sn) {
                                setActiveActionMenu(null);
                              } else {
                                setActiveActionMenu(asset.sn);
                              }
                            }}
                            className={cn(
                              "p-2 rounded-xl transition-all shadow-sm",
                              activeActionMenu === asset.sn 
                                ? "bg-primary text-white" 
                                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700"
                            )}
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {activeActionMenu === asset.sn && mounted && (
                            <div className="absolute right-0 top-12 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-200 dark:border-slate-800 z-50 overflow-hidden transform origin-top-right">
                              {/* Inline Forms and Action Menu Here */}
                              {isDeleting && deletingAssetSn === asset.sn ? (
                                <div className="space-y-4 p-4 text-center">
                                  <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <AlertCircle size={24} />
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 mb-1">Confirm Deletion</h4>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">Permanently delete asset <br/><strong className="text-rose-500">{asset.sn}</strong>?</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => setIsDeleting(false)}
                                      className="flex-1 py-2.5 text-[10px] font-bold text-slate-550 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      onClick={handleDeleteAsset}
                                      className="flex-1 py-2.5 text-[10px] font-bold bg-rose-600 text-white rounded-lg hover:opacity-90 shadow-lg shadow-rose-500/20 transition-all"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ) : deployingAssetSn === asset.sn ? (
                                <div className="space-y-2 p-3">
                                  <p className="text-[10px] font-black text-slate-400 uppercase px-1">Deploy Details</p>
                                  <input 
                                    type="text" 
                                    placeholder="Warehouse Name" 
                                    className="w-full px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-150 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={deployData.warehouse}
                                    onChange={(e) => setDeployData({...deployData, warehouse: e.target.value})}
                                  />
                                  <div className="flex gap-2">
                                    <input 
                                      type="text" 
                                      placeholder="City" 
                                      className="w-1/2 px-3 py-2 text-xs border rounded-xl dark:bg-slate-800 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-150 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                                      value={deployData.city}
                                      onChange={(e) => setDeployData({...deployData, city: e.target.value})}
                                    />
                                    <input 
                                      type="text" 
                                      placeholder="Province" 
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
                                <div className="space-y-4 p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-blue-500">Initiate Maintenance</h4>
                                    <button onClick={() => setIsStartingMaintenance(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                      <X size={14}/>
                                    </button>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Assigned Tech</label>
                                      <input 
                                        type="text" 
                                        placeholder="Technician Name"
                                        value={techNameStart}
                                        onChange={(e) => setTechNameStart(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-700 rounded-xl px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Problem Description</label>
                                      <textarea 
                                        placeholder="Describe the issue..."
                                        rows={2}
                                        value={maintenanceReason}
                                        onChange={(e) => setMaintenanceReason(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-700 rounded-xl px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
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
                                <div className="space-y-4 p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter text-emerald-500">Audit Resolution</h4>
                                    <button onClick={() => setIsResolving(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                      <X size={14}/>
                                    </button>
                                  </div>
                                  <div className="space-y-3">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Technician</label>
                                      <input 
                                        type="text" 
                                        placeholder="Name"
                                        value={techName}
                                        onChange={(e) => setTechName(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-700 rounded-xl px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Resolution Details</label>
                                      <textarea 
                                        placeholder="Resolution details..."
                                        rows={2}
                                        value={techDesc}
                                        onChange={(e) => setTechDesc(e.target.value)}
                                        className="w-full bg-white dark:bg-slate-700 rounded-xl px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
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
                                ) : isSelling && sellingAssetSn === asset.sn ? (
                                  <div className="space-y-3 p-3">
                                    <div className="flex justify-between items-center mb-2">
                                      <h4 className="text-xs font-black text-amber-600 uppercase tracking-tighter">Sell Asset</h4>
                                      <button onClick={() => setIsSelling(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                        <X size={14}/>
                                      </button>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Buyer Name *</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. PT. Mitra Jaringan"
                                          value={sellBuyerName}
                                          onChange={(e) => setSellBuyerName(e.target.value)}
                                          className="w-full bg-white dark:bg-slate-700 rounded-xl px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Sale Price (Rp) *</label>
                                        <input
                                          type="text"
                                          placeholder="e.g. 5000000"
                                          value={sellPrice}
                                          onChange={(e) => setSellPrice(e.target.value)}
                                          className="w-full bg-white dark:bg-slate-700 rounded-xl px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Notes</label>
                                        <textarea
                                          placeholder="Optional notes..."
                                          rows={2}
                                          value={sellNotes}
                                          onChange={(e) => setSellNotes(e.target.value)}
                                          className="w-full bg-white dark:bg-slate-700 rounded-xl px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-amber-500/20 transition-all resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                                        />
                                      </div>
                                      <div className="flex gap-2 pt-1">
                                        <button
                                          onClick={() => setIsSelling(false)}
                                          className="flex-1 py-2 text-[10px] font-bold text-slate-550 dark:text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          onClick={handleSellAsset}
                                          className="flex-1 py-2 text-[10px] font-bold bg-amber-600 text-white rounded-lg hover:opacity-90 shadow-lg shadow-amber-500/20 transition-all"
                                        >
                                          Confirm Sale
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                              ) : (
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
                                              onClick={() => {
                                                setResolvingAssetSn(asset.sn);
                                                setIsResolving(true);
                                                setTechName("");
                                                setTechDesc("");
                                              }} 
                                              className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center gap-3"
                                            >
                                              <CheckCircle2 size={14} className="text-emerald-500" /> Mark Healthy
                                            </button>
                                          )}
                                          {asset.condition === 'Good' && (
                                            <button 
                                              onClick={() => {
                                                setStartingAssetSn(asset.sn);
                                                setIsStartingMaintenance(true);
                                                setTechNameStart("");
                                                setMaintenanceReason("");
                                              }} 
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
                                              className="w-full text-left px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all flex items-center gap-3"
                                            >
                                              <AlertCircle size={14} className="text-rose-500" /> Delete Asset
                                            </button>
                                          )}
                                          {!isTimLapangan && (
                                            <button 
                                              onClick={() => {
                                                setSellingAssetSn(asset.sn);
                                                setIsSelling(true);
                                                setSellBuyerName("");
                                                setSellPrice("");
                                                setSellNotes("");
                                              }} 
                                              className="w-full text-left px-4 py-3 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all flex items-center gap-3"
                                            >
                                              <DollarSign size={14} className="text-amber-500" /> Sell Asset
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </m.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-3 sm:p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 rounded-b-[2.5rem]">
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:block w-1/3">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-2 sm:gap-2 w-full sm:w-auto justify-center sm:justify-end">
            <button 
              onClick={() => setCurrentPage((prev: number) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 shrink-0"
            >
              Prev
            </button>
            
            {/* Desktop Numbers */}
            <div className="hidden sm:flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum = currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i);
                if (pageNum <= 0 || pageNum > totalPages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                      currentPage === pageNum ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Mobile Compact Text */}
            <div className="flex sm:hidden items-center justify-center px-1">
               <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest bg-slate-200/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg">
                 {currentPage} / {totalPages}
               </span>
            </div>

            <button 
              onClick={() => setCurrentPage((prev: number) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 shrink-0"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
