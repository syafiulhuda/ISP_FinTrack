"use client";

import { useState, useEffect, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { AlertCircle, Clock, CheckCircle, Search, Filter, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { updateTicketStatus, getResolvedHistoryTickets } from "@/actions/tickets";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  ticket_number: string;
  customer_id: string;
  customer_name: string;
  issue_category: string;
  description: string;
  status: string;
  priority: string;
  created_at_str: string;
  resolved_at_str?: string | null;
}

export function TicketsKanban({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [showHistoryOnly, setShowHistoryOnly] = useState(false);
  const [expandedCols, setExpandedCols] = useState<Record<string, boolean>>({
    'OPEN': true,
    'IN_PROGRESS': true
  });
  const [isResolvedExpanded, setIsResolvedExpanded] = useState(false);
  const resolvedRef = useRef<HTMLDivElement>(null);
  const [resolvedHeight, setResolvedHeight] = useState(80);
  const [showResolvedModal, setShowResolvedModal] = useState(false);
  const [resolvedHistoryData, setResolvedHistoryData] = useState<Ticket[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (showResolvedModal && resolvedHistoryData.length === 0) {
      setIsLoadingHistory(true);
      getResolvedHistoryTickets().then(data => {
        setResolvedHistoryData(data as Ticket[]);
        setIsLoadingHistory(false);
      });
    }
  }, [showResolvedModal]);

  useEffect(() => {
    if (!resolvedRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use borderBoxSize for full height including padding/borders
        const height = entry.borderBoxSize?.[0]?.blockSize || entry.target.getBoundingClientRect().height;
        // Subtract 4px to ensure a tiny overlap with the pseudo-element mask
        setResolvedHeight(Math.round(height) - 4);
      }
    });
    
    observer.observe(resolvedRef.current);
    return () => observer.disconnect();
  }, []);

  const unresolvedHistoryTickets = tickets.filter(t => 
    t.status !== 'RESOLVED' && 
    t.status !== 'CLOSED' && 
    t.created_at_str && 
    new Date(t.created_at_str).toDateString() !== new Date().toDateString()
  );

  useEffect(() => {
    if (unresolvedHistoryTickets.length === 0 && showHistoryOnly) {
      setShowHistoryOnly(false);
    }
  }, [unresolvedHistoryTickets.length, showHistoryOnly]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("ticketId", id);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("ticketId");
    
    // Optimistic UI Update
    setTickets(prev => prev.map(t => t.id.toString() === id ? { ...t, status: newStatus } : t));
    
    const res = await updateTicketStatus(id, newStatus);
    if (!res.success) {
      toast.error("Failed to update ticket status");
      // Revert if failed
      setTickets(initialTickets); 
    } else {
      toast.success(`Ticket moved to ${newStatus}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch = t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
      t.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = priorityFilter ? t.priority === priorityFilter : true;
    const matchesHistory = showHistoryOnly 
      ? (t.status !== 'RESOLVED' && t.status !== 'CLOSED' && t.created_at_str && new Date(t.created_at_str).toDateString() !== new Date().toDateString())
      : true;
    return matchesSearch && matchesPriority && matchesHistory;
  });

  const columns = [
    { id: "OPEN", label: "Open Tickets", color: "border-amber-500", bg: "bg-amber-500/10", icon: AlertCircle },
    { id: "IN_PROGRESS", label: "In Progress", color: "border-blue-500", bg: "bg-blue-500/10", icon: Clock }
  ];

  const resolvedTickets = filteredTickets.filter(t => t.status === "RESOLVED");

  return (
    <div className="flex flex-col">
      {/* Controls */}
      <div className="flex flex-col xl:flex-row justify-between gap-4 mb-8">
        <div className="relative w-full xl:w-96 shrink-0">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search tickets by ID or Customer..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full pl-10 pr-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <button
            onClick={() => setShowHistoryOnly(!showHistoryOnly)}
            disabled={unresolvedHistoryTickets.length === 0}
            className={cn("flex items-center justify-center gap-2 px-5 py-3 border rounded-full text-sm font-bold shadow-sm transition-colors whitespace-nowrap w-full sm:w-auto",
              showHistoryOnly 
                ? "bg-red-50 border-red-500 text-red-600 dark:bg-red-500/10 dark:text-red-400" 
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50",
              unresolvedHistoryTickets.length === 0 && "opacity-50 cursor-not-allowed"
            )}
          >
            Unresolved History
            {unresolvedHistoryTickets.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-xs">
                {unresolvedHistoryTickets.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setShowResolvedModal(true)}
            className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors whitespace-nowrap"
          >
            Resolved History
          </button>

          <div className="relative flex-1 sm:flex-none">
            <button 
              onClick={() => setShowFilters(!showFilters)}
            className={cn("flex justify-center items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border rounded-full text-sm font-bold shadow-sm transition-colors w-full",
              priorityFilter 
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" 
                : "border-slate-200 dark:border-slate-800"
            )}
          >
            <Filter size={16} /> Filter
            {(priorityFilter || showHistoryOnly) && (
              <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-0 right-0 -translate-x-2 translate-y-2" />
            )}
          </button>

          {showFilters && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                <h4 className="font-bold text-sm dark:text-white">Filter Tickets</h4>
                <div className="flex items-center gap-3">
                  {(priorityFilter || showHistoryOnly) && (
                    <button onClick={() => { setPriorityFilter(null); setShowHistoryOnly(false); }} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600">Clear All</button>
                  )}
                  <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block">By Priority</label>
                  <div className="flex flex-wrap gap-2">
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
                      <button
                        key={p}
                        onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
                        className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors",
                          priorityFilter === p 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {unresolvedHistoryTickets.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-800/50 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-red-800 dark:text-red-300">Unresolved History Tickets</h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                You have {unresolvedHistoryTickets.length} ticket(s) from previous days that need your attention.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowHistoryOnly(!showHistoryOnly)}
            className={cn("px-4 py-2 font-bold text-sm rounded-xl transition-colors whitespace-nowrap",
              showHistoryOnly 
                ? "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20" 
                : "bg-red-200 text-red-700 hover:bg-red-300 dark:bg-red-800/50 dark:text-red-200 dark:hover:bg-red-800"
            )}
          >
            {showHistoryOnly ? "View All Tickets" : "Show History Only"}
          </button>
        </div>
      )}

      <div ref={resolvedRef} className="sticky top-0 z-30 py-2 bg-slate-50 dark:bg-slate-950 -mx-4 px-4">
        {/* Resolved Tickets Section */}
        <div 
          className="bg-white dark:bg-slate-900 border-2 border-dashed border-emerald-200 dark:border-emerald-900/50 rounded-2xl shadow-sm overflow-hidden shrink-0"
          onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, 'RESOLVED')}
      >
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          onClick={() => setIsResolvedExpanded(!isResolvedExpanded)}
        >
          <div className="flex items-center gap-3">
            <CheckCircle size={18} className="text-emerald-500" />
            <h3 className="font-black text-slate-900 dark:text-white">Resolved Today <span className="text-xs font-normal text-slate-500">(Drop to Resolve)</span></h3>
            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              {resolvedTickets.length}
            </span>
          </div>
          <ChevronDown size={18} className={cn("text-slate-400 transition-transform", isResolvedExpanded && "rotate-180")} />
        </div>

        <AnimatePresence>
          {isResolvedExpanded && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-100 dark:border-slate-800 pb-4"
            >
              <div className="max-h-60 overflow-y-auto no-scrollbar pt-4 px-4">
                <div className="flex flex-col gap-3">
                  {resolvedTickets.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm font-bold py-4">No tickets resolved today.</p>
                  ) : (
                    resolvedTickets.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{t.ticket_number} - {t.customer_name}</span>
                          <span className="text-[10px] text-slate-500 truncate max-w-md">{t.description}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(t.created_at_str).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
      </div>

      {/* Kanban Board */}
      <div className="pb-12">
        <div className="pb-4">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4 lg:gap-6 min-w-0 p-1">
          {columns.map((col, index) => (
            <div 
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="relative w-full lg:w-auto flex flex-col h-full"
            >
              {index === 0 && (
                <div className="hidden lg:block absolute -right-3 top-0 bottom-0 w-px border-r-2 border-dashed border-slate-200 dark:border-slate-800 translate-x-1/2" />
              )}
              <div 
                className="sticky z-20 pt-1 pb-2 bg-slate-50 dark:bg-slate-950 -mx-3 px-3 before:absolute before:-top-4 before:inset-x-0 before:h-4 before:bg-slate-50 dark:before:bg-slate-950"
                style={{ top: `${resolvedHeight}px` }}
              >
                <div 
                  onClick={() => setExpandedCols(prev => ({...prev, [col.id]: !prev[col.id]}))}
                  className={cn("flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-t-4 rounded-2xl shadow-md mb-2 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50", col.color)}
                >
                  <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <col.icon size={16} className={cn(
                      col.id === 'OPEN' ? 'text-amber-500' : 'text-blue-500'
                    )} />
                    {col.label}
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-xs font-black px-2.5 py-1 rounded-full", col.bg, 
                        col.id === 'OPEN' ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'
                    )}>
                      {filteredTickets.filter(t => t.status === col.id).length}
                    </span>
                    <ChevronDown size={16} className={cn("text-slate-400 transition-transform lg:hidden", expandedCols[col.id] && "rotate-180")} />
                  </div>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {expandedCols[col.id] && (
                  <m.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden lg:!h-auto lg:!opacity-100"
                  >
                    <div className="flex-1 space-y-4 rounded-xl pb-4 pt-2">
                {filteredTickets.filter(t => t.status === col.id).map(t => (
                  <m.div
                    layoutId={t.id}
                    key={t.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, t.id)}
                    className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-500/50 hover:shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider", 
                        t.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                        t.priority === 'HIGH' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                        t.priority === 'MEDIUM' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      )}>
                        {t.priority}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 font-bold">{t.ticket_number.split('-')[1]}</span>
                    </div>
                    
                    <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1 line-clamp-2 min-h-[2.5rem]">{t.description}</h4>
                    <p className="text-[11px] font-bold text-slate-500 mb-4">{t.customer_name}</p>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.issue_category}</span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(t.created_at_str).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </m.div>
                ))}
                {filteredTickets.filter(t => t.status === col.id).length === 0 && (
                  <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-400 text-sm font-bold">
                    Drop here
                  </div>
                )}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* Resolved History Modal */}
      <AnimatePresence>
        {showResolvedModal && (
          <m.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 md:left-[256px] z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-md"
          >
            <m.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-[0_0_100px_rgba(16,185,129,0.1)] dark:shadow-[0_0_100px_rgba(16,185,129,0.05)] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-800/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center">
                    <CheckCircle size={28} className="drop-shadow-sm" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Resolved History</h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tickets successfully resolved on previous days</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowResolvedModal(false)}
                  className="w-10 h-10 rounded-full bg-slate-100/80 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all relative z-10"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-950/50 custom-scrollbar">
                {isLoadingHistory ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-5">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
                      <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                    </div>
                    <p className="text-slate-500 font-bold tracking-wide animate-pulse">Loading history records...</p>
                  </div>
                ) : resolvedHistoryData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-400 mb-5 ring-1 ring-slate-200 dark:ring-slate-800">
                      <Search size={40} className="opacity-50" />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">No Records Found</h3>
                    <p className="text-slate-500 font-medium max-w-sm">There are no resolved tickets from previous days in the database.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {resolvedHistoryData.map((ticket, i) => (
                      <m.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={ticket.id} 
                        className="group bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-emerald-500/30 dark:hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
                      >
                        {/* Status accent line */}
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                        <div className="flex-1 min-w-0 pl-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={cn("px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider", 
                              ticket.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 ring-1 ring-red-500/20' :
                              ticket.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 ring-1 ring-orange-500/20' :
                              ticket.priority === 'MEDIUM' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400 ring-1 ring-indigo-500/20' :
                              'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700'
                            )}>
                              {ticket.priority}
                            </span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                              {ticket.ticket_number.split('-').slice(1).join('-')}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {ticket.description}
                          </h4>
                        </div>
                        
                        <div className="flex items-center gap-6 shrink-0 sm:border-l sm:border-slate-100 dark:sm:border-slate-800/80 sm:pl-6">
                          <div className="flex flex-col w-32">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Customer</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{ticket.customer_name}</span>
                          </div>
                          <div className="flex flex-col w-24 text-right">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Resolved</span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                              {ticket.resolved_at_str && new Date(ticket.resolved_at_str).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </m.div>
                    ))}
                  </div>
                )}
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
