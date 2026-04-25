"use client";

import { X, Search, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getCustomers } from "@/actions/db";

interface ProvinceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProvince: string;
  onSelect: (province: string) => void;
}

export function ProvinceSelectionModal({ 
  isOpen, 
  onClose, 
  selectedProvince, 
  onSelect 
}: ProvinceSelectionModalProps) {
  const { data: customerList = [] } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const [searchQuery, setSearchQuery] = useState("");

  const provinces = useMemo(() => [
    "All Regions",
    ...Array.from(new Set(customerList.map((c: any) => c.province))).sort()
  ], [customerList]);

  const filteredProvinces = useMemo(() => 
    provinces.filter((p: any) => 
      p.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery, provinces]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Lighter & Less intrusive for better UX */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/10 dark:bg-black/40 backdrop-blur-[2px]"
          />

          {/* Modal Container - Positioned higher for easier reach and less screen coverage */}
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-[400px] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-200/50 dark:shadow-black/50 flex flex-col max-h-[500px] overflow-hidden pointer-events-auto border border-slate-200 dark:border-slate-800"
            >
              {/* Header - Compact and modern */}
              <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Filter Region</h2>
                <button 
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search Bar - Streamlined */}
              <div className="px-6 pb-4 shrink-0">
                <div className="relative flex items-center">
                  <Search className="absolute left-4 text-slate-400" size={18} />
                  <input 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                    placeholder="Find a province..." 
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Scrollable List - Premium feel with subtle hover states */}
              <div className="px-3 pb-4 overflow-y-auto flex-1 custom-scrollbar">
                <div className="space-y-1">
                  {filteredProvinces.map((province) => {
                    const isSelected = province === selectedProvince;
                    return (
                      <button 
                        key={province}
                        onClick={() => {
                          onSelect(province);
                          onClose();
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all text-left group",
                          isSelected 
                            ? "bg-primary text-white shadow-lg shadow-primary/20" 
                            : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        <span className={cn(
                          "text-sm font-bold tracking-tight",
                          isSelected ? "text-white" : "group-hover:text-primary transition-colors"
                        )}>
                          {province}
                        </span>
                        {isSelected && <Check size={16} className="text-white" />}
                      </button>
                    );
                  })}
                  {filteredProvinces.length === 0 && (
                    <div className="py-10 text-center">
                      <p className="text-sm font-medium text-slate-400">No regions found matching "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Indicator */}
              <div className="h-4 w-full bg-gradient-to-t from-slate-50/50 dark:from-slate-800/20 to-transparent shrink-0" />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
