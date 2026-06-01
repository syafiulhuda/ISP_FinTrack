"use client";

import { m, AnimatePresence } from"framer-motion";
import {
 ArrowUp,
 ArrowDown,
 TrendingUp,
 User,
 DollarSign,
 UserMinus,
 Wallet,
 Clock,
 ExternalLink,
 Minus,
 ArrowUpRight,
 X,
 Target,
 Zap,
 Globe
} from"lucide-react";
import dynamic from'next/dynamic';
import { ChartContainer } from'@/components/charts/ChartContainer';

const DashboardRevenueChart = dynamic(
 () => import('@/components/charts/DashboardCharts').then(mod => mod.DashboardRevenueChart),
 { ssr: false, loading: () => <div className="h-[200px] sm:h-[250px] lg:h-[300px] w-full skeleton-theme rounded-xl"/> }
);

const DashboardCustomerChart = dynamic(
 () => import('@/components/charts/DashboardCharts').then(mod => mod.DashboardCustomerChart),
 { ssr: false, loading: () => <div className="h-[220px] w-full skeleton-card rounded-xl"/> }
);
import { useQuery } from"@tanstack/react-query";
import { getDashboardData } from'@/actions/dashboard';
import { getAdminProfile } from"@/actions/admin";
import { cn, formatCurrency, formatNumber } from"@/lib/utils";
import { useState, useEffect, useMemo, useRef } from"react";
import Link from"next/link";
import { useRouter } from"next/navigation";
import { StatCard } from"@/components/ui/StatCard";
import { Transaction, ServiceTier, Customer } from"@/types";

// Tooltips extracted to DashboardCharts.tsx

export default function Dashboard() {
 const router = useRouter();
 const dashboardRef = useRef<HTMLDivElement>(null);
 const touchStartX = useRef<number | null>(null);

 const { data: dashboardData, isLoading } = useQuery({
 queryKey: ['dashboardData'],
 queryFn: getDashboardData
 });

 const { data: profile } = useQuery({
 queryKey: ['adminProfile'],
 queryFn: getAdminProfile
 });
 const isTimLapangan = profile?.role ==='Tim Lapangan'|| profile?.role ==='Pekerja';

 const customerList = dashboardData?.customers || [];
 const serviceTiers = dashboardData?.tiers || [];
 const transactions = dashboardData?.transactions || [];
 const inactiveCust = dashboardData?.inactiveCust || [];
 const customerGrowthTrend = dashboardData?.customerGrowthTrend || [];
 const expenseList = dashboardData?.expenses || [];
 const trendData = dashboardData?.trendData || [];


 const [mounted, setMounted] = useState(false);
 const [lastUpdated, setLastUpdated] = useState(new Date());
 const [minutesAgo, setMinutesAgo] = useState(0);
 const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
 const [activeStat, setActiveStat] = useState(0);

 useEffect(() => {
 setMounted(true);
 }, []);

 // Data Validation: Sync Check between Customers and Transactions
 useEffect(() => {
 if (isLoading || !customerList.length || !transactions.length) return;

 const active = customerList.filter((c: Customer) => c.status ==="Active");
 const estimatedRevenue = active.reduce((sum: number, customer: Customer) => {
 const tier = serviceTiers.find((t: ServiceTier) => {
 const sName = customer.service?.toLowerCase();
 const tName = t.name?.toLowerCase();
 if (tName ==="gamers node") return sName ==="gamers";
 return sName === tName;
 });
 const price = tier ? Number(tier.price) : 0;
 return sum + price;
 }, 0);

 const verifiedTxTotal = transactions
 .filter((t: Transaction) => t.status ==="Verified")
 .reduce((sum: number, t: Transaction) => sum + (parseInt(String(t.amount ||'0').replace(/[^0-9.-]/g,'')) || 0), 0);

 // Disable the automated flood of notifications
 /*
 if (estimatedRevenue !== verifiedTxTotal) {
 const diff = Math.abs(estimatedRevenue - verifiedTxTotal);
 const formattedDiff = new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR'}).format(diff);
 
 createNotification(
"warning",
"Revenue Data Mismatch",
`Dashboard detection: A discrepancy of ${formattedDiff} exists between Active Customer capacity and Verified Transactions.`
 );
 }
 */
 }, [customerList, transactions, serviceTiers, isLoading]);

 useEffect(() => {
 setLastUpdated(new Date());
 setMinutesAgo(0);
 }, [customerList.length]);

 useEffect(() => {
 const interval = setInterval(() => {
 const diff = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 60000);
 setMinutesAgo(diff);
 }, 60000);
 return () => clearInterval(interval);
 }, [lastUpdated]);

 const dynamicData = useMemo(() => {
 const activeCustomers = customerList.filter((c: Customer) => c.status ==="Active");

 const extractMonth = (dateVal: string | Date | null | undefined) => {
 if (!dateVal) return"";
 try {
 const d = new Date(dateVal);
 if (isNaN(d.getTime())) return String(dateVal).slice(0, 7);

 // Force evaluation in Asia/Jakarta timezone (UTC+7) using pure math
 const localTime = d.getTime() + (7 * 60 * 60 * 1000);
 const localDate = new Date(localTime);
 const year = localDate.getUTCFullYear();
 const month = String(localDate.getUTCMonth() + 1).padStart(2,'0');
 return`${year}-${month}`;
 } catch (e) {
 return String(dateVal).slice(0, 7);
 }
 };

 const getMonthStats = (monthStr: string) => {
 // 1. Revenue: Verified pemasukan in month
 const txs = transactions.filter((t: Transaction) =>
 t.status ==="Verified"&&
 t.keterangan ==="pemasukan"&&
 extractMonth(t.timestamp) === monthStr
 );
 const rev = txs.reduce((sum: number, t: Transaction) => sum + (parseInt(String(t.amount ||'0').replace(/[^0-9.-]/g,'')) || 0), 0);

 // 2. Active Count (for ARPU denominator): status='Active'AND createdAt <= month
 const activeCount = customerList.filter((c: Customer) =>
 c.status ==="Active"&&
 extractMonth(c.createdAt) <= monthStr
 ).length;

 const arpu = activeCount > 0 ? rev / activeCount : 0;

 // 3. Expense: Verified pengeluaran in month
 const txExps = transactions.filter((t: Transaction) =>
 t.status ==="Verified"&&
 t.keterangan ==="pengeluaran"&&
 extractMonth(t.timestamp) === monthStr
 );
 const totalExp = txExps.reduce((sum: number, t: Transaction) => sum + (parseInt(String(t.amount ||'0').replace(/[^0-9.-]/g,'')) || 0), 0);

 // 4. New Customers: createdAt in month
 const newCustsInMonth = customerList.filter((c: Customer) =>
 extractMonth(c.createdAt) === monthStr
 ).length;

 const cac = newCustsInMonth > 0 ? totalExp / newCustsInMonth : 0;

 // 5. Inactive this month: From inactive_cust table
 const inactiveInMonth = (inactiveCust as { inactive_month?: string; inactiveat?: string }[]).filter((ic) =>
 (ic.inactive_month && ic.inactive_month === monthStr) || extractMonth(ic.inactiveat) === monthStr
 ).length;

 // 6. Total Customers (Churn denominator): status='Active'AND createdAt <= month
 // User SQL uses: (SELECT COUNT(*) FROM customers WHERE status ='Active'and TO_CHAR("createdAt"::date,'YYYY-MM') <= m.month)
 const totalCustsAtEnd = activeCount;

 const churn = totalCustsAtEnd > 0 ? (inactiveInMonth / totalCustsAtEnd) * 100 : 0;

 return { rev, arpu, cac, churn, totalExp, newCusts: newCustsInMonth };
 };


 const distribution = serviceTiers.map((tier: ServiceTier) => {
 const count = activeCustomers.filter((c: Customer) => {
 const service = c.service?.toLowerCase();
 const tierName = tier.name.toLowerCase();
 if (tierName ==="gamers node") return service ==="gamers";
 return service === tierName;
 }).length;

 const colorMap: Record<string, string> = {
"Standard":"#004ac6",
"Premium":"#acbfff",
"Basic":"#ffb596",
"Gamers Node":"#e0e3e5"
 };

 return {
 name: tier.name,
 value: activeCustomers.length > 0 ? Math.round((count / activeCustomers.length) * 100) : 0,
 color: colorMap[tier.name] ||"#ccc"
 };
 });

 const formatCompactNumber = (number: number) => {
 if (number >= 1000000000) return`Rp ${(number / 1000000000).toFixed(2)}B`;
 if (number >= 1000000) return`Rp ${(number / 1000000).toFixed(2)}M`;
 if (number >= 1000) return`Rp ${(number / 1000).toFixed(1)}k`;
 return`Rp ${number.toFixed(0)}`;
 };

 // --- CALCULATE TRENDS ---
 const monthsWithData = transactions
 .filter((t: Transaction) => t.status ==="Verified"&& t.keterangan ==="pemasukan")
 .map((t: Transaction) => extractMonth(t.timestamp))
 .filter((m: string) => m.match(/^\d{4}-\d{2}$/))
 .sort();

 // Default to 2026-05 and 2026-04 for consistency with user SQL
 const latestMonthStr = monthsWithData.length > 0 ? monthsWithData[monthsWithData.length - 1] :"2026-05";
 const [year, month] = latestMonthStr.split('-').map(Number);

 const latestStats = getMonthStats(latestMonthStr);

 let prevMonthStr ="";
 if (month === 1) {
 prevMonthStr =`${year - 1}-12`;
 } else {
 prevMonthStr =`${year}-${String(month - 1).padStart(2,'0')}`;
 }
 const prevStats = getMonthStats(prevMonthStr);

 const calculateTrend = (current: number, previous: number) => {
 if (previous === 0) return current > 0 ?`+${current.toFixed(1)}%`:"0%";
 const diff = ((current / previous) - 1) * 100;
 return`${diff >= 0 ?'+':''}${diff.toFixed(1)}%`;
 };

 // CAC Display Logic (Match SQL CASE)
 let cacDisplay = formatCompactNumber(latestStats.cac);
 if (latestStats.newCusts === 0) {
 cacDisplay = latestStats.totalExp > 0 ?"N/A":"Rp 0";
 }

 // CAC Trend Logic (Match SQL CASE)
 let cacTrend = calculateTrend(latestStats.cac, prevStats.cac);
 if (latestStats.newCusts === 0 || prevStats.newCusts === 0) {
 cacTrend ="-";
 }

 // Churn Trend Logic (Percentage Points Difference)
 const churnDiff = latestStats.churn - prevStats.churn;
 const churnTrendLabel =`${churnDiff >= 0 ?'+':''}${churnDiff.toFixed(1)}%`;

 // --- DAILY TREND FOR LATEST ACTIVE MONTH ---
 const sortedTxs = [...transactions]
 .filter((t: Transaction) => t.status ==="Verified")
 .sort((a: Transaction, b: Transaction) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

 const latestTx = sortedTxs[0];
 const latestTxDate = (latestTx && latestTx.timestamp) ? new Date(latestTx.timestamp) : new Date();
 const targetYear = latestTxDate.getFullYear();
 const targetMonth = latestTxDate.getMonth(); // 0-indexed
 const latestDay = latestTxDate.getDate();

 const dailyTrendData = [];
 for (let day = 1; day <= latestDay; day++) {
 const dayStr =`${targetYear}-${String(targetMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

 const dayTxs = transactions.filter((t: Transaction) => {
 if (!t.timestamp) return false;
 const d = new Date(t.timestamp);
 return d.getFullYear() === targetYear &&
 d.getMonth() === targetMonth &&
 d.getDate() === day &&
 t.status ==="Verified";
 });

 const rev = dayTxs
 .filter((t: Transaction) => t.keterangan ==='pemasukan')
 .reduce((sum: number, t: Transaction) => sum + (parseInt(String(t.amount ||'0').replace(/[^0-9.-]/g,'')) || 0), 0);

 const exp = dayTxs
 .filter((t: Transaction) => t.keterangan ==='pengeluaran')
 .reduce((sum: number, t: Transaction) => sum + (parseInt(String(t.amount ||'0').replace(/[^0-9.-]/g,'')) || 0), 0);

 dailyTrendData.push({
 month:`${day} ${latestTxDate.toLocaleString('default', { month:'short'})}`,
 revenue: rev,
 expenses: exp
 });
 }

 // --- DAILY CUSTOMER GROWTH FOR LATEST ACTIVE MONTH ---
 const dailyGrowthData = [];
 let cumulativeBeforeMonth = customerList.filter((c: Customer) => {
 if (c.status !=="Active") return false;
 const d = new Date(c.createdAt || c.tanggal_daftar || 0);
 return d.getFullYear() < targetYear || (d.getFullYear() === targetYear && d.getMonth() < targetMonth);
 }).length;

 for (let day = 1; day <= latestDay; day++) {
 const newThisDay = customerList.filter((c: Customer) => {
 if (c.status !=="Active") return false;
 const d = new Date(c.createdAt || c.tanggal_daftar || 0);
 return d.getFullYear() === targetYear && d.getMonth() === targetMonth && d.getDate() === day;
 }).length;

 cumulativeBeforeMonth += newThisDay;
 dailyGrowthData.push({
 month:`${day} ${latestTxDate.toLocaleString('default', { month:'short'})}`,
 growth: cumulativeBeforeMonth
 });
 }

 return {
 arpu: formatCompactNumber(latestStats.arpu),
 totalRevenue: formatCompactNumber(latestStats.rev),
 churnRate:`${latestStats.churn.toFixed(1)}%`,
 cac: cacDisplay,
 distribution: distribution,
 trendData: dailyTrendData,
 growthTrend: dailyGrowthData,
 trends: {
 arpu: calculateTrend(latestStats.arpu, prevStats.arpu),
 cac: cacTrend,
 churn: churnTrendLabel,
 revenue: calculateTrend(latestStats.rev, prevStats.rev)
 },
 dateRangeLabel: latestTxDate ?`Showing data from 1 ${latestTxDate.toLocaleString('default', { month:'short'})} to ${latestTxDate.getDate()} ${latestTxDate.toLocaleString('default', { month:'short'})} ${latestTxDate.getFullYear()}`:"",
 currentPeriod: (() => {
 const trxDates = transactions
 .map((t: Transaction) => new Date(t.timestamp ||""))
 .filter((d: Date) => !isNaN(d.getTime()))
 .sort((a: Date, b: Date) => b.getTime() - a.getTime());

 const latestDate = trxDates.length > 0 ? trxDates[0] : new Date();
 const monthName = latestDate.toLocaleString("en-US", { month:"short"});
 const quarter = Math.floor(latestDate.getMonth() / 3) + 1;
 return`Q${quarter} ${monthName} ${latestDate.getFullYear()}`;
 })()
 };
 }, [customerList, serviceTiers, expenseList, transactions, trendData, customerGrowthTrend]);

 const kpis = [
 {
 name:"ARPU",
 value: dynamicData.arpu,
 trend: dynamicData.trends.arpu,
 trendType: (dynamicData.trends.arpu ==="0%"|| dynamicData.trends.arpu.includes('0.0%')) ?"neutral": (dynamicData.trends.arpu.startsWith('+') ?"up":"down") as"up"|"down"|"neutral",
 icon: User
 },
 {
 name:"CAC",
 value: dynamicData.cac,
 trend: dynamicData.trends.cac,
 trendType: (dynamicData.trends.cac ==="-"|| dynamicData.trends.cac ==="0%"|| dynamicData.trends.cac.includes('0.0%')) ?"neutral": (dynamicData.trends.cac.startsWith('+') ?"down":"up") as"up"|"down"|"neutral", // CAC up is bad
 icon: DollarSign
 },
 {
 name:"Churn Rate",
 value: dynamicData.churnRate,
 trend: dynamicData.trends.churn,
 trendType: (dynamicData.trends.churn ==="0%"|| dynamicData.trends.churn.includes('0.0%') || dynamicData.trends.churn ==="-") ?"neutral": (dynamicData.trends.churn.startsWith('+') ?"down":"up") as"up"|"down"|"neutral", // Churn up is bad
 icon: UserMinus
 },
 {
 name:"Total Revenue",
 value: dynamicData.totalRevenue,
 trend: dynamicData.trends.revenue,
 trendType: (dynamicData.trends.revenue ==="0%"|| dynamicData.trends.revenue.includes('0.0%')) ?"neutral": (dynamicData.trends.revenue.startsWith('+') ?"up":"down") as"up"|"down"|"neutral",
 icon: Wallet
 },
 ];


 // Removed full-page isLoading blocker to improve LCP

 return (
 <div className="relative">
 {isTimLapangan ? (
 <div className="pt-4 space-y-8 pb-10">
 <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
 <div className="w-24 h-24 bg-primary/10 text-primary rounded-[2rem] flex items-center justify-center shadow-inner">
 <User size={48} />
 </div>
 <div className="space-y-2">
 <h1 className="text-3xl font-black text-foreground">Welcome back, {profile?.nama}!</h1>
 <p className="text-muted-foreground max-w-md mx-auto font-medium">You are logged in as an operational worker. Use the sidebar to access your daily tasks, view customer data, and manage inventory.</p>
 </div>
 <div className="flex flex-col sm:flex-row gap-4 mt-8">
 <Link href="/inventory"className="px-8 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:opacity-90 transition-all active:scale-95">Go to Inventory</Link>
 <Link href="/service-tiers"className="px-8 py-4 bg-white text-foreground font-bold rounded-2xl border border-border shadow-sm hover:bg-muted dark:hover:bg-muted/50 transition-all active:scale-95">View Customers</Link>
 </div>
 </div>
 </div>
 ) : (
 <>
 <AnimatePresence>
 {isRoadmapOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setIsRoadmapOpen(false)}
 className="absolute inset-0"
 />
 <m.div
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 20 }}
 className="relative w-full max-w-2xl bg-card rounded-[2.5rem] shadow-2xl border border-border overflow-hidden"
 >
 <div className="p-8 border-b border-border flex items-center justify-between">
 <div>
 <h3 className="text-2xl font-black text-foreground">Infrastructure Roadmap 2026</h3>
 <p className="text-sm font-medium text-muted-foreground mt-1">Expansion and upgrade schedule for West Java regions.</p>
 </div>
 <button
 onClick={() => setIsRoadmapOpen(false)}
 className="p-2 hover:bg-muted dark:hover:bg-muted rounded-xl transition-colors text-muted-foreground"
 aria-label="Close roadmap"
 >
 <X size={24} />
 </button>
 </div>

 <div className="p-8 space-y-6">
 {[
 { phase:"Phase 1: Bandung Central", status:"In Progress", date:"Q1 2026", icon: Zap, color:"text-blue-500 bg-blue-50"},
 { phase:"Phase 2: Cimahi & Padalarang", status:"Planning", date:"Q2 2026", icon: Target, color:"text-orange-500 bg-orange-50"},
 { phase:"Phase 3: Garut & Tasikmalaya", status:"Upcoming", date:"Q3 2026", icon: Globe, color:"text-green-500 bg-green-50"},
 ].map((item, i) => (
 <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border border-border hover:bg-muted dark:hover:bg-muted/50 transition-colors">
 <div className={cn("p-3 rounded-xl", item.color)}>
 <item.icon size={20} />
 </div>
 <div className="flex-1">
 <div className="flex items-center justify-between">
 <h4 className="font-bold text-foreground">{item.phase}</h4>
 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.date}</span>
 </div>
 <p className="text-xs font-medium text-muted-foreground mt-1">Status: {item.status}</p>
 </div>
 </div>
 ))}
 </div>

 <div className="p-8 bg-muted flex justify-end">
 <button
 onClick={() => setIsRoadmapOpen(false)}
 className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20"
 >
 Acknowledge
 </button>
 </div>
 </m.div>
 </div>
 )}
 </AnimatePresence>

 <div ref={dashboardRef} className="pt-4 space-y-8 pb-10">
 <div className="space-y-8">
 {/* Header */}
 <div
 className="flex flex-row items-start md:items-center justify-between gap-2 md:gap-4"
 >
 <div className="flex-1">
 <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight leading-tight">Executive Overview</h1>
 <p className="text-[10px] md:text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1.5 md:gap-2">
 <Clock size={12} className="md:w-[14px] md:h-[14px]"/>
 {minutesAgo === 0 ?"Data updated just now":`Data updated ${minutesAgo} min ago`}
 </p>
 </div>
 <div className="flex items-center gap-2 md:gap-4 shrink-0">
 <div className="text-right">
 <p className="text-[8px] md:text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Period</p>
 <p className="text-[10px] sm:text-xs md:text-sm font-bold text-foreground">
 {dynamicData.currentPeriod}
 </p>
 </div>
 <button
 onClick={() => router.push('/profitability')}
 className="bg-primary text-white p-2 md:p-3 rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all shrink-0"
 aria-label="View Detailed Profitability Analysis"
 >
 <TrendingUp size={16} className="md:w-[20px] md:h-[20px]"/>
 </button>
 </div>
 </div>

 {/* KPI Cards */}
 {/* Mobile & Tablet 3D Cover Flow Carousel */}
 <div 
 className="block lg:hidden h-[195px] sm:h-[250px] w-full relative overflow-hidden !-mt-2 sm:!-mt-4 !mb-6 touch-pan-y"
 onTouchStart={(e) => {
 touchStartX.current = e.touches[0].clientX;
 }}
 onTouchEnd={(e) => {
 if (touchStartX.current === null) return;
 const touchEndX = e.changedTouches[0].clientX;
 const diff = touchStartX.current - touchEndX;
 const N = kpis.length;
 if (diff > 40) {
 setActiveStat((prev) => (prev + 1) % N);
 } else if (diff < -40) {
 setActiveStat((prev) => (prev - 1 + N) % N);
 }
 touchStartX.current = null;
 }}
 >
 {isLoading ? (
 <div className="absolute inset-0 m-auto w-[230px] sm:w-[420px] h-[145px] sm:h-[190px] skeleton-theme rounded-[1.5rem] shadow-xl"/>
 ) : (
 kpis.map((kpi, i) => {
 const N = kpis.length;
 const offset = (i - activeStat + N) % N;
 
 const isCenter = offset === 0;
 const isRight = offset === 1;
 const isLeft = offset === N - 1;
 const isVisible = isCenter || isRight || isLeft;

 const x = isCenter ?"0%": isRight ?"85%": isLeft ?"-85%":"0%";
 const scale = isCenter ? 1 : 0.85;
 const zIndex = isCenter ? 30 : (isVisible ? 20 : 10);
 const opacity = isCenter ? 1 : (isVisible ? 0.7 : 0);

 const isBad = (kpi.name ==="CAC"|| kpi.name ==="Churn Rate") ? kpi.trendType ==="up": kpi.trendType ==="down";
 const isGood = (kpi.name ==="CAC"|| kpi.name ==="Churn Rate") ? kpi.trendType ==="down": kpi.trendType ==="up";

 return (
 <m.div
 key={kpi.name}
 onClick={() => isVisible && setActiveStat(i)}
 drag="x"
 dragConstraints={{ left: 0, right: 0 }}
 dragElastic={0.2}
 onDragEnd={(e, { offset }) => {
 if (offset.x < -40) {
 setActiveStat((prev) => (prev + 1) % N);
 } else if (offset.x > 40) {
 setActiveStat((prev) => (prev - 1 + N) % N);
 }
 }}
 animate={{ x, scale, zIndex, opacity }}
 transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
 className={cn(
 "absolute inset-0 m-auto w-[230px] sm:w-[420px] h-[145px] sm:h-[190px] rounded-[1.5rem] sm:rounded-[2rem] cursor-pointer p-5 sm:p-8 flex flex-col justify-between transition-colors duration-300 border",
 isCenter 
 ?"bg-card border-cyan-400 shadow-[0_0_25px_3px_rgba(34,211,238,0.3)] dark:shadow-[0_0_35px_5px_rgba(34,211,238,0.4)]"
 :"bg-muted/80 border-border shadow-none",
 !isVisible &&"pointer-events-none"
 )}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3 sm:gap-4">
 <div className={cn(
"w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors duration-300",
   isCenter ? "bg-cyan-500/20 text-cyan-400" : "bg-muted text-muted-foreground"
 )}>
 <kpi.icon className="w-4 h-4 sm:w-6 sm:h-6"/>
 </div>
 <span className={cn(
"text-[10px] sm:text-sm font-black tracking-widest transition-colors duration-300 uppercase",
 isCenter ?"text-cyan-400":"text-muted-foreground"
 )}>
 {kpi.name}
 </span>
 </div>
 </div>
 
 <div>
 <div className={cn(
"text-3xl sm:text-5xl font-black tracking-tight transition-colors duration-300",
   isCenter ? "text-foreground" : "text-muted-foreground"
 )}>
 {kpi.value}
 </div>
 <div className="mt-1 sm:mt-2">
 {kpi.trendType !=="neutral"&& (
 <span className={cn(
"text-[8px] sm:text-[10px] font-black px-2 sm:px-3 py-1 rounded-full uppercase tracking-wider transition-colors",
 isCenter 
 ? (isGood ?"bg-emerald-500/20 text-emerald-400":"bg-rose-500/20 text-rose-400")
 :"bg-transparent text-muted-foreground"
 )}>
 {kpi.trend}
 </span>
 )}
 </div>
 </div>
 </m.div>
 );
 })
 )}
 </div>

 {/* Desktop Grid */}
 <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {isLoading ? (
 Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="h-[140px] skeleton-theme rounded-3xl"/>
 ))
 ) : (
 kpis.map((kpi, index) => (
 <StatCard
 key={kpi.name}
 name={kpi.name}
 value={kpi.value}
 icon={kpi.icon}
 trend={kpi.trendType ==='neutral'? undefined : kpi.trend}
 trendType={kpi.trendType as any}
 />
 ))
 )}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <section
 className="lg:col-span-2 bg-card rounded-[2.5rem] p-6 sm:p-8 lg:p-10 shadow-sm border border-border flex flex-col h-full"
 >
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 sm:mb-8">
 <div>
 <h3 className="text-2xl font-black text-foreground">Revenue Growth</h3>
 <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">{dynamicData.dateRangeLabel}</p>
 </div>
 <Link
 href="/profitability"
 className="
 inline-flex items-center justify-center gap-2
 px-4 py-3 rounded-xl w-full sm:w-auto
 bg-muted
 text-primary
 hover:bg-primary hover:text-primary-foreground
 transition-all
"
 >
 <span className="text-sm font-semibold whitespace-nowrap">
 View Details
 </span>
 <ExternalLink size={18} />
 </Link>
 </div>
 <ChartContainer className="flex-1 w-full mt-2 sm:mt-4 h-[120px] sm:h-[250px] lg:h-[300px]">
 {isLoading ? (
 <div className="h-full w-full bg-muted animate-pulse rounded-xl"/>
 ) : (
 <DashboardRevenueChart data={dynamicData.trendData} />
 )}
 </ChartContainer>
 </section>

 <div className="space-y-8">
 {/* Right Column: Customer Mix */}
 <section
 className="bg-card rounded-[2.5rem] p-10 border border-border shadow-sm"
 >
 <div className="mb-8">
 <h3 className="text-2xl font-black text-foreground">Customer Growth</h3>
 <p className="text-xs font-medium text-muted-foreground mt-1">{dynamicData.dateRangeLabel}</p>
 </div>
 <ChartContainer className="h-[220px] w-full mt-4">
 {isLoading ? (
 <div className="h-full w-full bg-muted animate-pulse rounded-xl"/>
 ) : (
 <DashboardCustomerChart data={(dynamicData.growthTrend as { growth?: number | null }[]).filter((d) => d.growth !== null)} />
 )}
 </ChartContainer>

 </section>

 <section
 className="bg-card rounded-3xl p-8 shadow-sm border border-border relative overflow-hidden group"
 >
 <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/20 transition-colors"/>
 <h3 className="text-foreground font-black text-lg mb-2 relative z-10">Upgrade Infrastructure</h3>
 <p className="text-muted-foreground text-sm mb-6 font-medium leading-relaxed relative z-10">Expand nodes in the Bandung area to capture growing demand.</p>
 <m.button
 onClick={() => setIsRoadmapOpen(true)}
 whileHover={{ scale: 1.05 }}
 whileTap={{ scale: 0.95 }}
 className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 relative z-10 shadow-xl shadow-primary/20"
 >
 Review Roadmap <ArrowUpRight size={18} />
 </m.button>
 </section>
 </div>
 </div>
 </div>
 </div>
 </>
 )}
 </div>
 );
}
