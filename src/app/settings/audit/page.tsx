"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/DataTable";
import { getAuditLogs } from "@/actions/audit";
import { Search, Calendar, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { m, AnimatePresence } from "framer-motion";

interface AuditLog {
  id: string;
  user: string;
  timestamp: string;
  action: string;
  details: string;
}

export default function AuditTrailPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: getAuditLogs,
    refetchInterval: 60000
  });

  const [dateFilter, setDateFilter] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const toggleLog = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [adminSearch, dateFilter]);

  const sortedAndFilteredLogs = useMemo(() => {
    const filtered = logs.filter((log: AuditLog) => {
      // Filter by date
      if (dateFilter) {
        const date = new Date(log.timestamp);
        const wibDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
        const logDate = wibDate.getUTCFullYear() + "-" + 
                        String(wibDate.getUTCMonth() + 1).padStart(2, '0') + "-" + 
                        String(wibDate.getUTCDate()).padStart(2, '0');
        
        if (logDate !== dateFilter) return false;
      }
      
      // Filter by admin name
      if (adminSearch) {
        const adminName = (log.user || "").toLowerCase();
        if (!adminName.includes(adminSearch.toLowerCase())) return false;
      }

      return true;
    });

    // Sort Descending
    return [...filtered].sort((a: AuditLog, b: AuditLog) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [logs, dateFilter, adminSearch]);

  const totalPages = Math.ceil(sortedAndFilteredLogs.length / itemsPerPage);
  const displayLogs = sortedAndFilteredLogs.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  const columns = [
    { 
      header: "Date & Time", 
      accessor: "timestamp" as keyof AuditLog, 
      className: "whitespace-nowrap",
      render: (row: AuditLog) => {
        const d = new Date(row.timestamp);
        return <span className="font-mono text-sm text-slate-600 dark:text-slate-300 tabular-nums">{d.toLocaleString('id-ID')}</span>;
      }
    },
    { 
      header: "User / Admin", 
      accessor: "user" as keyof AuditLog, 
      className: "whitespace-nowrap",
      render: (row: AuditLog) => <span className="font-medium text-slate-800 dark:text-slate-200">{row.user}</span>
    },
    { 
      header: "Action Type", 
      accessor: "action" as keyof AuditLog, 
      className: "whitespace-nowrap",
      render: (row: AuditLog) => {
        let color = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
        if (row.action === 'System Login') color = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
        if (row.action === 'Data Insert/Update') color = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
        if (row.action === 'Hardware Deployed') color = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
        
        return (
          <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap", color)}>
            {row.action}
          </span>
        );
      }
    },
    { 
      header: "Details / Record ID", 
      accessor: "details" as keyof AuditLog,
      className: "whitespace-nowrap min-w-[200px]",
      render: (row: AuditLog) => <span className="text-sm text-slate-500 dark:text-slate-400">{row.details}</span>
    }
  ];

  return (
    <div className="pt-6 md:pt-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Security & Audit Trail</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Pusat pemantauan aktivitas admin. Melacak seluruh kejadian login dan perubahan data kritis.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800 flex-wrap">
          <div className="relative w-full sm:flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Cari nama admin..." 
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              aria-label="Cari nama admin"
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
          
          <div className="relative w-full sm:w-auto shrink-0">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filter berdasarkan tanggal"
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-slate-100"
            />
          </div>

          {(adminSearch || dateFilter) && (
            <button 
              onClick={() => { setAdminSearch(""); setDateFilter(""); }}
              className="flex items-center gap-2 px-3 py-2.5 text-[13px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors shrink-0"
            >
              <FilterX size={16} />
              Reset
            </button>
          )}
        </div>

        {/* Data Table */}
        <div className="hidden lg:block">
          <DataTable 
            data={displayLogs} 
            columns={columns} 
            keyExtractor={(row) => row.id}
            isLoading={isLoading}
            emptyMessage="Tidak ada aktivitas yang sesuai."
            className="no-scrollbar"
          />
        </div>

        {/* Mobile/Tablet Portrait Accordion Cards */}
        {!isLoading && (
          <div className="block lg:hidden space-y-3">
            {displayLogs.length === 0 ? (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400 text-sm font-medium">
                Tidak ada aktivitas yang sesuai.
              </div>
            ) : (
              displayLogs.map((log: AuditLog) => {
                const isExpanded = expandedLogId === log.id;
                const d = new Date(log.timestamp);
                
                let actionColor = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                if (log.action === 'System Login') actionColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
                if (log.action === 'Data Insert/Update') actionColor = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
                if (log.action === 'Hardware Deployed') actionColor = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
                
                return (
                  <div 
                    key={log.id} 
                    className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 transition-all"
                  >
                    <div 
                      onClick={() => toggleLog(log.id)}
                      className="flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{log.user}</span>
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0", actionColor)}>
                            {log.action}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono tabular-nums">
                          {d.toLocaleString('id-ID')}
                        </div>
                      </div>
                      <div className="shrink-0 pt-0.5">
                        <m.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ type: "spring", stiffness: 200, damping: 15 }}
                          className="p-1 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                        >
                          <ChevronDown size={16} />
                        </m.div>
                      </div>
                    </div>
                    
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <m.div
                          initial={{ height: 0, opacity: 0, marginTop: 0 }}
                          animate={{ height: "auto", opacity: 1, marginTop: 12 }}
                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 break-words font-medium">
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Details / Record ID</div>
                            {log.details}
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
        {isLoading && (
          <div className="block lg:hidden text-center py-10">
            <span className="text-sm font-medium text-slate-500">Loading audit trail...</span>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && sortedAndFilteredLogs.length > 0 && (
          <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center justify-between gap-6 bg-slate-50/30 dark:bg-white/5 mt-8 sm:flex-row">
            <p className="text-xs font-bold text-slate-400 text-center sm:text-left">
              Showing <span className="text-slate-900 dark:text-white">{(currentPage-1)*itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(currentPage*itemsPerPage, sortedAndFilteredLogs.length)}</span> of <span className="text-slate-900 dark:text-white">{sortedAndFilteredLogs.length}</span> entries
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
