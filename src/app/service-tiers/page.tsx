"use client";

import { motion } from "framer-motion";
import { 
  Wifi, 
  Zap, 
  Rocket, 
  Gamepad2,
  Search,
  MapPin,
  ChevronRight,
  User
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCustomers, getServiceTiers } from "@/actions/db";
import { cn } from "@/lib/utils";
import { useState } from "react";

const IconMap = {
  wifi: Wifi,
  speed: Zap,
  rocket: Rocket,
  gamepad: Gamepad2,
};

export default function ServiceTiersPage() {
  const { data: customerList = [], isLoading: loadingCustomers } = useQuery({ queryKey: ['customers'], queryFn: getCustomers });
  const { data: serviceTiers = [], isLoading: loadingTiers } = useQuery({ queryKey: ['serviceTiers'], queryFn: getServiceTiers });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const isSearching = searchQuery.trim().length > 0;

  if (loadingCustomers || loadingTiers) {
    return <div className="h-full w-full flex items-center justify-center"><div className="animate-pulse flex flex-col items-center gap-4"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div><p className="text-slate-500 font-medium">Loading Service Tiers Data...</p></div></div>;
  }

  const filteredCustomers = customerList.filter(cust => {
    const matchesSearch = 
      cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cust.service && cust.service.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === "All" || 
      (cust.status?.toLowerCase() === statusFilter.toLowerCase());

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  
  // Logic: If searching, show all. If not, paginate.
  const displayCustomers = isSearching 
    ? filteredCustomers 
    : filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Active Packages</h2>
          <p className="text-lg font-medium text-slate-500 mt-2">Manage broadband tiers and subscriber distribution.</p>
        </div>
      </div>

      {/* Bento Grid: Service Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {serviceTiers.map((tier, index) => {
          const Icon = IconMap[tier.icon as keyof typeof IconMap] || Wifi;
          const isFeatured = tier.type === "featured";
          const isPriority = tier.type === "priority";

          return (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-6 rounded-xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-sm border border-slate-200 dark:border-slate-800",
                isFeatured 
                  ? "bg-gradient-to-br from-primary to-blue-700 text-white shadow-blue-500/20" 
                  : "bg-white dark:bg-slate-900"
              )}
            >
              {isPriority && (
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-orange-600"></div>
              )}
              
              <div className="flex justify-between items-start mb-6">
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
                  isFeatured ? "bg-white/20 backdrop-blur-sm text-white" : 
                  isPriority ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-600"
                )}>
                  {tier.name}
                </div>
                <Icon size={20} className={cn(
                  isFeatured ? "text-white" : isPriority ? "text-orange-600" : "text-slate-400"
                )} />
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{tier.speed}</span>
                  <span className={cn("text-sm font-semibold", isFeatured ? "text-white/80" : "text-slate-400")}>{tier.unit}</span>
                </div>
                <p className={cn("text-sm mt-1", isFeatured ? "text-white/80" : "text-slate-500")}>{tier.price} / mo</p>
              </div>

              <div className="space-y-4 pt-4 relative">
                <div className={cn(
                  "absolute top-0 left-0 right-0 h-full -z-10 rounded-xl rounded-t-none",
                  isFeatured ? "bg-black/5" : "bg-slate-50 dark:bg-slate-800/50"
                )}></div>
                <div className="flex justify-between items-center text-sm">
                  <span className={cn(isFeatured ? "text-white/80" : "text-slate-500")}>FUP Limit</span>
                  <span className="font-semibold">{tier.fup}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className={cn(isFeatured ? "text-white/80" : "text-slate-500")}>Active Users</span>
                  <span className="font-semibold">
                    {customerList.filter(c => {
                      const service = c.service?.toLowerCase();
                      const tierName = tier.name.toLowerCase();
                      if (tierName === "gamers node") return service === "gamers";
                      return service === tierName;
                    }).length}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Customer List Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Customer Directory</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">Search and manage your active subscriber base.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-[160px] pl-4 pr-10 py-2.5 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none cursor-pointer shadow-sm"
              >
                <option value="All">All Subscribers</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </div>
            </div>
            
            <div className="relative w-full md:w-[320px] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search name, ID or city..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-xs font-medium focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        <div className="w-full overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="w-[120px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Status</th>
                  <th className="w-[130px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Subscriber</th>
                  <th className="w-[180px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Full Name</th>
                  <th className="w-[240px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Service Address</th>
                  <th className="w-[150px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Region</th>
                  <th className="w-[150px] px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">City/Regency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayCustomers.map((cust, idx) => (
                  <motion.tr 
                    key={cust.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all group"
                  >
                    <td className="px-6 py-5">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                        cust.status?.toLowerCase() === 'active' 
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 ring-1 ring-emerald-500/20" 
                          : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 ring-1 ring-rose-500/20"
                      )}>
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full animate-pulse",
                          cust.status?.toLowerCase() === 'active' ? "bg-emerald-500" : "bg-rose-500"
                        )}></div>
                        {cust.status || 'Active'}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 tracking-tight">{cust.id}</span>
                        <span className="text-[9px] font-bold text-primary uppercase tracking-tighter opacity-80">{cust.service || 'Standard'} Plan</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">{cust.name}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-1">{cust.address}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">{cust.village}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{cust.district}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{cust.city}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{cust.province}</span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {displayCustomers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No customers found matching your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination UI - Only visible when not searching or if search results should be paginated (but user asked for show-all when searching) */}
        {!isSearching && totalPages > 1 && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/30">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-900 dark:text-slate-100">{displayCustomers.length}</span> of <span className="text-slate-900 dark:text-slate-100">{filteredCustomers.length}</span> subscribers
            </p>
            <div className="flex gap-2">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
              >
                Previous
              </motion.button>
              <div className="flex items-center gap-1.5">
                <input 
                  type="text"
                  key={`st-page-${currentPage}`}
                  defaultValue={currentPage}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= totalPages) handlePageChange(val);
                    else e.target.value = String(currentPage);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                  className="w-10 h-10 text-center rounded-xl text-xs font-bold bg-primary text-white shadow-lg shadow-primary/20 border-none outline-none"
                />
                <span className="text-xs font-bold text-slate-400">/ {totalPages}</span>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/20 disabled:opacity-30 transition-all"
              >
                Next
              </motion.button>
            </div>
          </div>
        )}

        {isSearching && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
              Search results showing <span className="text-slate-900 dark:text-slate-100 font-black">{displayCustomers.length}</span> matches
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
