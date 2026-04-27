"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Wifi, 
  Zap, 
  Rocket, 
  Gamepad2,
  Search,
  MapPin,
  ChevronRight,
  User,
  Plus,
  X,
  CheckCircle2,
  ChevronDown,
  Phone,
  RefreshCw,
  AlertTriangle,
  ZapOff
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCustomers, getServiceTiers, createCustomer, auditCustomerGracePeriod } from "@/actions/db";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const IconMap = {
  wifi: Wifi,
  speed: Zap,
  rocket: Rocket,
  gamepad: Gamepad2,
};

export default function ServiceTiersPage() {
  const { data: customerList = [], isLoading: loadingCustomers, refetch: refetchCustomers, isRefetching } = useQuery({ 
    queryKey: ['customers'], 
    queryFn: getCustomers,
    staleTime: 0
  });
  const { data: serviceTiers = [], isLoading: loadingTiers } = useQuery({ queryKey: ['serviceTiers'], queryFn: getServiceTiers });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const isSearching = searchQuery.trim().length > 0;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    no_telp: '',
    service: 'Basic',
    province: '',
    city: '',
    district: '',
    village: '',
    address: ''
  });

  const [isAuditing, setIsAuditing] = useState(false);
  const [showAuditConfirm, setShowAuditConfirm] = useState(false);

  const handleRunAudit = async () => {
    setShowAuditConfirm(false);
    setIsAuditing(true);
    const res = await auditCustomerGracePeriod();
    if (res.success) {
      const count = res.count ?? 0;
      if (count > 0) {
        toast.success(`Audit complete! ${count} customers suspended.`);
      } else {
        toast.info("Audit complete. No customers were due for suspension today.");
      }
      refetchCustomers();
    } else {
      toast.error("Audit failed.");
    }
    setIsAuditing(false);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createCustomer(newCustomer);
    if (res?.success) {
      toast.success(`Customer ${res.id} registered!`);
      setIsAddModalOpen(false);
      setNewCustomer({ name: '', no_telp: '', service: 'Basic', province: '', city: '', district: '', village: '', address: '' });
      refetchCustomers();
    } else {
      toast.error(res?.error || "Failed to register customer.");
    }
  };

  // 1. Memoize filtered list - MUST be before any conditional returns
  const filteredCustomers = useMemo(() => {
    return customerList.filter(cust => {
      const matchesSearch = 
        cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cust.service && cust.service.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = 
        statusFilter === "All" || 
        (statusFilter === "grace" && cust.is_grace_period) ||
        (cust.status?.toLowerCase() === statusFilter.toLowerCase());

      return matchesSearch && matchesStatus;
    });
  }, [customerList, searchQuery, statusFilter]);

  // 2. Memoize tier counts - MUST be before any conditional returns
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    serviceTiers.forEach(tier => {
      counts[tier.name] = customerList.filter(c => {
        const service = c.service?.toLowerCase();
        const tierName = tier.name.toLowerCase();
        if (tierName === "gamers node") return service === "gamers";
        return service === tierName;
      }).length;
    });
    return counts;
  }, [customerList, serviceTiers]);

  if (loadingCustomers || loadingTiers) {
    return <div className="h-full w-full flex items-center justify-center"><div className="animate-pulse flex flex-col items-center gap-4"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div><p className="text-slate-500 font-medium">Loading Service Tiers Data...</p></div></div>;
  }

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  
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
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:opacity-95 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Add New Customer
          </motion.button>
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
                    {tierCounts[tier.name] || 0}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Customer List Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-visible">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-20">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Customer Directory</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">Search and manage your active subscriber base.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => refetchCustomers()}
              disabled={isRefetching}
              className="p-2.5 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-500 hover:text-primary transition-all shadow-sm group"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={cn(isRefetching && "animate-spin")} />
            </button>
            <button 
              onClick={() => setShowAuditConfirm(true)}
              disabled={isAuditing}
              className="p-2.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-xl text-orange-600 hover:bg-orange-100 transition-all shadow-sm"
              title="Run Grace Period Audit"
            >
              <ZapOff size={18} className={cn(isAuditing && "animate-pulse")} />
            </button>
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
                <option value="grace">Grace Period (Due Tomorrow)</option>
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

        <div className="w-full overflow-visible relative z-0">
          <div className="overflow-visible">
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
                {displayCustomers.map((cust: any, idx: number) => (
                  <motion.tr 
                    key={cust.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: isSearching ? 0 : idx * 0.05 }}
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
                      {cust.is_grace_period && (
                        <div className="mt-1 flex items-center gap-1 text-[8px] font-black text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-md uppercase tracking-tighter w-fit">
                          <AlertTriangle size={8} /> Due Tomorrow
                        </div>
                      )}
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
      {/* Add Customer Sidebar */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
            <motion.div 
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 h-fit max-h-screen shadow-[-20px_20px_60px_rgba(0,0,0,0.15)] rounded-bl-[3.5rem] border-l border-b border-slate-200 dark:border-slate-800 p-8 md:p-10 pointer-events-auto flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Register New Customer</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Add a new subscriber to the network.</p>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsAddModalOpen(false)} 
                  className="p-2 text-slate-400 hover:text-primary transition-colors"
                >
                  <X size={24} />
                </motion.button>
              </div>
              
              <form onSubmit={handleAddCustomer} className="space-y-6 overflow-y-auto px-1 pr-3 custom-scrollbar">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Enter full name..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                    <input 
                      required
                      type="tel" 
                      placeholder="0812..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      value={newCustomer.no_telp}
                      onChange={(e) => setNewCustomer({...newCustomer, no_telp: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Package</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                        value={newCustomer.service}
                        onChange={(e) => setNewCustomer({...newCustomer, service: e.target.value})}
                      >
                        {serviceTiers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Province</label>
                      <input 
                        required
                        type="text" 
                        placeholder="Province"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={newCustomer.province}
                        onChange={(e) => setNewCustomer({...newCustomer, province: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">City</label>
                      <input 
                        required
                        type="text" 
                        placeholder="City"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={newCustomer.city}
                        onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">District</label>
                      <input 
                        required
                        type="text" 
                        placeholder="District"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={newCustomer.district}
                        onChange={(e) => setNewCustomer({...newCustomer, district: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Village</label>
                      <input 
                        required
                        type="text" 
                        placeholder="Village"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={newCustomer.village}
                        onChange={(e) => setNewCustomer({...newCustomer, village: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Complete Address</label>
                    <textarea 
                      required
                      rows={3}
                      placeholder="Street name, house number..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all resize-none"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all hover:opacity-90 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} /> Confirm Registration
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-sm transition-all hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Centered Glassmorphism Audit Confirmation */}
      <AnimatePresence>
        {showAuditConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            {/* Transparent click-capture overlay (no dimming) */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-transparent"
              onClick={() => setShowAuditConfirm(false)}
            />
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[3rem] p-10 shadow-[0_30px_100px_rgba(0,0,0,0.25)] border border-white/50 dark:border-slate-700/50"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-rose-600 rounded-[2rem] flex items-center justify-center text-white shadow-lg shadow-orange-500/30 mb-8 rotate-12">
                  <ZapOff size={36} />
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight mb-3">Execute Billing Audit</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-10">
                  Ready to process today&apos;s disconnects? This will <span className="text-orange-600 font-bold">automatically suspend</span> access for customers with outstanding bills.
                </p>
                
                <div className="flex flex-col gap-4 w-full">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRunAudit}
                    className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-orange-500/30 hover:bg-orange-500 transition-all flex items-center justify-center gap-2"
                  >
                    CONFIRM & DISCONNECT
                  </motion.button>
                  
                  <button
                    onClick={() => setShowAuditConfirm(false)}
                    className="w-full py-5 bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 rounded-2xl font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    KEEP AS ACTIVE
                  </button>
                </div>
              </div>

              {/* Decorative background element */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full -z-10" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -z-10" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
