"use client";

import { m, AnimatePresence } from "framer-motion";
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
import { getCustomers, createCustomer, auditCustomerGracePeriod } from "@/actions/customers";
import { getServiceTiers, createServiceTier } from "@/actions/tiers";
import { Customer, ServiceTier } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

const TIER_SKELETON_CARDS = Array.from({ length: 4 });
const DESKTOP_SKELETON_ROWS = Array.from({ length: 7 });
const MOBILE_SKELETON_CARDS = Array.from({ length: 7 });

const IconMap = {
  wifi: Wifi,
  speed: Zap,
  rocket: Rocket,
  gamepad: Gamepad2,
};

export default function ServiceTiersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});

  const toggleCustomerExpand = (customerId: string) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };

  const { data: customerData, isLoading: loadingCustomers, refetch: refetchCustomers, isRefetching } = useQuery({ 
    queryKey: ['customers', currentPage, itemsPerPage], 
    queryFn: () => getCustomers(currentPage, itemsPerPage),
    staleTime: 0,
    placeholderData: (previousData) => previousData,
  });

  // We still need all customers for the tier counts at the top
  const { data: allCustomerData } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => getCustomers(1, 1000),
    staleTime: 60000,
    placeholderData: (previousData) => previousData,
  });

  const customerList = customerData?.customers || [];
  const allCustomers = allCustomerData?.customers || [];
  const totalCount = customerData?.total || 0;

  const { data: serviceTiersRaw = [], isLoading: loadingTiers } = useQuery({ queryKey: ['serviceTiers'], queryFn: getServiceTiers });

  // Ensure Gamers package is always included in the UI if not present in DB
  const serviceTiers = useMemo(() => {
    const tiers = [...serviceTiersRaw];
    if (!tiers.find(t => t.name.toLowerCase().includes('gamers'))) {
      tiers.push({
        id: 999,
        name: "Gamers",
        speed: "200",
        unit: "Mbps",
        price: 750000,
        fup: "Unlimited",
        type: "priority",
        icon: "gamepad"
      });
    }
    return tiers;
  }, [serviceTiersRaw]);

  const isSearching = searchQuery.trim().length > 0 || statusFilter !== "All";

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

  const [isAddTierModalOpen, setIsAddTierModalOpen] = useState(false);
  const [newTier, setNewTier] = useState({
    name: '',
    speed: '',
    unit: 'Mbps',
    price: '',
    fup: '',
    type: 'secondary',
    icon: 'wifi'
  });

  const { refetch: refetchTiers } = useQuery({ queryKey: ['serviceTiers'], queryFn: getServiceTiers });

  const [isAuditing, setIsAuditing] = useState(false);
  const [showAuditConfirm, setShowAuditConfirm] = useState(false);

  // Lock body scroll when modals are open kawan
  useEffect(() => {
    if (isAddModalOpen || isAddTierModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAddModalOpen, isAddTierModalOpen]);

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

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createServiceTier(newTier);
    if (res?.success) {
      toast.success(`Service Plan ${res.tier.name} created!`);
      setIsAddTierModalOpen(false);
      setNewTier({ name: '', speed: '', unit: 'Mbps', price: '', fup: '', type: 'secondary', icon: 'wifi' });
      refetchTiers();
    } else {
      toast.error(res?.error || "Failed to create service plan.");
    }
  };

  // 1. Memoize filtered list - MUST be before any conditional returns
  const filteredCustomers = useMemo(() => {
    return allCustomers.filter(cust => {
      const matchesSearch = 
        (cust.name || cust.nama || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cust.city || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cust.service && cust.service.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = 
        statusFilter === "All" || 
        (statusFilter === "grace" && (cust as any).grace_days !== null && (
          // Kondisi 1: Jatuh tempo BESOK (grace_days === 1)
          (cust as any).grace_days === 1 ||
          // Kondisi 2: Sudah berlangganan > 1 bulan (30 hari)
          (new Date().getTime() - new Date(cust.createdAt || 0).getTime() > 30 * 24 * 60 * 60 * 1000)
        )) ||
        (cust.status?.toLowerCase() === statusFilter.toLowerCase());

      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [allCustomers, searchQuery, statusFilter]);

  // 2. Memoize tier counts - MUST be before any conditional returns
  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    serviceTiers.forEach(tier => {
      counts[tier.name] = allCustomers.filter(c => {
        const service = c.service?.toLowerCase();
        const tierName = tier.name.toLowerCase();
        if (tierName === "gamers node") return service === "gamers";
        return service === tierName;
      }).length;
    });
    return counts;
  }, [allCustomers, serviceTiers]);

  // We handle loading states inline to prevent layout shifts and scroll jumps by binding to loadingTiers and loadingCustomers separately.

  const totalPages = isSearching ? Math.ceil(filteredCustomers.length / itemsPerPage) : Math.ceil(totalCount / itemsPerPage);
  
  const displayCustomers = isSearching 
    ? filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : customerList; // Already limited by server if not searching


  return (
    <div className="pt-4 space-y-10">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Active Packages</h2>
          <p className="text-base md:text-lg font-medium text-slate-500 mt-2">Manage broadband tiers and subscriber distribution.</p>
        </div>
        <div className="flex items-center gap-4">
          <m.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm shadow-lg shadow-primary/20 hover:opacity-95 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Add New Customer
          </m.button>
        </div>
      </div>

      {/* Horizontal Scroll: Service Tiers */}
      <div className="flex overflow-x-auto pb-6 gap-6 no-scrollbar min-h-[262px]">
        {loadingTiers ? (
          TIER_SKELETON_CARDS.map((_, i) => (
             <div 
               key={i} 
               className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 min-w-[280px] h-[238px] flex-shrink-0 bg-white dark:bg-slate-900 flex flex-col justify-between"
             >
               <div>
                 <div className="flex justify-between items-center mb-6">
                   <div className="w-20 h-5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-full" />
                   <div className="w-5 h-5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-full" />
                 </div>
                 <div className="mb-6">
                   <div className="w-28 h-8 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                   <div className="w-36 h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md mt-2" />
                 </div>
               </div>
               <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                 <div className="flex justify-between">
                   <div className="w-16 h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                   <div className="w-12 h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                 </div>
                 <div className="flex justify-between">
                   <div className="w-20 h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                   <div className="w-8 h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                 </div>
               </div>
             </div>
          ))
        ) : (
          serviceTiers.map((tier, index) => {
          const Icon = IconMap[tier.icon as keyof typeof IconMap] || Wifi;
          const isFeatured = tier.type === "featured";
          const isPriority = tier.type === "priority";

          return (
            <m.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "p-6 rounded-xl relative overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-sm border border-slate-200 dark:border-slate-800 min-w-[280px] flex-shrink-0",
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
                <p className={cn("text-sm mt-1", isFeatured ? "text-white/80" : "text-slate-500")}>{formatCurrency(tier.price)} / mo</p>
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
            </m.div>
          );
        }))}

        {/* Add New Tier Card */}
        {!loadingTiers && (
          <m.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAddTierModalOpen(true)}
            className="flex-shrink-0 min-w-[280px] p-6 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-4 hover:border-primary hover:bg-primary/5 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
              <Plus size={24} />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-900 dark:text-slate-100">Add New Plan</p>
              <p className="text-xs text-slate-500">Expand your service offerings</p>
            </div>
          </m.button>
        )}
      </div>

      {/* Customer List Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-20">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Customer Directory</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">Search and manage your active subscriber base.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex flex-row items-center gap-2 w-full md:w-auto">
              <button 
                onClick={() => refetchCustomers()}
                disabled={isRefetching}
                aria-label="Refresh Data"
                className="p-2.5 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-slate-500 hover:text-primary transition-all shadow-sm group shrink-0"
                title="Refresh Data"
              >
                <RefreshCw size={18} className={cn(isRefetching && "animate-spin")} />
              </button>
              <button 
                onClick={() => setShowAuditConfirm(true)}
                disabled={isAuditing}
                aria-label="Run Grace Period Audit"
                className="p-2.5 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-xl text-orange-600 hover:bg-orange-100 transition-all shadow-sm shrink-0"
                title="Run Grace Period Audit"
              >
                <ZapOff size={18} className={cn(isAuditing && "animate-pulse")} />
              </button>
              <div className="relative flex-1 md:w-auto">
                <button
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  aria-label="Toggle Status Filter"
                  className="w-full md:w-[200px] flex items-center justify-between pl-3 md:pl-4 pr-2 md:pr-3 py-2.5 bg-slate-100/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-[11px] md:text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                >
                  <span className="capitalize whitespace-nowrap overflow-hidden text-ellipsis">{statusFilter === "grace" ? "Grace Period" : statusFilter === "All" ? "All Subscribers" : `${statusFilter} Only`}</span>
                  <ChevronDown size={14} className={cn("transition-transform duration-300 shrink-0", isStatusDropdownOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isStatusDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsStatusDropdownOpen(false)} />
                      <m.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute left-0 right-0 mt-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-40 overflow-hidden py-1 min-w-[150px]"
                      >
                        {[
                          { label: "All Subscribers", value: "All" },
                          { label: "Active Only", value: "active" },
                          { label: "Inactive Only", value: "inactive" },
                          { label: "Grace Period", value: "grace" }
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setStatusFilter(opt.value);
                              setCurrentPage(1);
                              setIsStatusDropdownOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 md:px-4 py-3 text-[11px] md:text-xs font-bold transition-all flex items-center justify-between",
                              statusFilter === opt.value 
                                ? "bg-primary text-white" 
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                            )}
                          >
                            {opt.label}
                            {statusFilter === opt.value && <CheckCircle2 size={14} />}
                          </button>
                        ))}
                      </m.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            <div className="relative w-full md:w-[320px] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
              <input 
                aria-label="Search customer directory"
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

        <div className={cn(
          "w-full relative z-0 transition-opacity duration-200",
          (isRefetching) ? "opacity-50 pointer-events-none" : "opacity-100"
        )}>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto no-scrollbar min-h-[704px]" style={{ overflowAnchor: 'none' }}>
            <table className="w-full min-w-[800px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-3 md:px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Status</th>
                  <th className="px-3 md:px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Subscriber</th>
                  <th className="px-3 md:px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Full Name</th>
                  <th className="px-3 md:px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Service Address</th>
                  <th className="px-3 md:px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Region</th>
                  <th className="px-3 md:px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">City/Regency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loadingCustomers ? (
                  DESKTOP_SKELETON_ROWS.map((_, i) => (
                    <tr key={i} className="h-[92px] border-b border-slate-100 dark:border-slate-800">
                      <td className="px-3 md:px-6 py-5">
                        <div className="w-20 h-6 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                      </td>
                      <td className="px-3 md:px-6 py-5">
                        <div className="space-y-1">
                          <div className="w-16 h-3 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                          <div className="w-12 h-2 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-5">
                        <div className="w-24 h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                      </td>
                      <td className="px-3 md:px-6 py-5">
                        <div className="space-y-1">
                          <div className="w-36 h-3 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                          <div className="w-20 h-2.5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-5">
                        <div className="w-20 h-3 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                      </td>
                      <td className="px-3 md:px-6 py-5">
                        <div className="space-y-1">
                          <div className="w-24 h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                          <div className="w-16 h-3 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : displayCustomers.map((cust: any, idx: number) => (
                  <m.tr 
                    key={cust.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: isSearching ? 0 : idx * 0.05 }}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all group h-[92px]"
                  >
                    <td className="px-3 md:px-6 py-5">
                      <div className="h-12 flex flex-col justify-center">
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all w-fit whitespace-nowrap",
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
                          {cust.grace_days !== null && cust.grace_days <= 3 && (
                            <div className={cn(
                              "mt-1 flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter w-fit leading-tight whitespace-nowrap",
                              cust.grace_days === 1 ? "text-orange-600 bg-orange-100" :
                              cust.grace_days === 0 ? "text-amber-600 bg-amber-100 ring-1 ring-amber-500/20" :
                              cust.grace_days < 0 ? "text-rose-600 bg-rose-100 ring-1 ring-rose-500/20" :
                              "text-slate-500 bg-slate-100"
                            )}>
                              <AlertTriangle size={8} className="shrink-0" /> 
                              <span className="max-w-[80px] break-words">
                                {cust.grace_days === 1 ? "Due Tomorrow" : 
                                 cust.grace_days === 0 ? "Due Today" : 
                                 cust.grace_days < 0 ? `Overdue ${Math.abs(cust.grace_days)} Days` : 
                                 `Due in ${cust.grace_days} Days`}
                              </span>
                            </div>
                          )}
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-5">
                      <div className="flex flex-col gap-0.5 whitespace-nowrap">
                        <span className="text-[11px] font-black text-slate-900 dark:text-slate-100 tracking-tight">{cust.id}</span>
                        <span className="text-[9px] font-bold text-primary uppercase tracking-tighter opacity-80">{cust.service || 'Standard'} Plan</span>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-5 max-w-[120px] md:max-w-[180px]">
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors block truncate" title={cust.name}>{cust.name}</span>
                    </td>
                    <td className="px-3 md:px-6 py-5 max-w-[150px] md:max-w-[240px]">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate" title={cust.address}>{cust.address}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5 truncate" title={cust.village}>{cust.village}</span>
                      </div>
                    </td>
                    <td className="px-3 md:px-6 py-5 max-w-[150px]">
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold truncate block" title={cust.district}>{cust.district}</span>
                    </td>
                    <td className="px-3 md:px-6 py-5">
                      <div className="flex flex-col whitespace-nowrap">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" title={cust.city}>{cust.city}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase truncate" title={cust.province}>{cust.province}</span>
                      </div>
                    </td>
                  </m.tr>
                ))}
                {(!loadingCustomers && displayCustomers.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                      No customers found matching your search criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Accordion Card View */}
          <div className="block md:hidden space-y-3 p-3 bg-slate-50 dark:bg-slate-950/20 rounded-2xl min-h-[632px]">
            {loadingCustomers ? (
              MOBILE_SKELETON_CARDS.map((_, i) => (
                <div 
                  key={i} 
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 h-[80px] flex items-center justify-between gap-4 w-full"
                >
                  <div className="flex-1 space-y-2">
                    <div className="w-24 h-2.5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                    <div className="w-32 h-4 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-5 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                    <div className="w-7 h-7 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
                  </div>
                </div>
              ))
            ) : displayCustomers.length === 0 ? (
              <div className="text-center text-slate-400 font-medium py-12 text-xs">
                No customers found matching your search criteria.
              </div>
            ) : (
              displayCustomers.map((cust: any, idx: number) => {
                const isExpanded = !!expandedCustomers[cust.id];
                return (
                  <m.div
                    key={cust.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 transition-all duration-300"
                  >
                    {/* Collapsed view row click container */}
                    <div 
                      onClick={() => toggleCustomerExpand(cust.id)}
                      className="flex items-center justify-between cursor-pointer gap-2"
                    >
                      {/* Left: ID, Name, Plan */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">{cust.id}</span>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-50 text-primary dark:bg-primary/10 dark:text-blue-400 uppercase tracking-wide">
                            {cust.service || 'Standard'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-950 dark:text-white truncate mt-1">
                          {cust.name}
                        </h4>
                      </div>

                      {/* Right: Status badge & Chevron Trigger */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider",
                            cust.status?.toLowerCase() === 'active' 
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 ring-1 ring-emerald-500/20" 
                              : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 ring-1 ring-rose-500/20"
                          )}>
                            <div className={cn(
                              "w-1 h-1 rounded-full",
                              cust.status?.toLowerCase() === 'active' ? "bg-emerald-500" : "bg-rose-500"
                            )} />
                            {cust.status || 'Active'}
                          </div>
                          
                          {cust.grace_days !== null && cust.grace_days <= 3 && (
                            <div className={cn(
                              "flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tight leading-tight",
                              cust.grace_days === 1 ? "text-orange-600 bg-orange-100" :
                              cust.grace_days === 0 ? "text-amber-600 bg-amber-100" :
                              cust.grace_days < 0 ? "text-rose-600 bg-rose-100" :
                              "text-slate-500 bg-slate-100"
                            )}>
                              <AlertTriangle size={8} className="shrink-0" />
                              <span className="max-w-[70px] truncate">
                                {cust.grace_days === 1 ? "Tomorrow" : 
                                 cust.grace_days === 0 ? "Today" : 
                                 cust.grace_days < 0 ? `${Math.abs(cust.grace_days)}d Over` : 
                                 `${cust.grace_days}d Left`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Chevron Icon Container */}
                        <div
                          className={cn(
                            "w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-all duration-300",
                            isExpanded && "bg-primary/10 text-primary dark:text-blue-400 rotate-180"
                          )}
                        >
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    {/* Expandable Accordion Block */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <m.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-[11px]">
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Region</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate" title={cust.district}>
                                  {cust.district || '-'}
                                </span>
                              </div>
                              <div className="space-y-1 text-right">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">City / Regency</span>
                                <span className="font-bold text-slate-950 dark:text-slate-100 block truncate" title={cust.city}>
                                  {cust.city || '-'}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-[11px]">
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Province</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate" title={cust.province}>
                                  {cust.province || '-'}
                                </span>
                              </div>
                              <div className="space-y-1 text-right">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Phone Number</span>
                                <span className="font-bold text-primary dark:text-blue-400 block truncate" title={cust.no_telp}>
                                  {cust.no_telp || '-'}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1 text-[11px] pt-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Complete Address</span>
                              <p className="text-slate-600 dark:text-slate-350 font-medium leading-relaxed bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/50">
                                {cust.address}{cust.village ? `, ${cust.village}` : ''}
                              </p>
                            </div>
                          </div>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </m.div>
                );
              })
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        {(totalPages > 0 || loadingCustomers) && (
          <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center justify-between gap-6 bg-slate-50/30 dark:bg-white/5 sm:flex-row min-h-[112px] sm:min-h-[96px]">
            {loadingCustomers ? (
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
                  Showing <span className="text-slate-900 dark:text-white">{(currentPage-1)*itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(currentPage*itemsPerPage, isSearching ? filteredCustomers.length : totalCount)}</span> of <span className="text-slate-900 dark:text-white">{isSearching ? filteredCustomers.length : totalCount}</span> subscribers
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

        {isSearching && (
          <div className="p-4 bg-primary/5 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] text-center">
              Filtered Result: <span className="text-slate-900 dark:text-white">{filteredCustomers.length}</span> matches found
            </p>
          </div>
        )}
      </div>
      {/* Add Customer Sidebar */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
            {/* Backdrop Overlay with premium frosted glass effect kawan */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto cursor-pointer"
            />
            <m.div 
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 w-full h-[100dvh] md:h-fit md:max-h-screen max-w-none md:max-w-md bg-white dark:bg-slate-900 shadow-[-20px_20px_60px_rgba(0,0,0,0.15)] rounded-none md:rounded-bl-[3.5rem] border-none md:border-l md:border-b border-slate-200 dark:border-slate-800 p-6 sm:p-8 md:p-10 pointer-events-auto flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Register New Customer</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Add a new subscriber to the network.</p>
                </div>
                <m.button 
                  aria-label="Close Add Customer Modal"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsAddModalOpen(false)} 
                  className="p-2 text-slate-400 hover:text-primary transition-colors"
                >
                  <X size={24} />
                </m.button>
              </div>
              
              <form onSubmit={handleAddCustomer} className="space-y-6 overflow-y-auto px-1 pr-3 custom-scrollbar flex-1">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                    <input 
                      aria-label="Full Name"
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
                      aria-label="Phone Number"
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
                        aria-label="Package"
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
                        aria-label="Province"
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
                        aria-label="City"
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
                        aria-label="District"
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
                        aria-label="Village"
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
                      aria-label="Complete Address"
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
            </m.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Tier Sidebar */}
      <AnimatePresence>
        {isAddTierModalOpen && (
          <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
            {/* Backdrop Overlay with premium frosted glass effect kawan */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddTierModalOpen(false)}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-auto cursor-pointer"
            />
            <m.div 
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 w-full h-[100dvh] md:h-fit md:max-h-screen max-w-none md:max-w-md bg-white dark:bg-slate-900 shadow-[-20px_20px_60px_rgba(0,0,0,0.15)] rounded-none md:rounded-bl-[3.5rem] border-none md:border-l md:border-b border-slate-200 dark:border-slate-800 p-6 sm:p-8 md:p-10 pointer-events-auto flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Add New Service</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">Configure a new internet plan for your customers.</p>
                </div>
                <m.button 
                  aria-label="Close Add Plan Modal"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsAddTierModalOpen(false)} 
                  className="p-2 text-slate-400 hover:text-primary transition-colors"
                >
                  <X size={24} />
                </m.button>
              </div>

              <form onSubmit={handleAddTier} className="space-y-6 overflow-y-auto px-1 pr-3 custom-scrollbar flex-1">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Plan Name</label>
                    <input 
                      aria-label="Plan Name"
                      required
                      type="text" 
                      placeholder="e.g. Ultra Gaming"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                      value={newTier.name}
                      onChange={(e) => setNewTier({...newTier, name: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Speed Value</label>
                      <input 
                        aria-label="Speed Value"
                        required
                        type="text" 
                        placeholder="e.g. 300"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={newTier.speed}
                        onChange={(e) => setNewTier({...newTier, speed: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Unit</label>
                      <div className="relative">
                        <select 
                          aria-label="Unit"
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                          value={newTier.unit}
                          onChange={(e) => setNewTier({...newTier, unit: e.target.value})}
                        >
                          <option value="Mbps">Mbps</option>
                          <option value="Gbps">Gbps</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Price</label>
                      <input 
                        aria-label="Price"
                        required
                        type="number" 
                        placeholder="e.g. 900000"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={newTier.price}
                        onChange={(e) => setNewTier({...newTier, price: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">FUP Limit</label>
                      <input 
                        aria-label="FUP Limit"
                        required
                        type="text" 
                        placeholder="e.g. 2 TB or Unlimited"
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                        value={newTier.fup}
                        onChange={(e) => setNewTier({...newTier, fup: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Package Type</label>
                      <div className="relative">
                        <select 
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                          value={newTier.type}
                          onChange={(e) => setNewTier({...newTier, type: e.target.value})}
                        >
                          <option value="standard">Standard</option>
                          <option value="secondary">Secondary</option>
                          <option value="featured">Featured (Blue Gradient)</option>
                          <option value="priority">Priority (Orange Badge)</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Icon</label>
                      <div className="relative">
                        <select 
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                          value={newTier.icon}
                          onChange={(e) => setNewTier({...newTier, icon: e.target.value})}
                        >
                          <option value="wifi">WiFi</option>
                          <option value="speed">Zap/Speed</option>
                          <option value="rocket">Rocket</option>
                          <option value="gamepad">Gamepad</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 transition-all hover:opacity-90 flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> Create Service Plan
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsAddTierModalOpen(false)}
                    className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-sm transition-all hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      {/* Centered Glassmorphism Audit Confirmation */}
      <AnimatePresence>
        {showAuditConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            {/* Transparent click-capture overlay (no dimming) */}
            <m.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-transparent"
              onClick={() => setShowAuditConfirm(false)}
            />
            
            <m.div
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
                  <m.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleRunAudit}
                    className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-orange-500/30 hover:bg-orange-500 transition-all flex items-center justify-center gap-2"
                  >
                    CONFIRM & DISCONNECT
                  </m.button>
                  
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
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
