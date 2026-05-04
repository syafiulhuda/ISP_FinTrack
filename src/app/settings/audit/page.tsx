"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/DataTable";
import { getAuditLogs } from "@/actions/audit";
import { Search, Calendar, FilterX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    setCurrentPage(1);
  }, [adminSearch, dateFilter]);

  const sortedAndFilteredLogs = useMemo(() => {
    const filtered = logs.filter((log: any) => {
      // Filter by date
      if (dateFilter) {
        const logDate = new Date(log.timestamp).toISOString().split("T")[0];
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
    return [...filtered].sort((a: any, b: any) => 
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
      accessor: "timestamp", 
      render: (row: any) => {
        const d = new Date(row.timestamp);
        return <span className="font-mono text-sm text-slate-600 dark:text-slate-300">{d.toLocaleString('id-ID')}</span>;
      }
    },
    { 
      header: "User / Admin", 
      accessor: "user", 
      render: (row: any) => <span className="font-medium text-slate-800 dark:text-slate-200">{row.user}</span>
    },
    { 
      header: "Action Type", 
      accessor: "action", 
      render: (row: any) => {
        let color = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
        if (row.action === 'System Login') color = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
        if (row.action === 'Data Insert/Update') color = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
        if (row.action === 'Hardware Deployed') color = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
        
        return (
          <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", color)}>
            {row.action}
          </span>
        );
      }
    },
    { 
      header: "Details / Record ID", 
      accessor: "details",
      render: (row: any) => <span className="text-sm text-slate-500 dark:text-slate-400">{row.details}</span>
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Security & Audit Trail</h2>
        <p className="text-sm font-medium text-slate-500 mt-1">Pusat pemantauan aktivitas admin. Melacak seluruh kejadian login dan perubahan data kritis.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="relative w-full sm:w-auto flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari nama admin..." 
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
          
          <div className="relative w-full sm:w-auto">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-900 dark:text-slate-100"
            />
          </div>

          {(adminSearch || dateFilter) && (
            <button 
              onClick={() => { setAdminSearch(""); setDateFilter(""); }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
            >
              <FilterX size={18} />
              Reset
            </button>
          )}
        </div>

        {/* Data Table */}
        <DataTable 
          data={displayLogs} 
          columns={columns} 
          keyExtractor={(row) => `${row.action}-${row.timestamp}-${row.user}`}
          isLoading={isLoading}
          emptyMessage="Tidak ada aktivitas yang sesuai."
        />

        {/* Pagination */}
        {!isLoading && sortedAndFilteredLogs.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-900 dark:text-slate-100">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-slate-100">{Math.min(currentPage * itemsPerPage, sortedAndFilteredLogs.length)}</span> of <span className="text-slate-900 dark:text-slate-100">{sortedAndFilteredLogs.length}</span> entries
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-400"
              >
                <ChevronsLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-400"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center gap-1 px-2">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs font-black transition-all",
                        currentPage === pageNum 
                          ? "bg-primary text-white shadow-lg shadow-primary/20" 
                          : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-400"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-600 dark:text-slate-400"
              >
                <ChevronsRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
