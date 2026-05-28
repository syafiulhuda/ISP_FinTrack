"use client";

import { useState } from"react";
import { Search, Calendar, ChevronDown, ChevronLeft, ChevronRight, User } from"lucide-react";
import { cn } from"@/lib/utils";

export function TicketsHistoryClient({ tickets }: { tickets: any[] }) {
 const [search, setSearch] = useState("");
 const [expandedId, setExpandedId] = useState<string | null>(null);
 const [currentPage, setCurrentPage] = useState(1);
 const TICKETS_PER_PAGE = 10;
 
 const filteredTickets = tickets.filter(t => 
 t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
 t.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
 t.description?.toLowerCase().includes(search.toLowerCase())
 );

 const totalPages = Math.ceil(filteredTickets.length / TICKETS_PER_PAGE);
 const paginatedTickets = filteredTickets.slice((currentPage - 1) * TICKETS_PER_PAGE, currentPage * TICKETS_PER_PAGE);

 // Reset page when search changes
 const handleSearchChange = (val: string) => {
 setSearch(val);
 setCurrentPage(1);
 };

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div className="relative w-full sm:w-96">
 <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"/>
 <input 
 type="text"
 placeholder="Search history by ID, customer..."
 value={search}
 onChange={(e) => handleSearchChange(e.target.value)}
 className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-foreground focus:ring-2 focus:ring-emerald-500 outline-none transition-shadow"
 />
 </div>
 <div className="text-sm font-bold text-muted-foreground bg-muted px-4 py-2.5 rounded-xl border border-border shadow-sm shrink-0">
 Showing {filteredTickets.length} tickets
 </div>
 </div>

 <div className="md:bg-card md:rounded-2xl md:border border-border md:shadow-sm overflow-hidden">
 {/* Desktop Header */}
 <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-border bg-muted text-xs font-black text-muted-foreground uppercase tracking-widest">
 <div className="col-span-4">Ticket ID & Priority</div>
 <div className="col-span-2">Customer</div>
 <div className="col-span-4">Issue Description</div>
 <div className="col-span-2 text-right">Resolved Date</div>
 </div>

 {/* List Body */}
 <div className="flex flex-col gap-4 md:gap-0 md:divide-y md:divide-slate-100 md:dark:divide-slate-800">
 {paginatedTickets.map((ticket) => {
 const isExpanded = expandedId === ticket.id;
 return (
 <div key={ticket.id} className="flex flex-col md:grid md:grid-cols-12 md:gap-4 p-5 md:p-4 bg-card md:bg-transparent md:dark:bg-transparent rounded-2xl md:rounded-none border border-border md:border-none shadow-sm md:shadow-none hover:bg-muted dark:hover:bg-muted/20 transition-colors group">
 
 {/* Always visible mobile header / Desktop Column 1 */}
 <div className="md:col-span-4 grid grid-cols-[1fr_auto] md:flex md:flex-col gap-4 md:gap-2 items-center md:items-start w-full cursor-pointer md:cursor-auto"onClick={() => { if(window.innerWidth < 768) setExpandedId(isExpanded ? null : ticket.id) }}>
 {/* Column 1: Ticket ID */}
 <div className="flex flex-col gap-2 items-start">
 <span className="text-[11px] xl:text-xs font-mono font-bold bg-muted px-2 py-1 rounded-md text-foreground whitespace-nowrap">
 {ticket.ticket_number}
 </span>
 <span className={cn("px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider inline-block", 
 ticket.priority ==='CRITICAL'?'bg-red-50 text-red-600 ring-1 ring-red-500/20 dark:bg-red-500/10 dark:text-red-400':
 ticket.priority ==='HIGH'?'bg-orange-50 text-orange-600 ring-1 ring-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400':
 ticket.priority ==='MEDIUM'?'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400':
'bg-muted text-muted-foreground ring-1 ring-border'
 )}>
 {ticket.priority}
 </span>
 </div>
 
 {/* Mobile Only: Customer & Expand Button */}
 <div className="md:hidden flex items-center justify-end gap-3 text-right">
 <span className="font-bold text-sm text-foreground line-clamp-2">
 {ticket.customer_name}
 </span>
 {/* Mobile Expand Button */}
 <button 
 className="p-1.5 shrink-0 text-muted-foreground hover:text-muted-foreground bg-muted rounded-full"
 onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : ticket.id); }}
 >
 <ChevronDown size={16} className={cn("transition-transform duration-200", isExpanded &&"rotate-180")} />
 </button>
 </div>
 </div>

 {/* The Expandable Details / Desktop Columns 2, 3, 4 */}
 <div className={cn("md:col-span-8 md:grid md:grid-cols-8 gap-3 md:gap-4 flex-col mt-4 md:mt-0 pt-4 md:pt-0 border-t border-border md:border-t-0", isExpanded ?"flex":"hidden md:grid")}>
 
 {/* Column 2: Customer (Desktop Only) */}
 <div className="hidden md:block md:col-span-2 pt-1">
 <span className="font-bold text-sm text-foreground truncate block"title={ticket.customer_name}>
 {ticket.customer_name}
 </span>
 </div>

 {/* Column 3: Description */}
 <div className="md:col-span-4 flex flex-col gap-1">
 <span className="md:hidden text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Issue Description</span>
 <p className="text-sm font-medium text-foreground">
 {ticket.description}
 </p>
 <div className="mt-1 flex items-center gap-2">
 <span className="inline-block text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-md">
 {ticket.issue_category}
 </span>
 {ticket.assigned_to && (
 <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded-md">
 <User size={10} />
 {ticket.assigned_to}
 </span>
 )}
 </div>
 </div>

 {/* Column 4: Resolved Date */}
 <div className="md:col-span-2 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2 mt-2 md:mt-0 pt-3 md:pt-0 border-t border-border md:border-t-0 md:text-right">
 <span className="md:hidden text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Resolved</span>
 <div className="flex flex-col items-end gap-1">
 <span className="text-sm font-bold text-foreground flex items-center gap-1.5 whitespace-nowrap">
 <Calendar size={14} className="text-muted-foreground"/>
 {new Date(ticket.created_at_str).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric'})}
 </span>
 <span className="text-xs text-muted-foreground font-medium">
 {new Date(ticket.created_at_str).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit'})}
 </span>
 </div>
 </div>
 </div>
 </div>
 );
 })}

 {filteredTickets.length === 0 && (
 <div className="p-12 text-center bg-card rounded-2xl md:bg-transparent md:dark:bg-transparent border border-border md:border-none shadow-sm md:shadow-none">
 <div className="flex flex-col items-center justify-center text-muted-foreground">
 <Search size={32} className="mb-4 opacity-50"/>
 <p className="font-medium">No history tickets found matching your criteria.</p>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Pagination Controls */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between bg-card p-4 rounded-2xl border border-border shadow-sm mt-4">
 <div className="text-sm font-medium text-muted-foreground">
 Page {currentPage} of {totalPages}
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
 disabled={currentPage === 1}
 className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 <ChevronLeft size={18} />
 </button>
 <button
 onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
 disabled={currentPage === totalPages}
 className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 <ChevronRight size={18} />
 </button>
 </div>
 </div>
 )}
 </div>
 );
}
