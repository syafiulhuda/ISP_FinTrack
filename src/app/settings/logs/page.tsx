"use client";

import { useState, useMemo, useEffect } from"react";
import { useQuery, useMutation, useQueryClient } from"@tanstack/react-query";
import { DataTable } from"@/components/ui/DataTable";
import { getSystemLogs, clearSystemLogs, resolveSystemLog } from"@/actions/logs";
import { getAdminProfile } from"@/actions/admin";
import { Search, Calendar, FilterX, Trash2, ArrowLeft, AlertCircle, Terminal, RefreshCw, ChevronDown, CheckCircle2, ShieldAlert, Copy } from"lucide-react";
import { cn } from"@/lib/utils";
import { m, AnimatePresence } from"framer-motion";
import { toast } from"sonner";
import Link from"next/link";

interface SystemLog {
 id: number;
 level: string;
 message: string;
 context: any;
 error_stack: string | null;
 path: string;
 user_id: string | null;
 environment: string;
 is_resolved: boolean;
 timestamp: string;
}

export default function SystemLogsPage() {
 const queryClient = useQueryClient();

 // 1. Fetch Profile and check Auth
 const { data: profile, isLoading: isProfileLoading } = useQuery({
 queryKey: ['adminProfile'],
 queryFn: getAdminProfile
 });

 const isAuthorized = useMemo(() => {
 if (!profile) return false;
 return profile.role ==='System Administrator'|| profile.role ==='Admin Kantor';
 }, [profile]);
 const isVisitor = profile?.email === 'visitor@gmail.com';

 // 2. Fetch Logs
 const { data: logs = [], isLoading: isLogsLoading, refetch, isRefetching } = useQuery({
 queryKey: ['systemLogs'],
 queryFn: getSystemLogs,
 enabled: isAuthorized, // Only run if authorized
 refetchInterval: 30000 // Refetch every 30 seconds
 });

 // 3. Mutation to Clear Logs
 const clearMutation = useMutation({
 mutationFn: clearSystemLogs,
 onSuccess: (data) => {
 if (data.success) {
 toast.success("Log sistem berhasil dibersihkan.");
 queryClient.setQueryData(['systemLogs'], []);
 } else {
 toast.error("Gagal membersihkan log:"+ data.error);
 }
 },
 onError: (err) => {
 toast.error("Terjadi kesalahan:"+ String(err));
 }
 });

 // 4. Mutation to Resolve Log
 const resolveMutation = useMutation({
 mutationFn: ({ id, resolved }: { id: number; resolved: boolean }) => resolveSystemLog(id, resolved),
 onSuccess: (data, variables) => {
 if (data.success) {
 toast.success(variables.resolved ?"Log berhasil ditandai selesai (Fixed).":"Log ditandai aktif kembali.");
 queryClient.invalidateQueries({ queryKey: ['systemLogs'] });
 } else {
 toast.error("Gagal memperbarui status log:"+ data.error);
 }
 },
 onError: (err) => {
 toast.error("Terjadi kesalahan:"+ String(err));
 }
 });

 const [search, setSearch] = useState("");
 const [levelFilter, setLevelFilter] = useState("ALL");
 const [statusFilter, setStatusFilter] = useState("ALL");
 const [dateFilter, setDateFilter] = useState("");
 const [currentPage, setCurrentPage] = useState(1);
 const itemsPerPage = 10;
 const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

 useEffect(() => {
 setCurrentPage(1);
 }, [search, levelFilter, statusFilter, dateFilter]);

 // 5. Filtering and Sorting logic
 const filteredLogs = useMemo(() => {
 return logs.filter((log: SystemLog) => {
 // Filter by Level
 if (levelFilter !=="ALL"&& log.level !== levelFilter) return false;

 // Filter by Status
 if (statusFilter !=="ALL") {
 const isResolved = statusFilter ==="RESOLVED";
 if (log.is_resolved !== isResolved) return false;
 }

 // Filter by Date
 if (dateFilter) {
 const logDate = new Date(log.timestamp).toISOString().split('T')[0];
 if (logDate !== dateFilter) return false;
 }

 // Filter by Search (Message, Path, User ID, Stack Trace)
 if (search) {
 const queryStr = search.toLowerCase();
 const msg = (log.message ||"").toLowerCase();
 const path = (log.path ||"").toLowerCase();
 const uid = (log.user_id ||"").toLowerCase();
 const stack = (log.error_stack ||"").toLowerCase();

 if (!msg.includes(queryStr) &&
 !path.includes(queryStr) &&
 !uid.includes(queryStr) &&
 !stack.includes(queryStr)) {
 return false;
 }
 }

 return true;
 });
 }, [logs, search, levelFilter, dateFilter]);

 const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
 const displayLogs = filteredLogs.slice(
 (currentPage - 1) * itemsPerPage,
 currentPage * itemsPerPage
 );

 const toggleLog = (id: number) => {
 setExpandedLogId(expandedLogId === id ? null : id);
 };

 const handleClearLogs = () => {
 if (window.confirm("Apakah Anda yakin ingin menghapus seluruh log sistem? Tindakan ini tidak dapat dibatalkan.")) {
 clearMutation.mutate();
 }
 };

 // Render loading screen if profile is loading
 if (isProfileLoading) {
 return (
 <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
 <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"/>
 <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Memeriksa hak akses...</p>
 </div>
 );
 }

 // Access Denied Screen
 if (!isAuthorized) {
 return (
 <div className="max-w-md mx-auto mt-20 p-8 bg-card rounded-3xl border border-border shadow-xl text-center space-y-6">
 <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
 <ShieldAlert size={36} />
 </div>
 <div className="space-y-2">
 <h2 className="text-xl font-black text-foreground tracking-tight">Akses Ditolak</h2>
 <p className="text-sm font-medium text-muted-foreground">
 Halaman ini hanya dapat diakses oleh **System Administrator** dan **Admin Kantor** untuk kepentingan pengawasan sistem.
 </p>
 </div>
 <div>
 <Link href="/settings">
 <button className="flex items-center gap-2 px-6 py-2.5 mx-auto bg-muted hover:bg-muted /80 rounded-xl transition-all font-bold text-sm text-foreground">
 <ArrowLeft size={16} />
 Kembali ke Settings
 </button>
 </Link>
 </div>
 </div>
 );
 }

 const columns = [
 {
 header:"Timestamp",
 accessor:"timestamp"as keyof SystemLog,
 className:"whitespace-nowrap w-[180px]",
 render: (row: SystemLog) => {
 const d = new Date(row.timestamp);
 return (
 <span className="font-mono text-xs text-muted-foreground tabular-nums">
 {d.toLocaleString('id-ID')}
 </span>
 );
 }
 },
 {
 header:"Level / Status",
 accessor:"level"as keyof SystemLog,
 className:"w-[150px]",
 render: (row: SystemLog) => {
 let levelStyle ="bg-muted text-foreground";
 if (row.level ==='ERROR') levelStyle ="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
 if (row.level ==='WARN') levelStyle ="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
 if (row.level ==='INFO') levelStyle ="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";

 return (
 <div className="flex flex-col gap-1.5 w-fit">
 <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase w-fit text-center", levelStyle)}>
 {row.level}
 </span>
 {row.is_resolved ? (
 <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 flex items-center gap-1 w-fit">
 <CheckCircle2 size={10} className="shrink-0"/>
 RESOLVED
 </span>
 ) : (
 <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 flex items-center gap-1 w-fit">
 <AlertCircle size={10} className="shrink-0"/>
 ACTIVE
 </span>
 )}
 </div>
 );
 }
 },
 {
 header:"Message & Context",
 accessor:"message"as keyof SystemLog,
 className:"min-w-[300px] max-w-[500px]",
 render: (row: SystemLog) => {
 const isExpanded = expandedLogId === row.id;
 return (
 <div className="space-y-1">
 <p className={cn(
"font-medium text-sm break-words line-clamp-2",
 row.is_resolved ?"text-muted-foreground line-through":"text-foreground"
 )}>
 {row.message}
 </p>
 <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
 <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-mono">
 {row.path}
 </span>
 {row.user_id && (
 <span>UID: {row.user_id}</span>
 )}
 <button
 onClick={() => toggleLog(row.id)}
 className="flex items-center gap-1 text-primary font-bold hover:underline"
 >
 {isExpanded ?"Sembunyikan detail":"Lihat detail"}
 <ChevronDown size={12} className={cn("transition-transform duration-200", isExpanded &&"rotate-180")} />
 </button>
 </div>

 <AnimatePresence initial={false}>
 {isExpanded && (
 <m.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden pt-2"
 >
 <div className="p-3 bg-background/50 rounded-xl border border-border text-xs font-mono space-y-3 whitespace-pre-wrap break-all overflow-x-auto max-w-full">
 {row.context && (
 <div>
 <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Context / Payload</div>
 <pre className="text-[11px] text-foreground bg-card p-2 rounded border border-border dark:border-slate-900 overflow-x-auto">
 {typeof row.context ==='string'? row.context : JSON.stringify(row.context, null, 2)}
 </pre>
 </div>
 )}
 {row.error_stack && (
 <div className="relative group">
 <div className="flex items-center justify-between mb-1">
 <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Error Stack Trace</div>
 <button
 onClick={(e) => {
 e.stopPropagation();
 navigator.clipboard.writeText(row.error_stack!);
 toast.success("Stack trace disalin");
 }}
 className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors"
 >
 <Copy size={12} />
 Copy
 </button>
 </div>
 <pre className="text-[10px] text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/10 p-2 rounded border border-red-100/50 dark:border-red-950/20 overflow-x-auto whitespace-pre">
 {row.error_stack}
 </pre>
 </div>
 )}

 <div className="flex items-center gap-2 pt-2 border-t border-border/60">
 <button
 onClick={() => resolveMutation.mutate({ id: row.id, resolved: !row.is_resolved })}
 disabled={resolveMutation.isPending || isVisitor}
 className={cn(
"px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5",
 row.is_resolved
 ?"bg-muted hover:bg-muted /80 text-muted-foreground"
 :"bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/10",
 isVisitor ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
 )}
 >
 {row.is_resolved ? (
 <>
 <AlertCircle size={12} className="shrink-0"/>
 Tandai Belum Selesai (Aktif)
 </>
 ) : (
 <>
 <CheckCircle2 size={12} className="shrink-0"/>
 Tandai Sudah Selesai (Fixed)
 </>
 )}
 </button>
 </div>
 </div>
 </m.div>
 )}
 </AnimatePresence>
 </div>
 );
 }
 },
 {
 header:"Env",
 accessor:"environment"as keyof SystemLog,
 className:"w-[80px] text-center",
 render: (row: SystemLog) => (
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
 {row.environment}
 </span>
 )
 }
 ];

 return (
 <div className="pt-6 md:pt-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto px-4 sm:px-6">
 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
 <div className="space-y-1">
 <Link
 href="/settings"
 className="flex items-center gap-2 text-muted-foreground hover:text-muted-foreground dark:text-slate-405 dark:hover:text-muted-foreground transition-colors text-xs font-bold uppercase tracking-wider w-fit"
 >
 <ArrowLeft size={16} />
 Pengaturan
 </Link>
 <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
 <Terminal size={24} className="text-primary shrink-0"/>
 System Control & Logs
 </h1>
 <p className="text-sm font-medium text-muted-foreground">
 Pusat monitoring runtime error dan logs aktivitas sistem (Alternatif Sentry Lokal).
 </p>
 </div>

 <div className="flex items-center gap-2">
 <button
 onClick={() => refetch()}
 disabled={isRefetching}
 className="flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted /80 rounded-xl transition-all font-bold text-xs text-foreground"
 >
 <RefreshCw size={14} className={cn(isRefetching &&"animate-spin")} />
 Refresh
 </button>

 <button
 onClick={handleClearLogs}
 disabled={clearMutation.isPending || logs.length === 0 || isVisitor}
 className={cn("flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all font-bold text-xs shadow-md shadow-rose-500/10",
 (clearMutation.isPending || logs.length === 0 || isVisitor) ? "opacity-50 cursor-not-allowed" : ""
 )}
 >
 <Trash2 size={14} />
 Clear All Logs
 </button>
 </div>
 </div>

 <div className="bg-card rounded-3xl p-6 shadow-sm border border-border">

 {/* Filters */}
 <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-6 pb-6 border-b border-border">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"size={16} />
 <input
 type="text"
 placeholder="Cari pesan, path, user ID, atau stack trace..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-transparent border border-border rounded-xl pl-9 pr-3 py-2.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground"
 />
 </div>

 <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
 <div className="flex flex-row gap-3 w-full sm:w-auto">
 <div className="relative flex-1 sm:flex-none">
 <select
 value={levelFilter}
 onChange={(e) => setLevelFilter(e.target.value)}
 className="w-full sm:w-40 bg-transparent border border-border rounded-xl px-3 py-2.5 text-[13px] font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground appearance-none pr-8 cursor-pointer"
 >
 <option className="bg-background text-foreground" value="ALL">Semua Level</option>
 <option className="bg-background text-foreground" value="INFO">INFO</option>
 <option className="bg-background text-foreground" value="WARN">WARN</option>
 <option className="bg-background text-foreground" value="ERROR">ERROR</option>
 </select>
 <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
 </div>

 <div className="relative flex-1 sm:flex-none">
 <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="w-full sm:w-40 bg-transparent border border-border rounded-xl px-3 py-2.5 text-[13px] font-bold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground appearance-none pr-8 cursor-pointer"
 >
 <option className="bg-background text-foreground" value="ALL">Semua Status</option>
 <option className="bg-background text-foreground" value="ACTIVE">Aktif (Unresolved)</option>
 <option className="bg-background text-foreground" value="RESOLVED">Selesai (Resolved)</option>
 </select>
 <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
 </div>
 </div>

 <div className="relative w-full sm:w-auto">
 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"size={16} />
 <input
 type="date"
 value={dateFilter}
 onChange={(e) => setDateFilter(e.target.value)}
 className="w-full sm:w-auto bg-transparent border border-border rounded-xl pl-9 pr-3 py-2.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-foreground cursor-pointer"
 />
 </div>

 {(search || levelFilter !=="ALL"|| statusFilter !=="ALL"|| dateFilter) && (
 <button
 onClick={() => { setSearch(""); setLevelFilter("ALL"); setStatusFilter("ALL"); setDateFilter(""); }}
 className="flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors shrink-0 w-full sm:w-auto"
 >
 <FilterX size={16} />
 Reset Filter
 </button>
 )}
 </div>
 </div>

 {/* Data Table */}
 <div className="hidden lg:block border border-border/80 rounded-2xl overflow-hidden bg-muted/20 /10">
 <DataTable
 data={displayLogs}
 columns={columns}
 keyExtractor={(row) => row.id}
 isLoading={isLogsLoading}
 emptyMessage="Tidak ada catatan log sistem yang sesuai."
 rowClassName={(row) => row.level ==='ERROR'&& !row.is_resolved ?"bg-red-500/[0.01]":""}
 />
 </div>

 {/* Mobile/Tablet Portrait Accordion Cards */}
 {!isLogsLoading && (
 <div className="block lg:hidden space-y-3">
 {displayLogs.length === 0 ? (
 <div className="text-center py-10 text-muted-foreground text-sm font-medium">
 Tidak ada catatan log sistem yang sesuai.
 </div>
 ) : (
 displayLogs.map((log: SystemLog) => {
 const isExpanded = expandedLogId === log.id;
 const d = new Date(log.timestamp);
 
 let levelStyle ="bg-muted text-foreground";
 if (log.level ==='ERROR') levelStyle ="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
 if (log.level ==='WARN') levelStyle ="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
 if (log.level ==='INFO') levelStyle ="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";

 return (
 <div 
 key={log.id} 
 className={cn(
"bg-card/50 border rounded-2xl p-4 transition-all",
 log.level ==='ERROR'&& !log.is_resolved ?"border-red-200 dark:border-red-900/50":"border-border"
 )}
 >
 <div 
 onClick={() => toggleLog(log.id)}
 className="flex items-start justify-between gap-3 cursor-pointer"
 >
 <div className="space-y-2 flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase whitespace-nowrap shrink-0", levelStyle)}>
 {log.level}
 </span>
 {log.is_resolved ? (
 <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 flex items-center gap-1 shrink-0">
 <CheckCircle2 size={10} className="shrink-0"/>
 RESOLVED
 </span>
 ) : (
 <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 flex items-center gap-1 shrink-0">
 <AlertCircle size={10} className="shrink-0"/>
 ACTIVE
 </span>
 )}
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide ml-auto">
 {log.environment}
 </span>
 </div>
 <p className={cn(
"font-medium text-sm break-words line-clamp-2",
 log.is_resolved ?"text-muted-foreground line-through":"text-foreground"
 )}>
 {log.message}
 </p>
 <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground font-medium">
 <span className="bg-muted px-2 py-0.5 rounded text-[10px] font-mono truncate max-w-full">
 {log.path}
 </span>
 <span className="font-mono tabular-nums text-[10px]">
 {d.toLocaleString('id-ID')}
 </span>
 </div>
 </div>
 <div className="shrink-0 pt-0.5">
 <m.div
 animate={{ rotate: isExpanded ? 180 : 0 }}
 transition={{ type:"spring", stiffness: 200, damping: 15 }}
 className="p-1 hover:bg-muted/60 dark:hover:bg-muted rounded-lg text-muted-foreground transition-colors"
 >
 <ChevronDown size={16} />
 </m.div>
 </div>
 </div>
 
 <AnimatePresence initial={false}>
 {isExpanded && (
 <m.div
 initial={{ height: 0, opacity: 0, marginTop: 0 }}
 animate={{ height:"auto", opacity: 1, marginTop: 12 }}
 exit={{ height: 0, opacity: 0, marginTop: 0 }}
 transition={{ duration: 0.2, ease:"easeInOut"}}
 className="overflow-hidden"
 >
 <div className="p-3 bg-white /50 rounded-xl border border-border/60 text-xs font-mono space-y-3 whitespace-pre-wrap break-all overflow-x-auto max-w-full">
 {log.context && (
 <div>
 <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Context / Payload</div>
 <pre className="text-[11px] text-foreground bg-card/50 p-2 rounded border border-border dark:border-slate-900 overflow-x-auto">
 {typeof log.context ==='string'? log.context : JSON.stringify(log.context, null, 2)}
 </pre>
 </div>
 )}
 {log.error_stack && (
 <div className="relative group">
 <div className="flex items-center justify-between mb-1">
 <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Error Stack Trace</div>
 <button
 onClick={(e) => {
 e.stopPropagation();
 navigator.clipboard.writeText(log.error_stack!);
 toast.success("Stack trace disalin");
 }}
 className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors"
 >
 <Copy size={12} />
 Copy
 </button>
 </div>
 <pre className="text-[10px] text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/10 p-2 rounded border border-red-100/50 dark:border-red-950/20 overflow-x-auto whitespace-pre">
 {log.error_stack}
 </pre>
 </div>
 )}

 <div className="flex items-center gap-2 pt-2 border-t border-border/60">
 <button
 onClick={(e) => {
 e.stopPropagation();
 resolveMutation.mutate({ id: log.id, resolved: !log.is_resolved });
 }}
 disabled={resolveMutation.isPending || isVisitor}
 className={cn(
"px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5",
 log.is_resolved
 ?"bg-muted hover:bg-muted /80 text-muted-foreground"
 :"bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/10",
 isVisitor ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
 )}
 >
 {log.is_resolved ? (
 <>
 <AlertCircle size={12} className="shrink-0"/>
 Tandai Belum Selesai (Aktif)
 </>
 ) : (
 <>
 <CheckCircle2 size={12} className="shrink-0"/>
 Tandai Sudah Selesai (Fixed)
 </>
 )}
 </button>
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
 )}

 {/* Loading Spinner for Mobile */}
 {isLogsLoading && (
 <div className="block lg:hidden text-center py-10">
 <span className="text-sm font-medium text-muted-foreground">Loading logs...</span>
 </div>
 )}

 {/* Pagination */}
 {!isLogsLoading && filteredLogs.length > 0 && (
 <div className="p-4 sm:p-6 lg:p-8 border-t border-border flex flex-col lg:flex-row items-center justify-between gap-6 bg-muted/30 dark:bg-white/5 mt-8">
 <p className="text-xs font-bold text-muted-foreground text-center lg:text-left">
 Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-foreground">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="text-foreground">{filteredLogs.length}</span> entries
 </p>
 <div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 sm:gap-2 w-full lg:w-auto">
 <button
 onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
 disabled={currentPage === 1}
 className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-border text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-muted transition-all text-muted-foreground"
 >
 Prev
 </button>

 {/* Mobile Pagination (3 items) */}
 <div className="flex sm:hidden items-center gap-1">
 {[...Array(Math.min(3, totalPages))].map((_, i) => {
 let pageNum = currentPage <= 2 ? i + 1 : (currentPage >= totalPages - 1 ? totalPages - 2 + i : currentPage - 1 + i);
 if (pageNum <= 0 || pageNum > totalPages) return null;
 return (
 <button
 key={`mob-${pageNum}`}
 onClick={() => setCurrentPage(pageNum)}
 className={cn(
"w-8 h-8 rounded-lg text-[10px] font-bold transition-all",
 currentPage === pageNum ?"bg-primary text-white shadow-lg shadow-primary/20":"text-muted-foreground hover:text-foreground dark:hover:text-white"
 )}
 >
 {pageNum}
 </button>
 );
 })}
 {totalPages > 3 && currentPage < totalPages - 1 && (
 <span className="text-muted-foreground text-[10px] font-bold tracking-widest px-0.5">...</span>
 )}
 </div>

 {/* Desktop Pagination (5 items) */}
 <div className="hidden sm:flex items-center gap-1">
 {[...Array(Math.min(5, totalPages))].map((_, i) => {
 let pageNum = currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i);
 if (pageNum <= 0 || pageNum > totalPages) return null;
 return (
 <button
 key={`desk-${pageNum}`}
 onClick={() => setCurrentPage(pageNum)}
 className={cn(
"w-8 h-8 rounded-lg text-xs font-bold transition-all",
 currentPage === pageNum ?"bg-primary text-white shadow-lg shadow-primary/20":"text-muted-foreground hover:text-foreground dark:hover:text-white"
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
 className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-border text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-muted transition-all text-muted-foreground"
 >
 Next
 </button>
 </div>
 </div>
 )}
 </div>
 </div>
 );
}
