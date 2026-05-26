"use client";

import { useState, useEffect, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { AlertCircle, Clock, CheckCircle, Search, Filter, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { updateTicketStatus, getResolvedHistoryTickets } from "@/actions/tickets";
import { cn } from "@/lib/utils";
import Link from "next/link";

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

  const todaysUnresolvedTickets = tickets.filter(t =>
    t.status !== 'RESOLVED' &&
    t.status !== 'CLOSED' &&
    t.created_at_str &&
    new Date(t.created_at_str).toDateString() === new Date().toDateString()
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

    const ticket = tickets.find(t => t.id.toString() === id);
    
    // Workflow Rule: Prevent skipping "In Progress"
    if (ticket && ticket.status === 'OPEN' && newStatus === 'RESOLVED') {
      toast.error("Action restricted!", {
        description: "Please move the ticket to 'In Progress' first before resolving it.",
        icon: <AlertCircle size={16} className="text-rose-500" />
      });
      return;
    }

    // Optimistic UI Update with real-time timestamp
    setTickets(prev => prev.map(t => t.id.toString() === id ? { 
      ...t, 
      status: newStatus,
      resolved_at_str: (newStatus === 'RESOLVED' || newStatus === 'CLOSED') ? new Date().toISOString() : null
    } : t));

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

    const isUnresolvedHistory = t.status !== 'RESOLVED' && t.status !== 'CLOSED' && t.created_at_str && new Date(t.created_at_str).toDateString() !== new Date().toDateString();

    const matchesHistory = showHistoryOnly
      ? isUnresolvedHistory
      : !isUnresolvedHistory;

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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div className="relative w-full lg:w-96 shrink-0 h-fit">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tickets by ID or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full pl-10 pr-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full lg:w-auto">
          <Link
            href="/tickets/history"
            className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors whitespace-nowrap"
          >
            Resolved History
          </Link>

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
              {priorityFilter && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-0 right-0 -translate-x-2 translate-y-2" />
              )}
            </button>

            {showFilters && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-sm dark:text-white">Filter Tickets</h4>
                  <div className="flex items-center gap-3">
                    {priorityFilter && (
                      <button onClick={() => setPriorityFilter(null)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600">Clear All</button>
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
        <div className={cn("mb-6 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border transition-colors",
          !showHistoryOnly
            ? "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50"
            : "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
        )}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
              !showHistoryOnly
                ? "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                : "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
            )}>
              <AlertCircle size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={cn("font-bold transition-colors truncate",
                !showHistoryOnly ? "text-slate-900 dark:text-slate-100" : "text-amber-900 dark:text-amber-200"
              )}>
                {!showHistoryOnly ? "Today's Tickets" : "Unresolved History Tickets"}
              </h3>
              <p className={cn("text-sm mt-0.5 transition-colors line-clamp-2",
                !showHistoryOnly ? "text-slate-500 dark:text-slate-400" : "text-amber-700 dark:text-amber-400/80"
              )}>
                {!showHistoryOnly
                  ? `You have ${todaysUnresolvedTickets.length} active ticket(s) for today.`
                  : `${unresolvedHistoryTickets.length} ticket(s) from previous days need attention.`
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowHistoryOnly(!showHistoryOnly)}
            className={cn("px-4 py-2 font-bold text-sm rounded-xl transition-all whitespace-nowrap flex items-center justify-center w-full sm:w-auto gap-2 shrink-0",
              !showHistoryOnly
                ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
            )}
          >
            {!showHistoryOnly ? "View Unresolved History" : "View Today's Tickets"}
            {!showHistoryOnly && unresolvedHistoryTickets.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-xs transition-colors">
                {unresolvedHistoryTickets.length}
              </span>
            )}
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
                    onClick={() => setExpandedCols(prev => ({ ...prev, [col.id]: !prev[col.id] }))}
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
                      <ChevronDown size={16} className={cn("text-slate-400 transition-transform", expandedCols[col.id] && "rotate-180")} />
                    </div>
                  </div>
                </div>

                <AnimatePresence initial={false}>
                  {expandedCols[col.id] && (
                    <m.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex-1 space-y-4 rounded-xl pb-4 pt-2">
                        {filteredTickets.filter(t => t.status === col.id).map(t => (
                          <m.div
                            layout
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
    </div>
  );
}
