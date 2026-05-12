"use client";

import { useState, useEffect, useMemo } from "react";
import { m } from "framer-motion";
import { 
  Search, 
  Clock, 
  ShieldAlert, 
  ChevronRight,
  TrendingUp,
  CreditCard,
  Calendar,
  Crown
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCustomerAnalysis } from "@/actions/customers";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function CustomerAnalysisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchData() {
      const res = await getCustomerAnalysis();
      setData(res);
      setLoading(false);
    }
    fetchData();
  }, []);

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setCurrentPage(1);
  };

  const sortedAndFilteredData = useMemo(() => {
    return data.filter(c => {
      const matchesSearch = (c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             c.id?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => b.ltv - a.ltv); // Sort by Highest LTV
  }, [data, searchTerm, statusFilter]);

  const totalPages = Math.ceil(sortedAndFilteredData.length / itemsPerPage);
  
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredData.slice(start, start + itemsPerPage);
  }, [sortedAndFilteredData, currentPage]);

  const stats = useMemo(() => {
    if (data.length === 0) return { totalLtv: 0, avgHealth: 0, atRisk: 0 };
    const totalLtv = data.reduce((sum, c) => sum + c.ltv, 0);
    const avgHealth = Math.round(data.reduce((sum, c) => sum + c.healthScore, 0) / data.length);
    const atRisk = data.filter(c => c.healthScore < 50).length;
    return { totalLtv, avgHealth, atRisk };
  }, [data]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 50) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-rose-500 bg-rose-500/10 border-rose-500/20";
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 50) return "Stable";
    return "At Risk";
  };

  const formatCompactNumber = (number: number) => {
    if (number >= 1000000000) return `Rp ${(number / 1000000000).toFixed(3)} B`;
    if (number >= 1000000) return `Rp ${(number / 1000000).toFixed(3)} M`;
    if (number >= 1000) return `Rp ${(number / 1000).toFixed(3)} K`;
    return `Rp ${number.toFixed(0)}`;
  };

  return (
    <div className="space-y-8 p-2">
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">Analyzing Customer Behavior...</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Customer Analysis</h1>
              <p className="text-slate-500 font-medium mt-1">Advanced CRM & Lifetime Value Tracking</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Search customers..." 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full md:w-80 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-sm font-bold shadow-sm"
                />
              </div>
              
              <select 
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              <button 
                onClick={resetFilters}
                className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 rounded-2xl transition-all"
                title="Reset Filters"
              >
                <Clock size={20} className="rotate-180" />
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <m.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                  <TrendingUp size={24} />
                </div>
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Portfolio LTV</span>
              </div>
              <h3 className="text-2xl sm:text-3xl xl:text-4xl font-black text-slate-900 dark:text-white whitespace-nowrap tabular-nums">{formatCompactNumber(stats.totalLtv)}</h3>
              <p className="text-xs text-slate-400 mt-2 font-medium">Cumulative revenue from {data.length} customers</p>
            </m.div>

            <m.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                  <ShieldAlert size={24} />
                </div>
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Avg. Health Score</span>
              </div>
              <h3 className="text-2xl sm:text-3xl xl:text-4xl font-black text-slate-900 dark:text-white whitespace-nowrap">{stats.avgHealth}%</h3>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1.5 flex-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <m.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.avgHealth}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>
            </m.div>

            <m.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl">
                  <Clock size={24} />
                </div>
                <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Churn Risk High</span>
              </div>
              <h3 className="text-2xl sm:text-3xl xl:text-4xl font-black text-slate-900 dark:text-white whitespace-nowrap">{stats.atRisk}</h3>
              <p className="text-xs text-rose-500 mt-2 font-bold uppercase tracking-wider">Requires Immediate Attention</p>
            </m.div>
          </div>

          {/* Table */}
          <m.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800">
                    <th className="p-6 text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Customer Info</th>
                    <th className="p-6 text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Financial LTV</th>
                    <th className="p-6 text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Payment Perf.</th>
                    <th className="p-6 text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Health Score</th>
                    <th className="p-6 text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {paginatedData.map((customer, idx) => (
                    <m.tr 
                      key={customer.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group"
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 font-black text-sm">
                            {customer.id.substring(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-slate-900 dark:text-white text-sm">{customer.name}</p>
                              {customer.is_vip && <Crown size={14} className="text-amber-500 fill-amber-500/20" />}
                            </div>
                            <p className="text-xs font-bold text-slate-500 mt-0.5">{customer.id} • {customer.service}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-6">
                        <div className="space-y-1">
                          <p className="font-black text-slate-900 dark:text-white text-sm whitespace-nowrap tabular-nums">{formatCurrency(customer.ltv)}</p>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                            <CreditCard size={10} />
                            <span>{customer.txCount} Payments</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500">
                              {customer.paymentRatio === 0 ? "Perfect" : `${customer.paymentRatio.toFixed(0)}% Late`}
                            </div>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Calendar size={10} />
                            Last: {customer.lastPayment ? new Date(customer.lastPayment).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </td>

                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <m.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${customer.healthScore}%` }}
                              className={cn("h-full", 
                                customer.healthScore >= 80 ? "bg-emerald-500" : 
                                customer.healthScore >= 50 ? "bg-amber-500" : "bg-rose-500"
                              )}
                            />
                          </div>
                          <span className={cn(
                            "text-[10px] font-black px-2 py-0.5 rounded-md border whitespace-nowrap",
                            getHealthColor(customer.healthScore)
                          )}>
                            {customer.healthScore}% • {getHealthLabel(customer.healthScore)}
                          </span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="inline-block p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 rounded-2xl transition-all text-slate-400 group-hover:scale-110 shadow-sm"
                        >
                          <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </td>
                    </m.tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {sortedAndFilteredData.length > 0 && (
              <div className="p-4 tablet:p-6 border-t border-slate-100 dark:border-slate-800 flex flex-col lg-phone:flex-row items-center justify-center lg-phone:justify-between gap-4 bg-slate-50/30 dark:bg-white/5">
                <p className="text-[10px] lg-phone:text-xs font-bold text-slate-400 text-center lg-phone:text-left">
                  Showing <span className="text-slate-900 dark:text-white">{(currentPage-1)*itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(currentPage*itemsPerPage, sortedAndFilteredData.length)}</span> of <span className="text-slate-900 dark:text-white">{sortedAndFilteredData.length}</span> customers
                </p>
                <div className="flex flex-wrap justify-center items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-all"
                  >
                    Previous
                  </button>
                  <div className="flex flex-wrap justify-center items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum = currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i);
                      if (pageNum <= 0 || pageNum > totalPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                            currentPage === pageNum ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {sortedAndFilteredData.length === 0 && (
              <div className="p-20 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-400">
                  <Search size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">No results found</h3>
                <p className="text-slate-500 font-medium mt-1">Try adjusting your search or filters.</p>
              </div>
            )}
          </m.div>
        </>
      )}
    </div>
  );
}
