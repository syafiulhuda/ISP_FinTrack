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

import { Customer } from "@/types";

function MobileCustomerCard({
  customer,
  idx,
  formatCurrency,
  getHealthColor,
  getHealthLabel,
  cn
}: {
  customer: Customer;
  idx: number;
  formatCurrency: (val: number) => string;
  getHealthColor: (score: number) => string;
  getHealthLabel: (score: number) => string;
  cn: (...args: string[]) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      onClick={() => setIsOpen(!isOpen)}
      className={cn(
        "px-3 py-4 md-phone:p-5 transition-all cursor-pointer relative overflow-hidden select-none",
        isOpen ? "bg-muted/50 dark:bg-white/5" : "hover:bg-muted/30 dark:hover:bg-white/5"
      )}
    >
      <div className="flex items-center justify-between gap-2.5 md-phone:gap-3">
        {/* Left Side: Avatar & Name Info */}
        <div className="flex items-center gap-2 md-phone:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 md-phone:w-10 md-phone:h-10 rounded-xl bg-primary/10 dark:bg-primary/ flex items-center justify-center text-primary font-black text-[10px] md-phone:text-xs shrink-0">
            {customer.id.substring(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 min-w-0 w-full">
              <p className="font-black text-foreground text-xs md-phone:text-sm truncate">{customer.name}</p>
              {customer.is_vip && <Crown size={11} className="text-amber-550 dark:text-amber-500 fill-amber-500/20 shrink-0"/>}
            </div>
            <p className="text-[9px] md-phone:text-xs font-bold text-muted-foreground mt-0.5">{customer.id} • {customer.service}</p>
          </div>
        </div>

        {/* Right Side: Status Badge & Chevron */}
        <div className="flex items-center gap-1.5 md-phone:gap-2 shrink-0">
          <span className={cn(
            "text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 md-phone:px-2 rounded-md border whitespace-nowrap",
            getHealthColor(customer.healthScore || 0)
          )}>
            {customer.healthScore || 0}%<span className="hidden min-[450px]:inline"> • {getHealthLabel(customer.healthScore || 0)}</span>
          </span>
          <div className="p-1.5 bg-muted rounded-lg text-muted-foreground hover:text-primary dark:hover:text-primary transition-all">
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
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border pt-2">
              <div>
                <span className="text-muted-foreground font-bold uppercase tracking-wider block text-[9px] mb-1">Financial LTV</span>
                <span className="font-black text-slate-850 tabular-nums">{formatCurrency(customer.ltv || 0)}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold uppercase tracking-wider block text-[9px] mb-1">Payments Count</span>
                <span className="font-bold text-foreground dark:text-slate-350">{customer.txCount} Payments</span>
              </div>
            </div>

            {/* Payment Ratio & Last Payment */}
            <div className="grid grid-cols-2 gap-4 pb-3 border-b border-border">
              <div>
                <span className="text-muted-foreground font-bold uppercase tracking-wider block text-[9px] mb-1">Late Payment Ratio</span>
                <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-black text-slate-650">
                  {Number(customer.paymentRatio || 0) === 0 ? "Perfect" : `${Number(customer.paymentRatio || 0).toFixed(0)}% Late`}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground font-bold uppercase tracking-wider block text-[9px] mb-1">Last Payment</span>
                <span className="text-foreground dark:text-slate-355">{customer.lastPayment ? new Date(customer.lastPayment).toLocaleDateString() : 'N/A'}</span>
              </div>
            </div>

            {/* Location Details (Province, City, District) */}
            <div className="space-y-2">
              <span className="text-muted-foreground font-bold uppercase tracking-wider block text-[9px]">Location Detail</span>
              <div className="space-y-1.5 pl-2 border-l border-border">
                <div>
                  <span className="text-slate-450 font-bold">Province: </span>
                  <span className="text-foreground">{customer.province || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-450 font-bold">City: </span>
                  <span className="text-foreground">{customer.city || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-450 font-bold">District: </span>
                  <span className="text-foreground">{customer.district || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* View Details Link */}
            <div className="pt-2 text-right">
              <Link
                href={`/customers/${customer.id}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary/10 dark:bg-primary/ text-primary dark:text-primary rounded-xl hover:bg-primary/20 transition-all font-black text-[11px]"
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
          <h1 className="text-4xl font-black text-foreground tracking-tight">Customer Analysis</h1>
          <p className="text-muted-foreground font-medium mt-1">Advanced CRM & Lifetime Value Tracking</p>
        </div>

        <div className="flex flex-col lg-phone:flex-row items-stretch lg-phone:items-center justify-between gap-2.5 w-full tablet:w-auto">
          <div className="relative group w-full lg-phone:flex-1 tablet:w-64 laptop:w-80 tablet:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-12 pr-4 py-3 bg-card border border-border rounded-2xl w-full focus:ring-4 focus:ring-primary/10 focus:border-indigo-500 transition-all outline-none text-sm font-bold shadow-sm"
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
              className="flex-1 lg-phone:flex-none px-4 pr-10 py-3 bg-card border border-border rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 outline-none cursor-pointer lg-phone:min-w-[120px] appearance-none relative"
              aria-label="Filter by customer status"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5 7l5 5 5-5'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.75rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em'
              }}
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <button
              onClick={resetFilters}
              className="p-3 bg-muted text-muted-foreground hover:text-primary rounded-2xl transition-all shrink-0 animate-pulse-subtle"
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
              <div key={i} className="h-[200px] skeleton-theme rounded-[2.5rem] border border-border"/>
            ))
          ) : (
            <>
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl"/>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                    <TrendingUp size={24} />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Total Portfolio LTV</span>
                </div>
                <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-foreground whitespace-nowrap tabular-nums">{formatCompactNumber(stats.totalLtv)}</h2>
                <p className="text-xs text-muted-foreground mt-2 font-medium">Cumulative revenue from {data.length} customers</p>
              </m.div>

              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl"/>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                    <ShieldAlert size={24} />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Avg. Health Score</span>
                </div>
                <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-foreground whitespace-nowrap">{stats.avgHealth}%</h2>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
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
                className="bg-card p-8 rounded-[2.5rem] border border-border shadow-sm relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full -mr-16 -mt-16 blur-3xl"/>
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl">
                    <Clock size={24} />
                  </div>
                  <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Churn Risk High</span>
                </div>
                <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-foreground whitespace-nowrap">{stats.atRisk}</h2>
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
        className="w-full max-w-full bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden relative min-h-[400px] flex flex-col justify-between"
      >
        <div>
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 skeleton-theme rounded-2xl w-full"/>
              ))}
            </div>
          ) : sortedAndFilteredData.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-muted rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-muted-foreground">
                <Search size={32} />
              </div>
              <h2 className="text-xl font-black text-foreground">No results found</h2>
              <p className="text-muted-foreground font-medium mt-1">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW (hidden on mobile, block on md and up) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Customer Info</th>
                      <th className="px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Financial LTV</th>
                      <th className="px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Payment Perf.</th>
                      <th className="px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Health Score</th>
                      <th className="hidden laptop:table-cell px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Province</th>
                      <th className="hidden laptop:table-cell px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">City</th>
                      <th className="hidden desktop:table-cell px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">District</th>
                      <th className="px-4 py-5.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {paginatedData.map((customer, idx) => (
                      <m.tr
                        key={customer.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="hover:bg-muted/50 dark:hover:bg-white/5 transition-colors group"
                      >
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/ flex items-center justify-center text-primary font-black text-sm">
                              {customer.id.substring(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-foreground text-sm">{customer.name}</p>
                                {customer.is_vip && <Crown size={14} className="text-amber-500 fill-amber-500/20"/>}
                              </div>
                              <p className="text-xs font-bold text-muted-foreground mt-0.5">{customer.id} • {customer.service}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-5">
                          <div className="space-y-1">
                            <p className="font-black text-foreground text-sm whitespace-nowrap tabular-nums">{formatCurrency(customer.ltv)}</p>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                              <CreditCard size={10} />
                              <span>{customer.txCount} Payments</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-black text-muted-foreground">
                                {Number(customer.paymentRatio || 0) === 0 ? "Perfect" : `${Number(customer.paymentRatio || 0).toFixed(0)}% Late`}
                              </div>
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                              <Calendar size={10} />
                              Last: {customer.lastPayment ? new Date(customer.lastPayment).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
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

                        <td className="hidden laptop:table-cell px-4 py-5 font-bold text-slate-650 text-xs whitespace-nowrap">{customer.province || 'N/A'}</td>
                        <td className="hidden laptop:table-cell px-4 py-5 font-bold text-slate-650 text-xs whitespace-nowrap">{customer.city || 'N/A'}</td>
                        <td className="hidden desktop:table-cell px-4 py-5 font-bold text-slate-650 text-xs whitespace-nowrap">{customer.district || 'N/A'}</td>

                        <td className="px-4 py-5 text-right">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="inline-block p-3 bg-muted hover:bg-primary hover:text-white dark:hover:bg-primary rounded-2xl transition-all text-muted-foreground group-hover:scale-110 shadow-sm"
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
                <div className="px-4 sm-phone:px-5 pt-6 pb-4 border-b border-border text-[10px] sm-phone:text-[11px] font-black uppercase tracking-widest text-slate-450 bg-muted/20 dark:bg-white/5">
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
          <div className="p-3 sm:p-6 lg:p-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 bg-muted/30 dark:bg-white/5 rounded-b-[2.5rem]">
            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground text-center sm:text-left hidden sm:block">
              Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-foreground">{Math.min(currentPage * itemsPerPage, sortedAndFilteredData.length)}</span> of <span className="text-foreground">{sortedAndFilteredData.length}</span> customers
            </p>
            <div className="flex items-center gap-2 sm:gap-2 w-full sm:w-auto justify-center sm:justify-end">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl border border-border text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-muted transition-all text-muted-foreground shrink-0"
              >
                Previous
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
                        currentPage === pageNum ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground dark:hover:text-white"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Compact Text */}
              <div className="flex sm:hidden items-center justify-center px-1">
                 <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest bg-muted dark:bg-white/5 px-3 py-1.5 rounded-lg">
                   {currentPage} / {totalPages}
                 </span>
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl border border-border text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-muted transition-all text-muted-foreground shrink-0"
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
