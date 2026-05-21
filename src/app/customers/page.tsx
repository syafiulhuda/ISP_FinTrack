"use client";

import { useState, useEffect, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  Search,
  Clock,
  ShieldAlert,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  CreditCard,
  Calendar,
  Crown
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCustomerAnalysis } from "@/actions/customers";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { getAdminProfile } from "@/actions/admin";
import { cn } from "@/lib/utils";

function MobileCustomerCard({
  customer,
  idx,
  formatCurrency,
  getHealthColor,
  getHealthLabel,
  cn
}: {
  customer: any;
  idx: number;
  formatCurrency: any;
  getHealthColor: any;
  getHealthLabel: any;
  cn: any;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        "px-3 py-4 md-phone:p-5 transition-all cursor-pointer relative overflow-hidden select-none",
        isOpen ? "bg-slate-50/50 dark:bg-white/5" : "hover:bg-slate-50/30 dark:hover:bg-white/5"
      )}
    >
      <div className="flex items-center justify-between gap-2.5 md-phone:gap-3">
        {/* Left Side: Avatar & Name Info */}
        <div className="flex items-center gap-2 md-phone:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 md-phone:w-10 md-phone:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500 font-black text-[10px] md-phone:text-xs shrink-0">
            {customer.id.substring(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 min-w-0 w-full">
              <p className="font-black text-slate-900 dark:text-white text-xs md-phone:text-sm truncate">{customer.name}</p>
              {customer.is_vip && <Crown size={11} className="text-amber-550 dark:text-amber-500 fill-amber-500/20 shrink-0" />}
            </div>
            <p className="text-[9px] md-phone:text-xs font-bold text-slate-500 mt-0.5">{customer.id} • {customer.service}</p>
          </div>
        </div>

        {/* Right Side: Status Badge & Chevron */}
        <div className="flex items-center gap-1.5 md-phone:gap-2 shrink-0">
          <span className={cn(
            "text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 md-phone:px-2 rounded-md border whitespace-nowrap",
            getHealthColor(customer.healthScore)
          )}>
            {customer.healthScore}%<span className="hidden min-[450px]:inline"> • {getHealthLabel(customer.healthScore)}</span>
          </span>
          <div className="p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-all">
            {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
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
            {/* LTV & Payments */}
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100 dark:border-slate-800/50 pt-2">
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block text-[9px] mb-1">Financial LTV</span>
                <span className="font-black text-slate-850 dark:text-slate-200 tabular-nums">{formatCurrency(customer.ltv)}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block text-[9px] mb-1">Payments Count</span>
                <span className="font-bold text-slate-700 dark:text-slate-350">{customer.txCount} Payments</span>
              </div>
            </div>

            {/* Payment Ratio & Last Payment */}
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100 dark:border-slate-800/50">
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block text-[9px] mb-1">Late Payment Ratio</span>
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-650 dark:text-slate-300">
                  {Number(customer.paymentRatio || 0) === 0 ? "Perfect" : `${Number(customer.paymentRatio || 0).toFixed(0)}% Late`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block text-[9px] mb-1">Last Payment</span>
                <span className="text-slate-700 dark:text-slate-355">{customer.lastPayment ? new Date(customer.lastPayment).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>

            {/* Location Details (Province, City, District) */}
            <div className="space-y-2">
              <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block text-[9px]">Location Detail</span>
              <div className="space-y-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-450 dark:text-slate-400 font-bold">Province: </span>
                  <span className="text-slate-800 dark:text-slate-200">{customer.province || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-450 dark:text-slate-400 font-bold">City: </span>
                  <span className="text-slate-800 dark:text-slate-200">{customer.city || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-450 dark:text-slate-400 font-bold">District: </span>
                  <span className="text-slate-800 dark:text-slate-200">{customer.district || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* View Details Link */}
            <div className="pt-2 text-right">
              <Link
                href={`/customers/${customer.id}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 transition-all font-black text-[11px]"
              >
                <span>GO TO CUSTOMER 360</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CustomerAnalysisPage() {
  const router = useRouter();
  const { data: profile } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: getAdminProfile
  });
  const isTimLapangan = profile?.role === 'Tim Lapangan' || profile?.role === 'Pekerja';

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
    }).sort((a, b) => {
      // Prioritize VIP status first
      if (a.is_vip && !b.is_vip) return -1;
      if (!a.is_vip && b.is_vip) return 1;
      // Then sort by LTV descending
      return Number(b.ltv || 0) - Number(a.ltv || 0);
    });
  }, [data, searchTerm, statusFilter]);

  const totalPages = Math.ceil(sortedAndFilteredData.length / itemsPerPage);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredData.slice(start, start + itemsPerPage);
  }, [sortedAndFilteredData, currentPage]);

  const stats = useMemo(() => {
    if (data.length === 0) return { totalLtv: 0, avgHealth: 0, atRisk: 0 };
    const totalLtv = data.reduce((sum, c) => sum + Number(c.ltv || 0), 0);
    const avgHealth = Math.round(data.reduce((sum, c) => sum + Number(c.healthScore || 0), 0) / data.length);
    const atRisk = data.filter(c => Number(c.healthScore || 0) < 50).length;
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

  const formatCompactNumber = (input: number | string) => {
    const number = Number(input);
    if (isNaN(number)) return "Rp 0";
    if (number >= 1000000000) return `Rp ${(number / 1000000000).toFixed(3)} B`;
    if (number >= 1000000) return `Rp ${(number / 1000000).toFixed(3)} M`;
    if (number >= 1000) return `Rp ${(number / 1000).toFixed(3)} K`;
    return `Rp ${number.toFixed(0)}`;
  };

  return (
    <div className="pt-4 space-y-8 p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-wrap md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Customer Analysis</h1>
          <p className="text-slate-500 font-medium mt-1">Advanced CRM & Lifetime Value Tracking</p>
        </div>

        <div className="flex flex-col lg-phone:flex-row items-stretch lg-phone:items-center justify-between gap-2.5 w-full tablet:w-auto">
          <div className="relative group w-full lg-phone:flex-1 tablet:w-64 laptop:w-80 tablet:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none text-sm font-bold shadow-sm"
              aria-label="Search customers by name or ID"
            />
          </div>

          <div className="flex items-center justify-between lg-phone:justify-end gap-2 w-full lg-phone:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 lg-phone:flex-none px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none cursor-pointer lg-phone:min-w-[120px]"
              aria-label="Filter by customer status"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <button
              onClick={resetFilters}
              className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-indigo-500 rounded-2xl transition-all shrink-0 animate-pulse-subtle"
              title="Reset Filters"
              aria-label="Reset all search and status filters"
            >
              <Clock size={20} className="rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {!isTimLapangan && (
        <div className="grid grid-cols-1 tablet:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[200px] bg-slate-100 dark:bg-slate-800 animate-pulse rounded-[2.5rem] border border-slate-200 dark:border-slate-800" />
          ))
        ) : (
          <>
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
              <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-slate-900 dark:text-white whitespace-nowrap tabular-nums">{formatCompactNumber(stats.totalLtv)}</h2>
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
              <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-slate-900 dark:text-white whitespace-nowrap">{stats.avgHealth}%</h2>
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
              <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-slate-900 dark:text-white whitespace-nowrap">{stats.atRisk}</h2>
              <p className="text-xs text-rose-500 mt-2 font-bold uppercase tracking-wider">Requires Immediate Attention</p>
            </m.div>
          </>
        )}
      </div>
      )}

      {/* Table Section */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-full bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden relative min-h-[400px] flex flex-col justify-between"
      >
        <div>
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl w-full" />
              ))}
            </div>
          ) : sortedAndFilteredData.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-slate-400">
                <Search size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">No results found</h2>
              <p className="text-slate-500 font-medium mt-1">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (hidden on mobile, block on md and up) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <th className="px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Customer Info</th>
                      <th className="px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Financial LTV</th>
                      <th className="px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Payment Perf.</th>
                      <th className="px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Health Score</th>
                      <th className="hidden laptop:table-cell px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Province</th>
                      <th className="hidden laptop:table-cell px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">City</th>
                      <th className="hidden desktop:table-cell px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">District</th>
                      <th className="px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap text-right">Action</th>
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
                        <td className="px-4 py-5">
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

                        <td className="px-4 py-5">
                          <div className="space-y-1">
                            <p className="font-black text-slate-900 dark:text-white text-sm whitespace-nowrap tabular-nums">{formatCurrency(customer.ltv)}</p>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                              <CreditCard size={10} />
                              <span>{customer.txCount} Payments</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-500">
                                {Number(customer.paymentRatio || 0) === 0 ? "Perfect" : `${Number(customer.paymentRatio || 0).toFixed(0)}% Late`}
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                              <Calendar size={10} />
                              Last: {customer.lastPayment ? new Date(customer.lastPayment).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-5">
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

                        <td className="hidden laptop:table-cell px-4 py-5 font-bold text-slate-650 dark:text-slate-400 text-xs whitespace-nowrap">{customer.province || 'N/A'}</td>
                        <td className="hidden laptop:table-cell px-4 py-5 font-bold text-slate-650 dark:text-slate-400 text-xs whitespace-nowrap">{customer.city || 'N/A'}</td>
                        <td className="hidden desktop:table-cell px-4 py-5 font-bold text-slate-650 dark:text-slate-400 text-xs whitespace-nowrap">{customer.district || 'N/A'}</td>

                        <td className="px-4 py-5 text-right">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="inline-block p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 rounded-2xl transition-all text-slate-400 group-hover:scale-110 shadow-sm"
                            aria-label={`View details for customer ${customer.name}`}
                          >
                            <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" />
                          </Link>
                        </td>
                      </m.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE COLLAPSIBLE CARDS VIEW (hidden on desktop, block on mobile) */}
              <div className="md:hidden">
                {/* Mobile list header */}
                <div className="px-4 sm-phone:px-5 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/50 text-[10px] sm-phone:text-[11px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-400 bg-slate-50/20 dark:bg-white/5">
                  Customer Information
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {paginatedData.map((customer, idx) => (
                    <MobileCustomerCard
                      key={customer.id}
                      customer={customer}
                      idx={idx}
                      formatCurrency={formatCurrency}
                      getHealthColor={getHealthColor}
                      getHealthLabel={getHealthLabel}
                      cn={cn}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && sortedAndFilteredData.length > 0 && (
          <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/30 dark:bg-white/5">
            <p className="text-xs font-bold text-slate-400 text-center sm:text-left">
              Showing <span className="text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, sortedAndFilteredData.length)}</span> of <span className="text-slate-900 dark:text-white">{sortedAndFilteredData.length}</span> customers
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
          </div>
        )}
      </m.div>
    </div>
  );
}
