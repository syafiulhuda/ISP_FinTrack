"use client";

import { m } from"framer-motion";
import {
 RotateCcw,
 ChevronDown,
 Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

import { InventoryStats } from"@/features/inventory/components/InventoryStats";
import { InventoryTable } from"@/features/inventory/components/InventoryTable";
import { InventoryModals } from"@/features/inventory/components/InventoryModals";
import { useInventory } from"@/features/inventory/hooks/useInventory";

export default function InventoryPage() {
 const inventory = useInventory();

 const {
 isTimLapangan,
 isVisitor,
 selectedType, setSelectedType,
 selectedCondition, setSelectedCondition,
 selectedOwnership, setSelectedOwnership,
 selectedUsage, setSelectedUsage,
 uniqueTypes, uniqueConditions,
 handleResetFilters,
 setIsRegisterModalOpen
 } = inventory;

 return (
 <div className="p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto space-y-6 md:space-y-8 min-h-screen pt-6 lg:pt-8 bg-background">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
 <m.div
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 className="space-y-3"
 >
 <h1 className="text-4xl tablet:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-none">
 Asset<br />Management
 </h1>
 <p className="text-sm tablet:text-base font-medium text-muted-foreground max-w-sm tablet:max-w-md leading-relaxed">
 Real-time tracking and health audit of ISP infrastructure hardware.
 </p>
 </m.div>

 {(!isTimLapangan) && (
 <m.div
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 className="flex flex-wrap sm:flex-nowrap items-center shrink-0 w-full sm:w-auto mt-2 md:mt-0 gap-3"
 >
 <Link
 href="/inventory/all"
 className="w-full sm:w-auto px-5 py-3.5 bg-card border border-border text-foreground rounded-xl font-bold text-sm shadow-sm hover:bg-muted transition-all flex items-center justify-center whitespace-nowrap"
 >
 View All Assets
 </Link>
 <m.button
 whileHover={!isVisitor ? { scale: 1.02 } : {}}
 whileTap={!isVisitor ? { scale: 0.98 } : {}}
 onClick={() => !isVisitor && setIsRegisterModalOpen(true)}
 disabled={isVisitor}
 className={cn("w-full sm:w-auto px-5 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center whitespace-nowrap",
 isVisitor ? "opacity-50 cursor-not-allowed" : "hover:bg-primary"
 )}
 >
 Register New Asset
 </m.button>
 </m.div>
 )}
 </div>

 <InventoryStats isLoadingAll={inventory.isLoadingAll} dynamicStats={inventory.dynamicStats} />

 {/* Assets Roster */}
 <m.section
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.4 }}
 className="bg-card rounded-[2.5rem] shadow-sm border border-border"
 >
 <div className="p-4 md:p-6 lg:p-8 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 w-full min-w-0">
 
 {/* Title Area & Mobile Reset Button */}
 <div className="flex flex-row items-start justify-between w-full lg:w-auto shrink-0 gap-3">
 <div className="min-w-0">
 <h3 className="text-xl font-black text-foreground uppercase tracking-tight truncate">Asset Roster</h3>
 <p className="text-[11px] md:text-[12px] font-medium text-muted-foreground mt-0.5 leading-tight">Complete inventory ledger of all registered items.</p>
 </div>

 {/* Mobile Reset Button */}
 <m.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 onClick={handleResetFilters}
 className="lg:hidden px-3 py-2 bg-muted text-muted-foreground hover:text-primary rounded-xl border border-border transition-all shadow-sm flex flex-row items-center justify-center gap-1.5 group shrink-0"
 title="Reset Filters"
 >
 <RotateCcw size={14} className="group-hover:text-primary transition-colors shrink-0"/>
 <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline shrink-0">Reset</span>
 </m.button>
 </div>

 <div className="flex-1 min-w-0 flex flex-row items-center justify-end gap-1.5 lg:gap-2 w-full lg:w-auto">
 {/* Desktop Reset Button */}
 <m.button
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 onClick={handleResetFilters}
 className="hidden lg:flex px-3 py-2 bg-muted text-muted-foreground hover:text-primary rounded-xl border border-border transition-all shadow-sm flex flex-row items-center justify-center gap-1.5 group shrink-0"
 title="Reset Filters"
 >
 <RotateCcw size={14} className="group-hover:text-primary transition-colors shrink-0"/>
 <span className="text-[10px] font-black uppercase tracking-widest shrink-0">Reset</span>
 </m.button>

 {/* Filters (Grid on Mobile, Flex on Desktop) */}
 <div className="w-full lg:w-auto flex-1 min-w-0 grid grid-cols-2 lg:flex lg:flex-row items-center gap-2 lg:gap-1.5">
 <div className="relative min-w-0 flex-1">
 <select
 aria-label="Filter by Type"
 value={selectedType}
 onChange={(e) => {
 setSelectedType(e.target.value);
 inventory.setCurrentPage(1);
 }}
 className="w-full bg-muted border-none rounded-xl pl-3 pr-6 py-2 text-[10px] font-black text-muted-foreground focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none shadow-sm cursor-pointer text-ellipsis"
 >
 <option value="All">All Types</option>
 {uniqueTypes.map((type: string) => (
 <option key={type} value={type}>{type}s</option>
 ))}
 </select>
 <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
 </div>

 <div className="relative min-w-0 flex-1">
 <select
 aria-label="Filter by Condition"
 value={selectedCondition}
 onChange={(e) => {
 setSelectedCondition(e.target.value);
 inventory.setCurrentPage(1);
 }}
 className="w-full bg-muted border-none rounded-xl pl-3 pr-6 py-2 text-[10px] font-black text-muted-foreground focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none shadow-sm cursor-pointer text-ellipsis"
 >
 <option value="All">All Conditions</option>
 {uniqueConditions.map((cond: string) => (
 <option key={cond} value={cond}>{cond}</option>
 ))}
 </select>
 <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
 </div>

 <div className="relative min-w-0 flex-1">
 <select
 aria-label="Filter by Ownership"
 value={selectedOwnership}
 onChange={(e) => {
 setSelectedOwnership(e.target.value);
 inventory.setCurrentPage(1);
 }}
 className="w-full bg-muted border-none rounded-xl pl-3 pr-6 py-2 text-[10px] font-black text-muted-foreground focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none shadow-sm cursor-pointer text-ellipsis"
 >
 <option value="All">All Ownership</option>
 <option value="Dimiliki">Dimiliki</option>
 <option value="Sewa">Sewa</option>
 <option value="Dijual">Sold / Archive</option>
 </select>
 <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
 </div>

 <div className="relative min-w-0 flex-1">
 <select
 aria-label="Filter by Usage"
 value={selectedUsage}
 onChange={(e) => {
 setSelectedUsage(e.target.value);
 inventory.setCurrentPage(1);
 }}
 className="w-full bg-muted border-none rounded-xl pl-3 pr-6 py-2 text-[10px] font-black text-muted-foreground focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none shadow-sm cursor-pointer text-ellipsis"
 >
 <option value="All">All Usage</option>
 <option value="Deployed">Deployed</option>
 <option value="Stock">Warehouse Stock</option>
 </select>
 <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
 </div>
 </div>
 </div>
 </div>

 <InventoryTable inventory={inventory} />
 </m.section>

 <InventoryModals inventory={inventory} />
 </div>
 );
}
