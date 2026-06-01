"use client";

import { useState, useEffect, useRef } from"react";
import { m, AnimatePresence } from"framer-motion";
import { AlertCircle, Clock, CheckCircle, Search, Filter, ChevronDown, X } from"lucide-react";
import { toast } from"sonner";
import { updateTicketStatus, getResolvedHistoryTickets } from"@/actions/tickets";
import { getAdminProfile } from "@/actions/admin";
import { useQuery } from "@tanstack/react-query";
import { cn } from"@/lib/utils";
import Link from"next/link";

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
 const { data: profile } = useQuery({ queryKey: ['adminProfile'], queryFn: getAdminProfile });
 const isVisitor = profile?.email === 'visitor@gmail.com';

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
 const [dragOverCol, setDragOverCol] = useState<string | null>(null);
 const [draggingId, setDraggingId] = useState<string | null>(null);

 // Modal State for resolving tickets
 const [resolveModalOpen, setResolveModalOpen] = useState(false);
 const [ticketToResolve, setTicketToResolve] = useState<string | null>(null);
 const [assigneeName, setAssigneeName] = useState("");
 const [isSubmitting, setIsSubmitting] = useState(false);

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
 t.status !=='RESOLVED'&&
 t.status !=='CLOSED'&&
 t.created_at_str &&
 new Date(t.created_at_str).toDateString() !== new Date().toDateString()
 );

 const todaysUnresolvedTickets = tickets.filter(t =>
 t.status !=='RESOLVED'&&
 t.status !=='CLOSED'&&
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
  e.dataTransfer.effectAllowed = "move";
  setDraggingId(id);
 };

 const handleDragLeave = () => {
 setDragOverCol(null);
 };

 const handleDragEnd = () => {
  setDraggingId(null);
  setDragOverCol(null);
 };

 const handleDrop = async (e: React.DragEvent, newStatus: string) => {
 e.preventDefault();
 setDragOverCol(null);
 
 const id = e.dataTransfer.getData("ticketId") || draggingId;
 setDraggingId(null);
 
 if (!id) {
 toast.error("Failed to identify ticket. Please try again.");
 return;
 }

 const ticket = tickets.find(t => t.id.toString() === id.toString());

 // Workflow Rule: Prevent skipping "In Progress"
 if (ticket && ticket.status === 'OPEN' && newStatus === 'RESOLVED') {
 toast.error("Action restricted!", {
 description: "Please move the ticket to 'In Progress' first before resolving it.",
 icon: <AlertCircle size={16} className="text-rose-500" />
 });
 return;
 }

 if (newStatus === 'RESOLVED') {
 setTicketToResolve(id.toString());
 setResolveModalOpen(true);
 return;
 }

 // Optimistic UI Update with real-time timestamp
 setTickets(prev => prev.map(t => t.id.toString() === id.toString() ? {
 ...t,
 status: newStatus,
 resolved_at_str: (newStatus === 'RESOLVED' || newStatus === 'CLOSED') ? new Date().toISOString() : null
 } : t));

 const res = await updateTicketStatus(id.toString(), newStatus);
 if (!res.success) {
 toast.error("Failed to update ticket status");
 // Revert if failed
 setTickets(initialTickets);
 } else {
 toast.success(`Ticket moved to ${newStatus}`);
 }
 };

 const submitResolve = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!ticketToResolve || !assigneeName.trim()) return;

 setIsSubmitting(true);

 // Optimistic UI Update with real-time timestamp
 setTickets(prev => prev.map(t => t.id.toString() === ticketToResolve ? {
 ...t,
 status:'RESOLVED',
 resolved_at_str: new Date().toISOString()
 } : t));

 const res = await updateTicketStatus(ticketToResolve,'RESOLVED', assigneeName.trim());
 if (!res.success) {
 toast.error("Failed to resolve ticket");
 // Revert if failed
 setTickets(initialTickets);
 } else {
 toast.success(`Ticket Resolved by ${assigneeName}`);
 }

 setIsSubmitting(false);
 setResolveModalOpen(false);
 setTicketToResolve(null);
 setAssigneeName("");
 };

 const handleDragOver = (e: React.DragEvent, colId: string) => {
 e.preventDefault();
 e.dataTransfer.dropEffect ="move";
 if (dragOverCol !== colId) {
 setDragOverCol(colId);
 }
 };

 const filteredTickets = tickets.filter(t => {
 const matchesSearch = t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
 t.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
 t.description?.toLowerCase().includes(search.toLowerCase());
 const matchesPriority = priorityFilter ? t.priority === priorityFilter : true;

 const isUnresolvedHistory = t.status !=='RESOLVED'&& t.status !=='CLOSED'&& t.created_at_str && new Date(t.created_at_str).toDateString() !== new Date().toDateString();

 const matchesHistory = showHistoryOnly
 ? isUnresolvedHistory
 : !isUnresolvedHistory;

 return matchesSearch && matchesPriority && matchesHistory;
 });

 const columns = [
 { id:"OPEN", label:"Open Tickets", color:"border-amber-500", bg:"bg-amber-500/10", icon: AlertCircle },
 { id:"IN_PROGRESS", label:"In Progress", color:"border-blue-500", bg:"bg-blue-500/10", icon: Clock }
 ];

 const resolvedTickets = filteredTickets.filter(t => t.status ==="RESOLVED");

 return (
 <div className="flex flex-col">
 {/* Controls */}
 <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
 <div className="relative w-full lg:w-96 shrink-0 h-fit">
 <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"/>
 <input
 type="text"
 placeholder="Search tickets by ID or Customer..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-card border border-border rounded-full pl-10 pr-4 py-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-indigo-500 outline-none"
 />
 </div>
 <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 w-full lg:w-auto">
 <Link
 href="/tickets/history"
 className="flex flex-1 sm:flex-none justify-center items-center gap-2 px-5 py-3 bg-card border border-border text-foreground rounded-full text-sm font-bold shadow-sm hover:bg-muted dark:hover:bg-muted/50 transition-colors whitespace-nowrap"
 >
 Resolved History
 </Link>

 <div className="relative flex-1 sm:flex-none">
 <button
 onClick={() => setShowFilters(!showFilters)}
 className={cn("flex justify-center items-center gap-2 px-6 py-3 bg-card border rounded-full text-sm font-bold shadow-sm transition-colors w-full",
 priorityFilter
 ?"border-indigo-500 text-indigo-600 dark:text-indigo-400"
 :"border-border"
 )}
 >
 <Filter size={16} /> Filter
 {priorityFilter && (
 <span className="w-2 h-2 rounded-full bg-indigo-500 absolute top-0 right-0 -translate-x-2 translate-y-2"/>
 )}
 </button>

 {showFilters && (
 <div className="absolute right-0 mt-2 w-72 bg-card border border-border rounded-2xl shadow-xl z-50 p-4">
 <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
 <h4 className="font-bold text-sm dark:text-white">Filter Tickets</h4>
 <div className="flex items-center gap-3">
 {priorityFilter && (
 <button onClick={() => setPriorityFilter(null)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600">Clear All</button>
 )}
 <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-muted-foreground">
 <X size={16} />
 </button>
 </div>
 </div>

 <div className="space-y-4">
 <div>
 <label className="text-xs font-bold text-muted-foreground mb-2 block">By Priority</label>
 <div className="flex flex-wrap gap-2">
 {['CRITICAL','HIGH','MEDIUM','LOW'].map(p => (
 <button
 key={p}
 onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
 className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors",
 priorityFilter === p
 ?'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/30 dark:text-indigo-300'
 :'bg-muted border-border text-muted-foreground hover:bg-muted'
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
 ?"bg-muted/40 border-border/50"
 :"bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
 )}>
 <div className="flex items-center gap-3 overflow-hidden">
 <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors",
 !showHistoryOnly
 ?"bg-muted text-muted-foreground"
 :"bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
 )}>
 <AlertCircle size={20} />
 </div>
 <div className="min-w-0 flex-1">
 <h3 className={cn("font-bold transition-colors truncate",
 !showHistoryOnly ?"text-foreground":"text-amber-900 dark:text-amber-200"
 )}>
 {!showHistoryOnly ?"Today's Tickets":"Unresolved History Tickets"}
 </h3>
 <p className={cn("text-sm mt-0.5 transition-colors line-clamp-2",
 !showHistoryOnly ?"text-muted-foreground":"text-amber-700 dark:text-amber-400/80"
 )}>
 {!showHistoryOnly
 ?`You have ${todaysUnresolvedTickets.length} active ticket(s) for today.`
 :`${unresolvedHistoryTickets.length} ticket(s) from previous days need attention.`
 }
 </p>
 </div>
 </div>
 <button
 onClick={() => setShowHistoryOnly(!showHistoryOnly)}
 className={cn("px-4 py-2 font-bold text-sm rounded-xl transition-all whitespace-nowrap flex items-center justify-center w-full sm:w-auto gap-2 shrink-0",
 !showHistoryOnly
 ?"bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 dark:hover:bg-red-500/20"
 :"bg-card text-foreground border border-border hover:bg-muted dark:hover:bg-muted/50 shadow-sm"
 )}
 >
 {!showHistoryOnly ?"View Unresolved History":"View Today's Tickets"}
 {!showHistoryOnly && unresolvedHistoryTickets.length > 0 && (
 <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-xs transition-colors">
 {unresolvedHistoryTickets.length}
 </span>
 )}
 </button>
 </div>
 )}

 <div ref={resolvedRef} className="sticky top-0 z-30 py-2 bg-background -mx-4 px-4">
 {/* Resolved Tickets Section */}
 <div
 className={cn("bg-card border-2 rounded-2xl shadow-sm overflow-hidden shrink-0 transition-colors duration-300",
 dragOverCol ==='RESOLVED'?"border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 scale-[1.02]":"border-dashed border-emerald-200 dark:border-emerald-900/50"
 )}
 onDragOver={(e) => handleDragOver(e,'RESOLVED')}
 onDragLeave={handleDragLeave}
 onDrop={(e) => handleDrop(e,'RESOLVED')}
 >
 <div
 className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted dark:hover:bg-muted/50 transition-colors"
 onClick={() => setIsResolvedExpanded(!isResolvedExpanded)}
 >
 <div className="flex items-center gap-3">
 <CheckCircle size={18} className="text-emerald-500"/>
 <h3 className="font-black text-foreground">Resolved Today</h3>
 <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
 {resolvedTickets.length}
 </span>
 </div>
 <ChevronDown size={18} className={cn("text-muted-foreground transition-transform", isResolvedExpanded &&"rotate-180")} />
 </div>

 <AnimatePresence>
 {isResolvedExpanded && (
 <m.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="border-t border-border pb-4"
 >
 <div className="max-h-60 overflow-y-auto no-scrollbar pt-4 px-4">
 <div className="flex flex-col gap-3">
 {resolvedTickets.length === 0 ? (
 <p className="text-center text-muted-foreground text-sm font-bold py-4">No tickets resolved today.</p>
 ) : (
 resolvedTickets.map(t => (
 <div key={t.id} className="flex items-center justify-between p-3 bg-muted rounded-xl border border-border">
 <div className="flex flex-col gap-1">
 <span className="text-xs font-bold text-foreground">{t.ticket_number} - {t.customer_name}</span>
 <span className="text-[10px] text-muted-foreground truncate max-w-md">{t.description}</span>
 </div>
 <span suppressHydrationWarning className="text-[10px] font-bold text-muted-foreground">
 {new Date(t.created_at_str).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit'})}
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
 onDragOver={(e) => handleDragOver(e, col.id)}
 onDragLeave={handleDragLeave}
 onDrop={(e) => handleDrop(e, col.id)}
 className="relative w-full lg:w-auto flex flex-col h-full"
 >
 {index === 0 && (
 <div className="hidden lg:block absolute -right-3 top-0 bottom-0 w-px border-r-2 border-dashed border-border translate-x-1/2"/>
 )}
 <div
 className="sticky z-20 pt-1 pb-2 bg-background -mx-3 px-3 before:absolute before:-top-4 before:inset-x-0 before:h-4 before:bg-muted dark:before:bg-slate-950"
 style={{ top:`${resolvedHeight}px`}}
 >
 <div
 onClick={() => setExpandedCols(prev => ({ ...prev, [col.id]: !prev[col.id] }))}
 className={cn(
  "flex items-center justify-between p-4 bg-card border border-t-4 rounded-2xl shadow-md mb-2 cursor-pointer transition-all hover:bg-muted dark:hover:bg-muted/50",
  col.color,
  dragOverCol === col.id
   ? "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-900/30 scale-[1.02] shadow-lg shadow-indigo-500/20"
   : "border-border"
 )}
 >
 <h3 className="font-black text-foreground flex items-center gap-2">
 <col.icon size={16} className={cn(
 col.id ==='OPEN'?'text-amber-500':'text-blue-500'
 )} />
 {col.label}
 </h3>
 <div className="flex items-center gap-3">
 <span className={cn("text-xs font-black px-2.5 py-1 rounded-full", col.bg,
 col.id ==='OPEN'?'text-amber-700 dark:text-amber-400':'text-blue-700 dark:text-blue-400'
 )}>
 {filteredTickets.filter(t => t.status === col.id).length}
 </span>
 <ChevronDown size={16} className={cn("text-muted-foreground transition-transform", expandedCols[col.id] &&"rotate-180")} />
 </div>
 </div>
 </div>

 <AnimatePresence initial={false}>
 {expandedCols[col.id] && (
 <m.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden"
 >
 <div className="flex-1 space-y-4 rounded-xl pb-4 pt-2">
 {filteredTickets.filter(t => t.status === col.id).map(t => (
 <m.div
 layout
 key={t.id}
 draggable={!isVisitor}
 onDragStart={(e) => !isVisitor && handleDragStart(e as unknown as React.DragEvent, t.id)}
 onDragEnd={handleDragEnd}
 style={{ WebkitTouchCallout:'none'}}
 className={cn(
  "p-5 bg-card border border-border rounded-2xl shadow-sm hover:border-indigo-500/50 hover:shadow-lg transition-all select-none touch-pan-y",
  !isVisitor && "cursor-grab active:cursor-grabbing",
  draggingId === t.id && "opacity-40 scale-95 rotate-1 shadow-2xl border-primary/50 ring-2 ring-primary/30"
 )}
 >
 <div className="flex justify-between items-start mb-3">
 <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
 t.priority ==='CRITICAL'?'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400':
 t.priority ==='HIGH'?'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400':
 t.priority ==='MEDIUM'?'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400':
'bg-muted text-muted-foreground'
 )}>
 {t.priority}
 </span>
 <span className="text-[10px] font-mono text-muted-foreground font-bold">{t.ticket_number.split('-')[1]}</span>
 </div>

 <h4 className="text-sm font-black text-foreground mb-1 line-clamp-2 min-h-[2.5rem]">{t.description}</h4>
 <p className="text-[11px] font-bold text-muted-foreground mb-4">{t.customer_name}</p>

 <div className="flex justify-between items-center pt-3 border-t border-border">
 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t.issue_category}</span>
 <span suppressHydrationWarning className="text-[10px] font-bold text-muted-foreground">
 {new Date(t.created_at_str).toLocaleDateString('id-ID', { month:'short', day:'numeric'})}
 </span>
 </div>
 
 {/* Mobile Quick Actions (Visible primarily on touch devices or smaller screens) */}
 <div className="mt-4 pt-3 flex items-center justify-end border-t border-slate-50 lg:hidden">
 {(!isVisitor && col.id ==='OPEN')? (
 <button
 onClick={(e) => {
 e.stopPropagation();
 const mockEvent = { preventDefault: () => {}, dataTransfer: { getData: () => t.id.toString() } } as unknown as React.DragEvent;
 handleDrop(mockEvent,'IN_PROGRESS');
 }}
 className="text-xs font-bold px-4 py-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 active:scale-95 transition-transform"
 >
 Start Progress &rarr;
 </button>
 ) : (!isVisitor && col.id ==='IN_PROGRESS')? (
 <button
 onClick={(e) => {
 e.stopPropagation();
 const mockEvent = { preventDefault: () => {}, dataTransfer: { getData: () => t.id.toString() } } as unknown as React.DragEvent;
 handleDrop(mockEvent,'RESOLVED');
 }}
 className="text-xs font-bold px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 active:scale-95 transition-transform"
 >
 Resolve Ticket &rarr;
 </button>
 ) : null}
 </div>
 </m.div>
 ))}
 {filteredTickets.filter(t => t.status === col.id).length === 0 && (
  <m.div
   animate={dragOverCol === col.id ? { scale: [1, 1.02, 1], opacity: [0.7, 1, 0.7] } : {}}
   transition={{ repeat: dragOverCol === col.id ? Infinity : 0, duration: 1 }}
   className={cn(
    "p-8 border-2 border-dashed rounded-2xl text-center text-sm font-bold transition-colors",
    dragOverCol === col.id
     ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500"
     : "border-border text-muted-foreground"
   )}
  >
   {dragOverCol === col.id ? "✦ Release to drop here" : "Drop here"}
  </m.div>
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

 {/* Assignee Verification Modal */}
 <AnimatePresence>
 {resolveModalOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setResolveModalOpen(false)}
 className="absolute inset-0 bg-card/50 backdrop-blur-sm"
 />
 <m.div
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 className="relative w-full max-w-md bg-card rounded-3xl shadow-2xl border border-border overflow-hidden"
 >
 <div className="p-6">
 <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
 <CheckCircle size={24} />
 </div>
 <h3 className="text-xl font-black text-foreground mb-2">
 Verify Resolution
 </h3>
 <p className="text-sm text-muted-foreground mb-6">
 Please specify the technician or assignee who resolved this ticket.
 </p>

 <form onSubmit={submitResolve} className="space-y-4">
 <div>
 <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">
 Assignee Name <span className="text-rose-500">*</span>
 </label>
 <input
 type="text"
 required
 value={assigneeName}
 onChange={(e) => setAssigneeName(e.target.value)}
 placeholder="e.g. John Doe, Network Team"
 className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-emerald-500 outline-none"
 />
 </div>

 <div className="flex gap-3 pt-4">
 <button
 type="button"
 onClick={() => setResolveModalOpen(false)}
 className="flex-1 px-4 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={!assigneeName.trim() || isSubmitting}
 className="flex-1 px-4 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
 >
 {isSubmitting ?"Saving...":"Confirm & Resolve"}
 </button>
 </div>
 </form>
 </div>
 </m.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 );
}
