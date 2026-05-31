"use client";

import Link from "next/link";
import { ChevronLeft, Box, Search, Filter, ChevronDown, RotateCcw } from "lucide-react";
import { useInventory } from "@/features/inventory/hooks/useInventory";
import { InventoryTable } from "@/features/inventory/components/InventoryTable";
import { InventoryModals } from "@/features/inventory/components/InventoryModals";
import { m } from "framer-motion";

export function InventoryAllClient() {
  const inventory = useInventory();

  const {
    selectedType, setSelectedType,
    selectedCondition, setSelectedCondition,
    selectedOwnership, setSelectedOwnership,
    selectedUsage, setSelectedUsage,
    uniqueTypes, uniqueConditions,
    handleResetFilters
  } = inventory;

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <Link href="/inventory" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ChevronLeft size={16} /> Back to Asset Management
        </Link>
        <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
            <Box size={24} />
          </div>
          Asset Roster History
        </h1>
        <p className="text-muted-foreground font-medium mt-2 max-w-2xl">
          Complete log of all network hardware assets. Browse, search, and manage your full inventory.
        </p>
      </div>

      <m.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-[2.5rem] shadow-sm border border-border"
      >
        <div className="p-4 md:p-6 lg:p-8 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 min-w-0 flex flex-col lg:flex-row items-center gap-2 lg:gap-1.5 w-full lg:w-auto">
            {/* Desktop Reset Button */}
            <m.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleResetFilters}
              className="hidden lg:flex px-3 py-2 bg-muted text-muted-foreground hover:text-primary rounded-xl border border-border transition-all shadow-sm flex-row items-center justify-center gap-1.5 group shrink-0"
              title="Reset Filters"
            >
              <RotateCcw size={14} className="group-hover:text-primary transition-colors shrink-0"/>
              <span className="text-[10px] font-black uppercase tracking-widest shrink-0">Reset</span>
            </m.button>

            <div className="w-full lg:w-auto flex-1 min-w-0 grid grid-cols-2 lg:flex lg:flex-row items-center gap-2 lg:gap-1.5">
              <div className="relative min-w-0 flex-1">
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    inventory.setCurrentPage(1);
                  }}
                  className="w-full bg-muted border-none rounded-xl pl-3 pr-6 py-2.5 text-[10px] font-black text-muted-foreground focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none shadow-sm cursor-pointer text-ellipsis"
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
                  value={selectedCondition}
                  onChange={(e) => {
                    setSelectedCondition(e.target.value);
                    inventory.setCurrentPage(1);
                  }}
                  className="w-full bg-muted border-none rounded-xl pl-3 pr-6 py-2.5 text-[10px] font-black text-muted-foreground focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none shadow-sm cursor-pointer text-ellipsis"
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
                  value={selectedOwnership}
                  onChange={(e) => {
                    setSelectedOwnership(e.target.value);
                    inventory.setCurrentPage(1);
                  }}
                  className="w-full bg-muted border-none rounded-xl pl-3 pr-6 py-2.5 text-[10px] font-black text-muted-foreground focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none shadow-sm cursor-pointer text-ellipsis"
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
                  value={selectedUsage}
                  onChange={(e) => {
                    setSelectedUsage(e.target.value);
                    inventory.setCurrentPage(1);
                  }}
                  className="w-full bg-muted border-none rounded-xl pl-3 pr-6 py-2.5 text-[10px] font-black text-muted-foreground focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none shadow-sm cursor-pointer text-ellipsis"
                >
                  <option value="All">All Usage</option>
                  <option value="Deployed">Deployed</option>
                  <option value="Stock">Warehouse Stock</option>
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-2 w-full lg:w-auto shrink-0 mt-1 lg:mt-0">
            {/* Mobile Reset Button */}
            <m.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleResetFilters}
              className="lg:hidden px-3 py-2.5 bg-muted text-muted-foreground hover:text-primary rounded-xl border border-border transition-all shadow-sm flex items-center justify-center gap-1.5 group shrink-0"
              title="Reset Filters"
            >
              <RotateCcw size={14} className="group-hover:text-primary transition-colors shrink-0"/>
              <span className="text-[10px] font-black uppercase tracking-widest shrink-0">Reset</span>
            </m.button>

            <span className="text-xs font-bold text-muted-foreground bg-muted px-4 py-2.5 rounded-full border border-border shadow-sm shrink-0">
              Showing {inventory.filteredAssets.length} assets
            </span>
          </div>
        </div>
        
        <InventoryTable inventory={inventory} />
      </m.section>

      <InventoryModals inventory={inventory} />
    </div>
  );
}
