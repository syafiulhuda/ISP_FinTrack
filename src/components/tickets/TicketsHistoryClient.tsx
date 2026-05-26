"use client";

import { useState } from "react";
import { Search, Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function TicketsHistoryClient({ tickets }: { tickets: any[] }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const filteredTickets = tickets.filter(t => 
    t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
    t.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search history by ID, customer..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
          />
        </div>
        <div className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
          Showing {filteredTickets.length} tickets
        </div>
      </div>

      <div className="md:bg-white md:dark:bg-slate-900 md:rounded-2xl md:border border-slate-200 dark:border-slate-800 md:shadow-sm overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-black text-slate-500 uppercase tracking-widest">
          <div className="col-span-3">Ticket ID & Priority</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-4">Issue Description</div>
          <div className="col-span-2 text-right">Resolved Date</div>
        </div>

        {/* List Body */}
        <div className="flex flex-col gap-4 md:gap-0 md:divide-y md:divide-slate-100 md:dark:divide-slate-800">
          {filteredTickets.map((ticket) => {
            const isExpanded = expandedId === ticket.id;
            return (
              <div key={ticket.id} className="flex flex-col md:grid md:grid-cols-12 md:gap-4 p-5 md:p-4 bg-white dark:bg-slate-900 md:bg-transparent md:dark:bg-transparent rounded-2xl md:rounded-none border border-slate-200 dark:border-slate-800 md:border-none shadow-sm md:shadow-none hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
                
                {/* Always visible mobile header / Desktop Columns 1 & 2 */}
                <div className="md:col-span-6 grid grid-cols-[1fr_auto] md:grid-cols-2 gap-4 items-center w-full cursor-pointer md:cursor-auto" onClick={() => { if(window.innerWidth < 768) setExpandedId(isExpanded ? null : ticket.id) }}>
                  {/* Column 1: Ticket ID */}
                  <div className="flex flex-col gap-2 items-start">
                    <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-700 dark:text-slate-300">
                      {ticket.ticket_number}
                    </span>
                    <span className={cn("px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider inline-block", 
                      ticket.priority === 'CRITICAL' ? 'bg-red-50 text-red-600 ring-1 ring-red-500/20 dark:bg-red-500/10 dark:text-red-400' :
                      ticket.priority === 'HIGH' ? 'bg-orange-50 text-orange-600 ring-1 ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400' :
                      ticket.priority === 'MEDIUM' ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400' :
                      'bg-slate-50 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400'
                    )}>
                      {ticket.priority}
                    </span>
                  </div>
                  
                  {/* Column 2: Customer & Expand Button */}
                  <div className="flex items-center justify-end md:justify-start gap-3 text-right md:text-left">
                    <span className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2 md:truncate">
                      {ticket.customer_name}
                    </span>
                    {/* Mobile Expand Button */}
                    <button 
                      className="md:hidden p-1.5 shrink-0 text-slate-400 hover:text-slate-600 bg-slate-100 dark:bg-slate-800 rounded-full"
                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : ticket.id); }}
                    >
                      <ChevronDown size={16} className={cn("transition-transform duration-200", isExpanded && "rotate-180")} />
                    </button>
                  </div>
                </div>

                {/* The Expandable Details */}
                <div className={cn("md:col-span-6 md:grid md:grid-cols-6 gap-3 md:gap-4 flex-col mt-4 md:mt-0 pt-4 md:pt-0 border-t border-slate-100 dark:border-slate-800 md:border-t-0", isExpanded ? "flex" : "hidden md:grid")}>
                  
                  {/* Description */}
                  <div className="md:col-span-4 flex flex-col gap-1">
                    <span className="md:hidden text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Issue Description</span>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {ticket.description}
                    </p>
                    <div className="mt-1">
                      <span className="inline-block text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        {ticket.issue_category}
                      </span>
                    </div>
                  </div>

                  {/* Resolved Date */}
                  <div className="md:col-span-2 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2 mt-2 md:mt-0 pt-3 md:pt-0 border-t border-slate-50 dark:border-slate-800/50 md:border-t-0 md:text-right">
                    <span className="md:hidden text-[9px] font-bold text-slate-400 uppercase tracking-widest">Resolved</span>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(ticket.created_at_str).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {new Date(ticket.created_at_str).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredTickets.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl md:bg-transparent md:dark:bg-transparent border border-slate-200 dark:border-slate-800 md:border-none shadow-sm md:shadow-none">
              <div className="flex flex-col items-center justify-center text-slate-400">
                <Search size={32} className="mb-4 opacity-50" />
                <p className="font-medium">No history tickets found matching your criteria.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
