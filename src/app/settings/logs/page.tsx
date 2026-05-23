"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/DataTable";
import { getSystemLogs, clearSystemLogs, resolveSystemLog } from "@/actions/logs";
import { getAdminProfile } from "@/actions/admin";
import { Search, Calendar, FilterX, Trash2, ArrowLeft, AlertCircle, Terminal, RefreshCw, ChevronDown, CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { m, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";

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
    return profile.role === 'System Administrator' || profile.role === 'Admin Kantor';
  }, [profile]);

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
        toast.error("Gagal membersihkan log: " + data.error);
      }
    },
    onError: (err) => {
      toast.error("Terjadi kesalahan: " + String(err));
    }
  });

  // 4. Mutation to Resolve Log
  const resolveMutation = useMutation({
    mutationFn: ({ id, resolved }: { id: number; resolved: boolean }) => resolveSystemLog(id, resolved),
    onSuccess: (data, variables) => {
      if (data.success) {
        toast.success(variables.resolved ? "Log berhasil ditandai selesai (Fixed)." : "Log ditandai aktif kembali.");
        queryClient.invalidateQueries({ queryKey: ['systemLogs'] });
      } else {
        toast.error("Gagal memperbarui status log: " + data.error);
      }
    },
    onError: (err) => {
      toast.error("Terjadi kesalahan: " + String(err));
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
      if (levelFilter !== "ALL" && log.level !== levelFilter) return false;

      // Filter by Status
      if (statusFilter !== "ALL") {
        const isResolved = statusFilter === "RESOLVED";
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
        const msg = (log.message || "").toLowerCase();
        const path = (log.path || "").toLowerCase();
        const uid = (log.user_id || "").toLowerCase();
        const stack = (log.error_stack || "").toLowerCase();

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
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Memeriksa hak akses...</p>
      </div>
    );
  }

  // Access Denied Screen
  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
          <ShieldAlert size={36} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Akses Ditolak</h2>
          <p className="text-sm font-medium text-slate-500">
            Halaman ini hanya dapat diakses oleh **System Administrator** dan **Admin Kantor** untuk kepentingan pengawasan sistem.
          </p>
        </div>
        <div>
          <Link href="/settings">
            <button className="flex items-center gap-2 px-6 py-2.5 mx-auto bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl transition-all font-bold text-sm text-slate-700 dark:text-slate-200">
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
      header: "Timestamp",
      accessor: "timestamp" as keyof SystemLog,
      className: "whitespace-nowrap w-[180px]",
      render: (row: SystemLog) => {
        const d = new Date(row.timestamp);
        return (
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {d.toLocaleString('id-ID')}
          </span>
        );
      }
    },
    {
      header: "Level / Status",
      accessor: "level" as keyof SystemLog,
      className: "w-[150px]",
      render: (row: SystemLog) => {
        let levelStyle = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
        if (row.level === 'ERROR') levelStyle = "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400";
        if (row.level === 'WARN') levelStyle = "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
        if (row.level === 'INFO') levelStyle = "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";

        return (
          <div className="flex flex-col gap-1.5 w-fit">
            <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase w-fit text-center", levelStyle)}>
              {row.level}
            </span>
            {row.is_resolved ? (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 flex items-center gap-1 w-fit">
                <CheckCircle2 size={10} className="shrink-0" />
                RESOLVED
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 flex items-center gap-1 w-fit">
                <AlertCircle size={10} className="shrink-0" />
                ACTIVE
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: "Message & Context",
      accessor: "message" as keyof SystemLog,
      className: "min-w-[300px] max-w-[500px]",
      render: (row: SystemLog) => {
        const isExpanded = expandedLogId === row.id;
        return (
          <div className="space-y-1">
            <p className={cn(
              "font-medium text-sm break-words line-clamp-2",
              row.is_resolved ? "text-slate-400 dark:text-slate-500 line-through" : "text-slate-800 dark:text-slate-200"
            )}>
              {row.message}
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono">
                {row.path}
              </span>
              {row.user_id && (
                <span>UID: {row.user_id}</span>
              )}
              <button
                onClick={() => toggleLog(row.id)}
                className="flex items-center gap-1 text-primary font-bold hover:underline"
              >
                {isExpanded ? "Sembunyikan detail" : "Lihat detail"}
                <ChevronDown size={12} className={cn("transition-transform duration-200", isExpanded && "rotate-180")} />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden pt-2"
                >
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-3 whitespace-pre-wrap break-all overflow-x-auto max-w-full">
                    {row.context && (
                      <div>
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Context / Payload</div>
                        <pre className="text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-900 overflow-x-auto">
                          {typeof row.context === 'string' ? row.context : JSON.stringify(row.context, null, 2)}
                        </pre>
                      </div>
                    )}
                    {row.error_stack && (
                      <div>
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Error Stack Trace</div>
                        <pre className="text-[10px] text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/10 p-2 rounded border border-red-100/50 dark:border-red-950/20 overflow-x-auto whitespace-pre">
                          {row.error_stack}
                        </pre>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <button
                        onClick={() => resolveMutation.mutate({ id: row.id, resolved: !row.is_resolved })}
                        disabled={resolveMutation.isPending}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                          row.is_resolved
                            ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400"
                            : "bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/10"
                        )}
                      >
                        {row.is_resolved ? (
                          <>
                            <AlertCircle size={12} className="shrink-0" />
                            Tandai Belum Selesai (Aktif)
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={12} className="shrink-0" />
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
      header: "Env",
      accessor: "environment" as keyof SystemLog,
      className: "w-[80px] text-center",
      render: (row: SystemLog) => (
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          {row.environment}
        </span>
      )
    }
  ];

  return (
    <div className="pt-6 md:pt-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-7xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/settings"
            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 dark:text-slate-405 dark:hover:text-slate-300 transition-colors text-xs font-bold uppercase tracking-wider w-fit"
          >
            <ArrowLeft size={16} />
            Pengaturan
          </Link>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Terminal size={24} className="text-primary shrink-0" />
            System Control & Logs
          </h1>
          <p className="text-sm font-medium text-slate-500">
            Pusat monitoring runtime error dan logs aktivitas sistem (Alternatif Sentry Lokal).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl transition-all font-bold text-xs text-slate-700 dark:text-slate-200"
          >
            <RefreshCw size={14} className={cn(isRefetching && "animate-spin")} />
            Refresh
          </button>

          <button
            onClick={handleClearLogs}
            disabled={clearMutation.isPending || logs.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-rose-500/10"
          >
            <Trash2 size={14} />
            Clear All Logs
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">

        {/* Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Cari pesan, path, user ID, atau stack trace..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full sm:w-40 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-[13px] font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-700 dark:text-slate-300 appearance-none pr-8 cursor-pointer"
              >
                <option value="ALL">Semua Level</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-40 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-[13px] font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-700 dark:text-slate-300 appearance-none pr-8 cursor-pointer"
              >
                <option value="ALL">Semua Status</option>
                <option value="ACTIVE">Aktif (Unresolved)</option>
                <option value="RESOLVED">Selesai (Resolved)</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-slate-100 cursor-pointer"
              />
            </div>

            {(search || levelFilter !== "ALL" || statusFilter !== "ALL" || dateFilter) && (
              <button
                onClick={() => { setSearch(""); setLevelFilter("ALL"); setStatusFilter("ALL"); setDateFilter(""); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors shrink-0"
              >
                <FilterX size={16} />
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-slate-50/20 dark:bg-slate-950/10">
          <DataTable
            data={displayLogs}
            columns={columns}
            keyExtractor={(row) => row.id}
            isLoading={isLogsLoading}
            emptyMessage="Tidak ada catatan log sistem yang sesuai."
            rowClassName={(row) => row.level === 'ERROR' && !row.is_resolved ? "bg-red-500/[0.01]" : ""}
          />
        </div>

        {/* Pagination */}
        {!isLogsLoading && filteredLogs.length > 0 && (
          <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center justify-between gap-6 bg-slate-50/30 dark:bg-white/5 mt-8 sm:flex-row">
            <p className="text-xs font-bold text-slate-400 text-center sm:text-left">
              Showing <span className="text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span className="text-slate-900 dark:text-white">{filteredLogs.length}</span> entries
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
      </div>
    </div>
  );
}
