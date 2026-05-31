"use client";

import { m, AnimatePresence } from"framer-motion";
import { 
 MapPin, 
 ChevronRight, 
 MessageSquare,
 ChevronDown, 
 ChevronLeft,
 TrendingUp,
 Banknote
} from"lucide-react";
import { useQuery } from"@tanstack/react-query";
import { getRegionalData } from"@/actions/regional";
import { cn, formatCurrency, formatNumber } from"@/lib/utils";
import { useState, useMemo, useEffect, useRef } from"react";
import { LoadingState } from"@/components/LoadingState";
import { Customer, ServiceTier, Asset, Invoice } from"@/types";
import { StatCard } from"@/components/ui/StatCard";
import DataTable from"../../components/ui/DataTable";

interface AgingMVRow {
 NODE: string;
'REAL 0-30 DAYS': number;
'REAL 31-60 DAYS': number;
'REAL 61-90 DAYS': number;
'REAL 90+ DAYS': number;
}

interface NodeRow {
 node: string;
 customerCount: number;
 revenue: string;
 arpu: string;
 status: string;
 color: string;
 activeCount: number;
 inactiveCount: number;
 aging: {
'0-30': string;
'31-60': string;
'61-90': string;
'90Plus': string;
 critical: boolean;
 };
}

const SKELETON_ITEMS = Array.from({ length: 3 });

export default function RegionalAnalysisPage() {
 const [selectedProvince, setSelectedProvince] = useState("All Provinces");
 const [selectedCity, setSelectedCity] = useState("All Cities");
 const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
 const [selectedSubDistrict, setSelectedSubDistrict] = useState("All Sub-districts");
 const [searchQuery, setSearchQuery] = useState("");
 const [mounted, setMounted] = useState(false);
 const [activeStat, setActiveStat] = useState(0);

 const [expandedProfitNodes, setExpandedProfitNodes] = useState<Record<string, boolean>>({});
 const [expandedAgingNodes, setExpandedAgingNodes] = useState<Record<string, boolean>>({});

 const toggleProfitNode = (node: string) => {
 setExpandedProfitNodes(prev => ({ ...prev, [node]: !prev[node] }));
 };

 const toggleAgingNode = (node: string) => {
 setExpandedAgingNodes(prev => ({ ...prev, [node]: !prev[node] }));
 };

 const touchStartX = useRef<number | null>(null);

 const { data: pageData, isLoading: isPageLoading } = useQuery({
 queryKey: ['regionalData'],
 queryFn: getRegionalData,
 refetchInterval: 60000,
 });

 const customerList: Customer[] = pageData?.customers || [];
 const serviceTiers: ServiceTier[] = pageData?.serviceTiers || [];
 const assetRoster: Asset[] = pageData?.assetRoster || [];
 const invoicesList: Invoice[] = pageData?.invoicesList || [];
 const agingMVData: AgingMVRow[] = pageData?.agingMVData || [];

 const loadingCustomers = isPageLoading;
 const loadingTiers = isPageLoading;
 const loadingAssets = isPageLoading;
 const loadingInvoices = isPageLoading;
 const loadingMV = isPageLoading;


 const assetSummary = useMemo(() => {
 const filteredAssets = assetRoster.filter(a => {
 // Find the most specific selection
 let matchTarget ="";
 if (selectedSubDistrict !=="All Sub-districts") matchTarget = selectedSubDistrict;
 else if (selectedDistrict !=="All Districts") matchTarget = selectedDistrict;
 else if (selectedCity !=="All Cities") matchTarget = selectedCity;
 else if (selectedProvince !=="All Provinces") matchTarget = selectedProvince;

 // If no specific selection, include all
 if (!matchTarget) return true;

 const loc = a.location.toLowerCase();
 // Clean target from formal prefixes (e.g."Kota Bandung"->"bandung")
 const cleanTarget = matchTarget.replace(/^(Kota|Kabupaten|Kecamatan|Kelurahan|Provinsi)\s+/i,'').toLowerCase();

 // Fuzzy match against the location string
 return loc.includes(cleanTarget);
 });

 const online = filteredAssets.filter(a => (a.status ||'').toLowerCase() ==='online').length;
 const offline = filteredAssets.filter(a => (a.status ||'').toLowerCase() ==='offline').length;
 const sold = assetRoster.filter(a => a.kepemilikan ==='Dijual'|| a.kepemilikan ==='Telah Dijual').length;
 
 return { 
 total: filteredAssets.length, 
 online, 
 offline,
 sold 
 };
 }, [assetRoster, selectedProvince, selectedCity, selectedDistrict, selectedSubDistrict]);

 const [profitPage, setProfitPage] = useState(1);
 const [agingPage, setAgingPage] = useState(1);
 const itemsPerPage = 5;

 useEffect(() => {
 setMounted(true);
 }, []);

 // Helper to normalize strings to Title Case
 const normalize = (val: string | undefined | null) => {
 if (!val) return"";
 return val.trim().split('').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
 };

 // Dynamic Options with Normalization
 const provinces = useMemo(() => {
 const raw = customerList.map(c => c.province).filter(Boolean) as string[];
 const normalized = new Map<string, string>();
 raw.forEach(p => {
 const key = p.toLowerCase().trim();
 if (!normalized.has(key)) normalized.set(key, normalize(p));
 });
 return ["All Provinces", ...Array.from(normalized.values()).sort()];
 }, [customerList]);
 
 const cities = useMemo(() => {
 const list = selectedProvince ==="All Provinces"? customerList : customerList.filter(c => normalize(c.province) === selectedProvince);
 const raw = list.map(c => c.city).filter(Boolean) as string[];
 const normalized = new Map<string, string>();
 raw.forEach(p => {
 const key = p.toLowerCase().trim();
 if (!normalized.has(key)) normalized.set(key, normalize(p));
 });
 return ["All Cities", ...Array.from(normalized.values()).sort()];
 }, [selectedProvince, customerList]);

 const districts = useMemo(() => {
 const list = selectedCity ==="All Cities"
 ? (selectedProvince ==="All Provinces"? customerList : customerList.filter(c => normalize(c.province) === selectedProvince)) 
 : customerList.filter(c => normalize(c.city) === selectedCity);
 const raw = list.map(c => c.district).filter(Boolean) as string[];
 const normalized = new Map<string, string>();
 raw.forEach(p => {
 const key = p.toLowerCase().trim();
 if (!normalized.has(key)) normalized.set(key, normalize(p));
 });
 return ["All Districts", ...Array.from(normalized.values()).sort()];
 }, [selectedProvince, selectedCity, customerList]);

 const subDistricts = useMemo(() => {
 const list = selectedDistrict ==="All Districts"
 ? (selectedCity ==="All Cities"? (selectedProvince ==="All Provinces"? customerList : customerList.filter(c => normalize(c.province) === selectedProvince)) : customerList.filter(c => normalize(c.city) === selectedCity)) 
 : customerList.filter(c => normalize(c.district) === selectedDistrict);
 const raw = list.map(c => c.village).filter(Boolean) as string[];
 const normalized = new Map<string, string>();
 raw.forEach(p => {
 const key = p.toLowerCase().trim();
 if (!normalized.has(key)) normalized.set(key, normalize(p));
 });
 return ["All Sub-districts", ...Array.from(normalized.values()).sort()];
 }, [selectedProvince, selectedCity, selectedDistrict, customerList]);

 const dynamicData = useMemo(() => {
 let filtered = customerList.filter(c => {
 const pMatch = selectedProvince ==="All Provinces"|| normalize(c.province) === selectedProvince;
 const cMatch = selectedCity ==="All Cities"|| normalize(c.city) === selectedCity;
 const dMatch = selectedDistrict ==="All Districts"|| normalize(c.district) === selectedDistrict;
 const sMatch = selectedSubDistrict ==="All Sub-districts"|| normalize(c.village) === selectedSubDistrict;
 return pMatch && cMatch && dMatch && sMatch;
 });

 const grouped: Record<string, { node: string; customerCount: number; revenue: number; activeCount: number; inactiveCount: number }> = {};
 filtered.forEach(c => {
 const village = c.village ||"Other";
 if (!grouped[village]) {
 grouped[village] = {
 node: village,
 customerCount: 0,
 revenue: 0,
 activeCount: 0,
 inactiveCount: 0
 };
 }
 grouped[village].customerCount++;
 if (c.status ==="Active") grouped[village].activeCount++;
 else grouped[village].inactiveCount++;
 
 const tier = serviceTiers.find(t => {
 const s = c.service?.toLowerCase();
 const tn = t.name.toLowerCase();
 if (tn ==="gamers node") return s ==="gamers";
 return s === tn;
 });
 const price = tier ? Number(tier.price) : 0;
 grouped[village].revenue += price;
 });

 return Object.values(grouped).map(v => {
 const arpu = v.activeCount > 0 ? v.revenue / v.activeCount : 0;
 const status = arpu >= 200000 ?"OPTIMAL":"ACTION NEEDED";
 const color = status ==="OPTIMAL"?"bg-primary/10 text-primary":"bg-orange-100 text-orange-600";
 
 const customerIds = filtered.filter(c => (c.village ||"Other") === v.node).map(c => c.id);
 const villageInvoices = invoicesList.filter(inv => customerIds.includes(inv.customer_id) && inv.status ==='Unpaid');
 
 let aging0_30 = 0;
 let aging31_60 = 0;
 let aging61_90 = 0;
 let aging90Plus = 0;

 // 3. Integrate Materialized View Data (Prioritize MV over simulation)
 const mvNode = agingMVData.find((m: AgingMVRow) => m.NODE === v.node);
 
 if (mvNode) {
 // Data ditemukan di MV (Data Riil)
 aging0_30 = Number(mvNode["REAL 0-30 DAYS"]) || 0;
 aging31_60 = Number(mvNode["REAL 31-60 DAYS"]) || 0;
 aging61_90 = Number(mvNode["REAL 61-90 DAYS"]) || 0;
 aging90Plus = Number(mvNode["REAL 90+ DAYS"]) || 0;
 } else if (agingMVData.length > 0) {
 // Jika MV sudah ada isinya tapi NODE ini tidak ada, artinya piutangnya memang 0 (LUNAS)
 aging0_30 = 0;
 aging31_60 = 0;
 aging61_90 = 0;
 aging90Plus = 0;
 } else if (villageInvoices.length > 0) {
 // Fallback ke tabel invoices manual jika MV belum pernah di-refresh
 const today = new Date();
 villageInvoices.forEach(inv => {
 const dueDate = new Date(inv.due_date);
 const diffTime = Math.abs(today.getTime() - dueDate.getTime());
 const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 
 const amount = Number(inv.amount) || 0;
 if (diffDays <= 30) aging0_30 += amount;
 else if (diffDays <= 60) aging31_60 += amount;
 else if (diffDays <= 90) aging61_90 += amount;
 else aging90Plus += amount;
 });
 } else {
 // Terakhir, gunakan simulasi hanya jika database benar-benar kosong (Fresh Install)
 aging0_30 = v.revenue * 0.8;
 aging31_60 = v.revenue * 0.12;
 aging61_90 = v.revenue * 0.05;
 aging90Plus = v.revenue * 0.03 + (v.inactiveCount * 150000);
 }

 return {
 ...v,
 arpu: mounted ? Math.round(arpu).toLocaleString() :"---",
 revenue: mounted ? v.revenue.toLocaleString() :"---",
 status,
 color,
 aging: {
"0-30": mounted ? Math.round(aging0_30).toLocaleString() :"---",
"31-60": mounted ? Math.round(aging31_60).toLocaleString() :"---",
"61-90": mounted ? Math.round(aging61_90).toLocaleString() :"---",
"90Plus": mounted ? Math.round(aging90Plus).toLocaleString() :"---",
 critical: aging90Plus > (v.revenue * 0.1)
 }
 };
 }).sort((a, b) => {
 // Hitung total piutang untuk pengurutan
 const totalA = (parseFloat(a.aging["0-30"].replace(/[^0-9]/g,'')) || 0) +
 (parseFloat(a.aging["31-60"].replace(/[^0-9]/g,'')) || 0) +
 (parseFloat(a.aging["61-90"].replace(/[^0-9]/g,'')) || 0) +
 (parseFloat(a.aging["90Plus"].replace(/[^0-9]/g,'')) || 0);
 
 const totalB = (parseFloat(b.aging["0-30"].replace(/[^0-9]/g,'')) || 0) +
 (parseFloat(b.aging["31-60"].replace(/[^0-9]/g,'')) || 0) +
 (parseFloat(b.aging["61-90"].replace(/[^0-9]/g,'')) || 0) +
 (parseFloat(b.aging["90Plus"].replace(/[^0-9]/g,'')) || 0);
 
 return totalB - totalA; // Terbesar ke terkecil
 }).filter(v => v.node.toLowerCase().includes(searchQuery.toLowerCase()));
 }, [selectedProvince, selectedCity, selectedDistrict, selectedSubDistrict, searchQuery, customerList, serviceTiers, mounted, invoicesList, agingMVData]);

 const paginatedProfit = dynamicData.slice((profitPage - 1) * itemsPerPage, profitPage * itemsPerPage);
 const totalProfitPages = Math.ceil(dynamicData.length / itemsPerPage);

 const paginatedAging = dynamicData.slice((agingPage - 1) * itemsPerPage, agingPage * itemsPerPage);
 const totalAgingPages = Math.ceil(dynamicData.length / itemsPerPage);

 const isLoadingAll = loadingCustomers || loadingTiers || loadingAssets || loadingInvoices || loadingMV;

 return (
 <div className="pt-4 space-y-10">
 {/* Header Row */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
 <div>
 <h1 className="text-5xl font-black text-foreground tracking-tight">Regional Analysis</h1>
 <p className="text-lg font-medium text-muted-foreground mt-2">Granular profitability and aging distribution per territory.</p>
 </div>
 </div>

 <div className="bg-card p-8 rounded-[2.5rem] shadow-sm border border-border">
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
 {[
 { 
 label:"Province", 
 value: selectedProvince, 
 setter: (val: string) => {
 setSelectedProvince(val);
 setSelectedCity("All Cities");
 setSelectedDistrict("All Districts");
 setSelectedSubDistrict("All Sub-districts");
 }, 
 options: provinces 
 },
 { 
 label:"City", 
 value: selectedCity, 
 setter: (val: string) => {
 setSelectedCity(val);
 setSelectedDistrict("All Districts");
 setSelectedSubDistrict("All Sub-districts");
 }, 
 options: cities 
 },
 { 
 label:"District", 
 value: selectedDistrict, 
 setter: (val: string) => {
 setSelectedDistrict(val);
 setSelectedSubDistrict("All Sub-districts");
 }, 
 options: districts 
 },
 { 
 label:"Sub-district", 
 value: selectedSubDistrict, 
 setter: setSelectedSubDistrict, 
 options: subDistricts 
 },
 ].map((filter, i) => (
 <div key={i} className="space-y-3">
 <label htmlFor={`filter-${filter.label.toLowerCase()}`} className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">{filter.label}</label>
 <div className="relative group">
 <select 
 id={`filter-${filter.label.toLowerCase()}`}
 value={filter.value}
 onChange={(e) => {
 filter.setter(e.target.value);
 setProfitPage(1);
 setAgingPage(1);
 }}
 className="w-full bg-muted border-none rounded-2xl pl-5 pr-12 py-4 text-[11px] sm:text-xs font-bold text-foreground focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none cursor-pointer shadow-sm truncate"
 >
 {filter.options.map((opt, idx) => (
 <option key={idx} value={opt}>{opt}</option>
 ))}
 </select>
 <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none group-focus-within:rotate-180 transition-transform"size={16} />
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Mobile & Tablet 3D Cover Flow Carousel */}
 <div 
 className="block lg:hidden h-[180px] sm:h-[240px] w-full relative overflow-hidden !-mt-4 !mb-6 touch-pan-y"
 onTouchStart={(e) => {
 touchStartX.current = e.touches[0].clientX;
 }}
 onTouchEnd={(e) => {
 if (touchStartX.current === null) return;
 const touchEndX = e.changedTouches[0].clientX;
 const diff = touchStartX.current - touchEndX;
 if (diff > 40) {
 setActiveStat((prev) => (prev + 1) % 3);
 } else if (diff < -40) {
 setActiveStat((prev) => (prev - 1 + 3) % 3);
 }
 touchStartX.current = null;
 }}
 >
 {isLoadingAll ? (
 <div className="absolute inset-0 m-auto w-[230px] sm:w-[420px] h-[130px] sm:h-[180px] bg-muted animate-pulse rounded-[1.5rem] shadow-xl"/>
 ) : (
 [
 { title:"TOTAL ASET", value: mounted ? formatNumber(assetSummary.total) :'---', icon: MapPin },
 { title:"ONLINE", value: mounted ? formatNumber(assetSummary.online) :'---', icon: TrendingUp },
 { title:"SOLD", value: mounted ? formatNumber(assetSummary.sold) :'---', icon: Banknote }
 ].map((stat, i) => {
 const offset = (i - activeStat + 3) % 3;
 
 const isCenter = offset === 0;
 const x = isCenter ?"0%": offset === 1 ?"85%":"-85%";
 const scale = isCenter ? 1 : 0.85;
 const zIndex = isCenter ? 30 : 20;
 const opacity = isCenter ? 1 : 0.7;

 return (
 <m.div
 key={i}
 onClick={() => setActiveStat(i)}
 drag="x"
 dragConstraints={{ left: 0, right: 0 }}
 dragElastic={0.2}
 onDragEnd={(e, { offset }) => {
 if (offset.x < -40) {
 setActiveStat((prev) => (prev + 1) % 3);
 } else if (offset.x > 40) {
 setActiveStat((prev) => (prev - 1 + 3) % 3);
 }
 }}
 animate={{
 x,
 scale,
 zIndex,
 opacity
 }}
 transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
 className={cn(
 "absolute inset-0 m-auto w-[230px] sm:w-[420px] h-[130px] sm:h-[180px] rounded-[1.5rem] sm:rounded-[2rem] cursor-pointer p-5 sm:p-8 flex flex-col justify-between transition-colors duration-300 border",
 isCenter 
 ?"bg-card border-primary/50 shadow-[0_0_25px_3px_color-mix(in_srgb,var(--primary),transparent_70%)] dark:shadow-[0_0_35px_5px_color-mix(in_srgb,var(--primary),transparent_60%)]"
 :"bg-muted/80 border-border shadow-none"
 )}
 >
 <div className="flex items-center gap-3 sm:gap-4">
 <div className={cn(
"w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors duration-300",
 isCenter ?"bg-primary/15 text-primary":"bg-foreground/5 text-muted-foreground"
 )}>
 <stat.icon className="w-4 h-4 sm:w-6 sm:h-6"/>
 </div>
 <span className={cn(
"text-[10px] sm:text-sm font-black tracking-widest transition-colors duration-300",
 isCenter ?"text-primary":"text-muted-foreground"
 )}>
 {stat.title}
 </span>
 </div>
 
 <div className={cn(
"text-3xl sm:text-5xl font-black tracking-tight transition-colors duration-300",
 isCenter ?"text-foreground":"text-muted-foreground"
 )}>
 {stat.value}
 </div>
 </m.div>
 );
 })
 )}
 </div>

 {/* Desktop Grid */}
 <div className="hidden lg:grid lg:grid-cols-3 gap-6">
 {isLoadingAll ? (
 SKELETON_ITEMS.map((_, i) => (
 <div key={i} className="h-[140px] skeleton-card rounded-3xl"/>
 ))
 ) : (
 <>
 <StatCard 
 name="Total Aset"
 value={mounted ? formatNumber(assetSummary.total) :'---'} 
 icon={MapPin} 
 />
 <StatCard 
 name="Online"
 value={mounted ? formatNumber(assetSummary.online) :'---'} 
 icon={TrendingUp}
 iconClassName="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
 />
 <StatCard 
 name="Sold"
 value={mounted ? formatNumber(assetSummary.sold) :'---'} 
 icon={Banknote}
 iconClassName="bg-rose-100 text-rose-600 dark:bg-rose-900/30"
 />
 </>
 )}
 </div>

 {/* Profitability Table */}
 <m.section 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.2 }}
 className="bg-card rounded-[2.5rem] shadow-sm border border-border overflow-hidden"
 >
 <div className="p-5 sm:p-10 border-b border-border">
 <h3 className="text-base sm:text-2xl font-black text-foreground flex items-center gap-2 sm:gap-3">
 <MapPin className="text-primary w-5 h-5 sm:w-6 sm:h-6"/>
 Profitability by Kelurahan
 </h3>
 </div>
 <div className="min-h-[400px]">
 <DataTable
 className="hidden lg:block"
 data={paginatedProfit}
 isLoading={isLoadingAll}
 keyExtractor={(row: NodeRow) => row.node}
 columns={[
 { 
 header:"Node Name", 
 accessor:"node", 
 className:"px-10 py-6",
 render: (row: NodeRow) => (
 <div className="flex items-center gap-4">
 <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_color-mix(in_srgb,var(--primary),transparent_50%)]"/>
 <span className="font-black text-foreground text-lg">{row.node}</span>
 </div>
 )
 },
 { 
 header:"Customer Count", 
 accessor:"customerCount"as any, 
 className:"px-10 py-6 font-bold",
 render: (row: NodeRow) =>`${row.customerCount} Active`
 },
 { 
 header:"Monthly Revenue", 
 accessor:"revenue", 
 className:"px-10 py-6 font-black text-foreground whitespace-nowrap",
 render: (row: NodeRow) => <span className="tabular-nums">Rp {row.revenue}</span>
 },
 { 
 header:"ARPU", 
 accessor:"arpu", 
 className:"px-10 py-6 font-bold text-primary text-primary whitespace-nowrap",
 render: (row: NodeRow) => <span className="tabular-nums">Rp {row.arpu}</span>
 },
 { 
 header:"Node Status", 
 accessor:"status", 
 className:"px-10 py-6",
 render: (row: NodeRow) => (
 <span className={cn("text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-wider", row.color)}>
 {row.status}
 </span>
 )
 },
 ]}
 />

 {/* Mobile Profitability List (Collapsible Accordion/Dropdown) */}
 <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
 {isLoadingAll ? (
 SKELETON_ITEMS.map((_, i) => (
 <div key={i} className="p-5 space-y-3">
 <div className="h-4 skeleton-card rounded w-1/3"/>
 <div className="h-4 skeleton-card rounded w-1/4"/>
 </div>
 ))
 ) : paginatedProfit.length === 0 ? (
 <div className="p-10 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
 No data found
 </div>
 ) : (
 paginatedProfit.map((row) => {
 const isExpanded = !!expandedProfitNodes[row.node];
 return (
 <div key={row.node} className="p-5 space-y-4">
 {/* Header click row */}
 <div 
 onClick={() => toggleProfitNode(row.node)}
 className="flex items-center justify-between cursor-pointer group"
 >
 <div className="flex items-center gap-3">
 <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_color-mix(in_srgb,var(--primary),transparent_50%)]"/>
 <span className="font-black text-foreground text-sm group-hover:text-primary transition-colors">{row.node}</span>
 </div>
 
 <div className="flex items-center gap-3">
 <div className="text-right">
 <div className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">Revenue</div>
 <div className="text-xs font-black text-foreground">Rp {row.revenue}</div>
 </div>
 <m.div
 animate={{ rotate: isExpanded ? 90 : 0 }}
 transition={{ duration: 0.2 }}
 className="text-muted-foreground"
 >
 <ChevronRight size={18} />
 </m.div>
 </div>
 </div>

 {/* Collapsible Details */}
 <AnimatePresence initial={false}>
 {isExpanded && (
 <m.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden"
 >
 <div className="pt-2 pb-1 grid grid-cols-2 gap-4 text-xs">
 <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
 <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Customers</span>
 <span className="font-bold text-foreground">{row.customerCount} Active</span>
 </div>
 <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
 <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">ARPU</span>
 <span className="font-black text-primary text-primary">Rp {row.arpu}</span>
 </div>
 <div className="col-span-2 bg-muted/40 p-3 rounded-xl border border-border/60 flex items-center justify-between">
 <div>
 <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Node Status</span>
 </div>
 <span className={cn("text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider", row.color)}>
 {row.status}
 </span>
 </div>
 </div>
 </m.div>
 )}
 </AnimatePresence>
 </div>
 );
 })
 )}
 </div>
 
 {/* Pagination Profit */}
 {dynamicData.length > 0 && (
 <div className="p-4 sm:p-6 lg:p-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6 bg-muted/30 dark:bg-white/5">
 <p className="text-xs font-bold text-muted-foreground text-center sm:text-left">
 Showing <span className="text-foreground">{(profitPage-1)*itemsPerPage + 1}</span> to <span className="text-foreground">{Math.min(profitPage*itemsPerPage, dynamicData.length)}</span> of <span className="text-foreground">{dynamicData.length}</span> nodes
 </p>
 <div className="flex flex-row items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto">
 <button 
 onClick={() => setProfitPage(prev => Math.max(1, prev - 1))}
 disabled={profitPage === 1}
 className="px-3 sm:px-4 py-2 rounded-xl border border-border text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-muted transition-all text-muted-foreground"
 >
 Previous
 </button>
 <div className="flex items-center gap-1">
 {[...Array(Math.min(5, totalProfitPages))].map((_, i) => {
 let pageNum = profitPage <= 3 ? i + 1 : (profitPage >= totalProfitPages - 2 ? totalProfitPages - 4 + i : profitPage - 2 + i);
 if (pageNum <= 0 || pageNum > totalProfitPages) return null;
 
 return (
 <button
 key={pageNum}
 onClick={() => setProfitPage(pageNum)}
 className={cn(
"w-8 h-8 rounded-lg text-[10px] sm:text-xs font-bold transition-all",
 profitPage === pageNum ?"bg-primary text-foreground shadow-lg shadow-primary/20":"text-muted-foreground hover:text-foreground dark:hover:text-foreground"
 )}
 >
 {pageNum}
 </button>
 );
 })}
 </div>
 <button 
 onClick={() => setProfitPage(prev => Math.min(totalProfitPages, prev + 1))}
 disabled={profitPage === totalProfitPages}
 className="px-3 sm:px-4 py-2 rounded-xl border border-border text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-muted transition-all text-muted-foreground"
 >
 Next
 </button>
 </div>
 </div>
 )}
 </div>
 </m.section>

 {/* AR Aging Table */}
 <m.section 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: 0.3 }}
 className="bg-card rounded-[2.5rem] shadow-sm border border-border overflow-hidden"
 >
 <div className="p-5 sm:p-10 border-b border-border">
 <h3 className="text-base sm:text-2xl font-black text-foreground flex items-center gap-2 sm:gap-3">
 <MessageSquare className="text-primary w-5 h-5 sm:w-6 sm:h-6"/>
 AR Aging Analysis
 </h3>
 </div>
 <div className="min-h-[400px]">
 <DataTable
 className="hidden lg:block"
 data={paginatedAging}
 isLoading={isLoadingAll}
 keyExtractor={(row: NodeRow) =>`aging-${row.node}`}
 rowClassName={(row: NodeRow) => row.aging.critical ?"bg-red-50/30 dark:bg-red-900/5":""}
 columns={[
 { header:"Node", accessor:"node", className:"px-10 py-6 text-lg font-black"},
 { 
 header:"0-30 Days", 
 accessor:"aging", 
 className:"px-10 py-6 font-bold text-muted-foreground whitespace-nowrap",
 render: (row: NodeRow) => <span className="tabular-nums">Rp {row.aging["0-30"]}</span>
 },
 { 
 header:"31-60 Days", 
 accessor:"aging", 
 className:"px-10 py-6 font-bold text-orange-600 whitespace-nowrap",
 render: (row: NodeRow) => <span className="tabular-nums">Rp {row.aging["31-60"]}</span>
 },
 { 
 header:"61-90 Days", 
 accessor:"aging", 
 className:"px-10 py-6 font-bold text-red-600 whitespace-nowrap",
 render: (row: NodeRow) => <span className="tabular-nums">Rp {row.aging["61-90"]}</span>
 },
 { 
 header:"90+ Days", 
 accessor:"aging", 
 className:"px-10 py-6 font-black text-red-800 whitespace-nowrap",
 render: (row: NodeRow) => <span className="tabular-nums">Rp {row.aging["90Plus"]}</span>
 },
 ]}
 />

 {/* Mobile AR Aging List (Collapsible Accordion/Dropdown) */}
 <div className="block lg:hidden divide-y divide-slate-100 dark:divide-slate-800">
 {isLoadingAll ? (
 SKELETON_ITEMS.map((_, i) => (
 <div key={i} className="p-5 space-y-3">
 <div className="h-4 skeleton-card rounded w-1/3"/>
 <div className="h-4 skeleton-card rounded w-1/4"/>
 </div>
 ))
 ) : paginatedAging.length === 0 ? (
 <div className="p-10 text-center text-muted-foreground font-bold uppercase tracking-widest text-xs">
 No data found
 </div>
 ) : (
 paginatedAging.map((row) => {
 const isExpanded = !!expandedAgingNodes[row.node];
 return (
 <div key={`aging-${row.node}`} className={cn("p-5 space-y-4 transition-colors", row.aging.critical ?"bg-red-50/20 dark:bg-red-950/20":"")}>
 {/* Header click row */}
 <div 
 onClick={() => toggleAgingNode(row.node)}
 className="flex items-center justify-between cursor-pointer group"
 >
 <div className="flex items-center gap-3">
 <span className="font-black text-foreground text-sm group-hover:text-primary transition-colors">{row.node}</span>
 {row.aging.critical && (
 <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse border border-red-200 dark:border-red-800/50">
 CRITICAL
 </span>
 )}
 </div>
 
 <div className="flex items-center gap-3">
 <div className="text-right">
 <div className="text-[9px] font-black text-muted-foreground uppercase tracking-wider">0-30 Days</div>
 <div className="text-xs font-black text-muted-foreground">Rp {row.aging["0-30"]}</div>
 </div>
 <m.div
 animate={{ rotate: isExpanded ? 90 : 0 }}
 transition={{ duration: 0.2 }}
 className="text-muted-foreground"
 >
 <ChevronRight size={18} />
 </m.div>
 </div>
 </div>

 {/* Collapsible Details */}
 <AnimatePresence initial={false}>
 {isExpanded && (
 <m.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden"
 >
 <div className="pt-2 pb-1 grid grid-cols-2 gap-4 text-xs">
 <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
 <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">31-60 Days</span>
 <span className="font-bold text-orange-600">Rp {row.aging["31-60"]}</span>
 </div>
 <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
 <span className="block text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">61-90 Days</span>
 <span className="font-bold text-red-600">Rp {row.aging["61-90"]}</span>
 </div>
 <div className="col-span-2 bg-muted/40 p-3 rounded-xl border border-border/60 flex items-center justify-between">
 <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">90+ Days</span>
 <span className="font-black text-red-850 dark:text-red-400">Rp {row.aging["90Plus"]}</span>
 </div>
 </div>
 </m.div>
 )}
 </AnimatePresence>
 </div>
 );
 })
 )}
 </div>
 
 {/* Pagination Aging */}
 {dynamicData.length > 0 && (
 <div className="p-4 sm:p-6 lg:p-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6 bg-muted/30 dark:bg-white/5">
 <p className="text-xs font-bold text-muted-foreground text-center sm:text-left">
 Showing <span className="text-foreground">{(agingPage-1)*itemsPerPage + 1}</span> to <span className="text-foreground">{Math.min(agingPage*itemsPerPage, dynamicData.length)}</span> of <span className="text-foreground">{dynamicData.length}</span> nodes
 </p>
 <div className="flex flex-row items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto">
 <button 
 onClick={() => setAgingPage(prev => Math.max(1, prev - 1))}
 disabled={agingPage === 1}
 className="px-3 sm:px-4 py-2 rounded-xl border border-border text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-muted transition-all text-muted-foreground"
 >
 Previous
 </button>
 <div className="flex items-center gap-1">
 {[...Array(Math.min(5, totalAgingPages))].map((_, i) => {
 let pageNum = agingPage <= 3 ? i + 1 : (agingPage >= totalAgingPages - 2 ? totalAgingPages - 4 + i : agingPage - 2 + i);
 if (pageNum <= 0 || pageNum > totalAgingPages) return null;
 
 return (
 <button
 key={pageNum}
 onClick={() => setAgingPage(pageNum)}
 className={cn(
"w-8 h-8 rounded-lg text-[10px] sm:text-xs font-bold transition-all",
 agingPage === pageNum ?"bg-primary text-foreground shadow-lg shadow-primary/20":"text-muted-foreground hover:text-foreground dark:hover:text-foreground"
 )}
 >
 {pageNum}
 </button>
 );
 })}
 </div>
 <button 
 onClick={() => setAgingPage(prev => Math.min(totalAgingPages, prev + 1))}
 disabled={agingPage === totalAgingPages}
 className="px-3 sm:px-4 py-2 rounded-xl border border-border text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-muted transition-all text-muted-foreground"
 >
 Next
 </button>
 </div>
 </div>
 )}
 </div>
 </m.section>
 </div>
 );
}
