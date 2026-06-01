"use client";

import { m, Variants, AnimatePresence } from"framer-motion";
import { Banknote, FileScan, AlertTriangle, Clock, ShieldCheck, Loader2, Trash2, Server, CheckCircle } from"lucide-react";
import { useQuery, useMutation, useQueryClient } from"@tanstack/react-query";
import { 
 getNotifications, 
 markNotificationAsRead, 
 markAllNotificationsAsRead,
 deleteNotification,
 hideAllNotifications,
 getAdminProfile
} from"@/actions/admin";
import { getResolvedHistoryTickets } from "@/actions/tickets";
import { Notification } from"@/types";
import { cn } from "@/lib/utils";

import { useState, useEffect } from"react";
import { LoadingState } from"@/components/LoadingState";
import { toast } from"sonner";

function timeAgo(date: string | Date) {
 const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
 let interval = seconds / 31536000;
 if (interval > 1) return Math.floor(interval) +"years ago";
 interval = seconds / 2592000;
 if (interval > 1) return Math.floor(interval) +"months ago";
 interval = seconds / 86400;
 if (interval > 1) return Math.floor(interval) +"days ago";
 interval = seconds / 3600;
 if (interval > 1) return Math.floor(interval) +"hours ago";
 interval = seconds / 60;
 if (interval > 1) return Math.floor(interval) +"mins ago";
 return"just now";
}

import { LucideIcon } from"lucide-react";

const typeConfig: Record<string, { icon: LucideIcon, color: string, bg: string }> = {
 transaction: { icon: Banknote, color:'text-primary', bg:'bg-blue-50 dark:bg-blue-900/20'},
 ocr: { icon: FileScan, color:'text-purple-600 dark:text-purple-400', bg:'bg-purple-50 dark:bg-purple-900/20'},
 hardware: { icon: AlertTriangle, color:'text-orange-600 dark:text-orange-500', bg:'bg-orange-50 dark:bg-orange-900/20'},
 backup: { icon: Clock, color:'text-muted-foreground', bg:'bg-muted'},
 audit: { icon: ShieldCheck, color:'text-muted-foreground', bg:'bg-muted'},
 system: { icon: Server, color:'text-blue-600 dark:text-blue-400', bg:'bg-blue-50 dark:bg-blue-900/20'},
 success: { icon: CheckCircle, color:'text-green-600 dark:text-green-400', bg:'bg-green-50 dark:bg-green-900/20'},
 info: { icon: Clock, color:'text-indigo-600 dark:text-indigo-400', bg:'bg-indigo-50 dark:bg-indigo-900/20'},
};

const containerVariants: Variants = {
 hidden: { opacity: 0 },
 show: {
 opacity: 1,
 transition: { staggerChildren: 0.1 }
 }
};

const itemVariants: Variants = {
 hidden: { opacity: 0, y: 20 },
 show: { opacity: 1, y: 0, transition: { type:"spring", stiffness: 300, damping: 24 } }
};

function PaginationComponent({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 p-3 sm:p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl">
      <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:block w-1/3">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex items-center gap-2 sm:gap-2 w-full sm:w-auto justify-center sm:justify-end">
        <button 
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 shrink-0"
        >
          Prev
        </button>
        
        {/* Desktop Numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {[...Array(Math.min(5, totalPages))].map((_, i) => {
            let pageNum = currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i);
            if (pageNum <= 0 || pageNum > totalPages) return null;
            
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                  currentPage === pageNum ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Mobile Compact Text */}
        <div className="flex sm:hidden items-center justify-center px-1">
           <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest bg-slate-200/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg">
             {currentPage} / {totalPages}
           </span>
        </div>

        <button 
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300 shrink-0"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function NotificationCard({ notif, cat, config, isVisitor, markReadMutation, deleteMutation, toast }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = config.icon;

  return (
    <div 
      className={`group transition-all duration-300 rounded-2xl flex flex-col relative overflow-hidden border shadow-sm ${
        notif.is_unread 
          ?'bg-card border-border'
          :'bg-muted/50 /20 border-transparent opacity-60'
      }`}
    >
      {/* HEADER (Always visible, acts as toggle on mobile) */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="p-5 flex flex-row items-start lg:items-center gap-4 cursor-pointer lg:cursor-default"
      >
        {notif.is_unread && (
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${cat ==='Finance'?'bg-primary': cat ==='Inventory'?'bg-orange-500': cat ==='Reminder'?'bg-indigo-500':'bg-slate-400'}`}></div>
        )}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-1 lg:mb-0 gap-1 lg:gap-3">
            <h4 className={`text-sm font-bold truncate ${notif.is_unread ?'text-foreground':'text-muted-foreground'}`}>
              {notif.title}
            </h4>
            <span className="text-[0.6875rem] font-medium text-muted-foreground">
              {timeAgo(notif.created_at || new Date().toISOString())}
            </span>
          </div>
        </div>

        {/* Unread indicator desktop */}
        {notif.is_unread && (
          <div className="hidden lg:flex flex-col items-end shrink-0 mr-2">
            <span className={`w-2 h-2 rounded-full ${cat ==='Finance'?'bg-primary': cat ==='Inventory'?'bg-orange-500': cat ==='Reminder'?'bg-indigo-500':'bg-slate-400'}`}></span>
          </div>
        )}

        {/* Chevron for mobile/tablet */}
        <div 
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 lg:hidden hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          <svg 
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={cn("text-slate-500 transition-transform duration-200", isOpen ? "rotate-180" : "")}
          >
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>
      </div>

      {/* BODY (Mobile/Tablet Collapsible) */}
      <div className="lg:hidden">
        <AnimatePresence initial={false}>
          {isOpen && (
            <m.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-0">
                <p className={`text-sm leading-relaxed ${notif.is_unread ?'text-muted-foreground':'text-muted-foreground'}`}>
                  {notif.message}
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2 w-full">
                  {notif.action_label && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); toast.info("Fitur ini segera hadir 🚀"); }}
                      disabled={isVisitor}
                      className={cn(`w-full flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors text-center ${
                        cat ==='Finance'?'bg-primary text-primary-foreground hover:bg-blue-600': 
                        cat ==='Inventory'?'bg-orange-500 text-white hover:bg-orange-600':
                        cat ==='Reminder'?'bg-indigo-600 text-white hover:bg-indigo-700':
                        'bg-purple-600 text-white hover:bg-purple-700'
                      }`, isVisitor ? "opacity-50 cursor-not-allowed" : "")}>
                      {notif.action_label}
                    </button>
                  )}
                  {notif.is_unread && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(notif.id); }}
                      className={cn("w-full flex-1 bg-muted px-4 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-colors text-center",
                        (markReadMutation.isPending || isVisitor) ? "opacity-50 cursor-not-allowed" : ""
                      )}
                      disabled={markReadMutation.isPending || isVisitor}
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* BODY (Desktop Always Open) */}
      <div className="hidden lg:block pl-[76px] pr-5 pb-5 pt-0">
        <p className={`text-sm leading-relaxed ${notif.is_unread ?'text-muted-foreground':'text-muted-foreground'}`}>
          {notif.message}
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 w-full lg:w-fit">
          {notif.action_label && (
            <button 
              onClick={(e) => { e.stopPropagation(); toast.info("Fitur ini segera hadir 🚀"); }}
              disabled={isVisitor}
              className={cn(`w-full flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors text-center ${
                cat ==='Finance'?'bg-primary text-primary-foreground hover:bg-blue-600': 
                cat ==='Inventory'?'bg-orange-500 text-white hover:bg-orange-600':
                cat ==='Reminder'?'bg-indigo-600 text-white hover:bg-indigo-700':
                'bg-purple-600 text-white hover:bg-purple-700'
              }`, isVisitor ? "opacity-50 cursor-not-allowed" : "")}>
              {notif.action_label}
            </button>
          )}
          {notif.is_unread && (
            <button 
              onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(notif.id); }}
              className={cn("w-full flex-1 bg-muted px-4 py-2.5 rounded-xl text-xs font-bold text-foreground hover:bg-muted transition-colors text-center",
                (markReadMutation.isPending || isVisitor) ? "opacity-50 cursor-not-allowed" : ""
              )}
              disabled={markReadMutation.isPending || isVisitor}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      {/* Delete Action (Desktop Hover) */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          if (confirm('Delete this notification?')) {
            deleteMutation.mutate(notif.id);
          }
        }}
        disabled={isVisitor}
        className={cn("absolute right-4 bottom-4 p-2 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 hidden lg:block",
          isVisitor ? "opacity-50 cursor-not-allowed hover:text-muted-foreground" : ""
        )}
        title="Delete notification"
        aria-label="Delete notification"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function ResolvedTicketCard({ ticket, cn }: any) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="bg-card p-5 rounded-2xl border border-border shadow-sm flex flex-col gap-3 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
        <CheckCircle size={64} className="text-emerald-500" />
      </div>
      
      {/* HEADER (Always visible) */}
      <div 
        className="flex justify-between items-start z-10 relative cursor-pointer lg:cursor-default"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-lg uppercase tracking-wider">
            {ticket.status}
          </span>
          <h3 className="text-sm font-black mt-2 text-foreground">{ticket.ticket_number}</h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-[10px] font-medium text-muted-foreground text-right">
            {ticket.resolved_at_str ? new Date(ticket.resolved_at_str).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '') : '-'}
          </span>
          <div className="p-1 rounded-md bg-slate-100 dark:bg-slate-800 lg:hidden hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <svg 
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={cn("text-slate-500 transition-transform duration-200", isOpen ? "rotate-180" : "")}
            >
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>
        </div>
      </div>
      
      {/* BODY (Mobile/Tablet Collapsible) */}
      <div className="lg:hidden z-10 relative">
        <AnimatePresence initial={false}>
          {isOpen && (
            <m.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 mt-2 pt-2 border-t border-border/50">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Customer</span>
                  <span className="text-xs font-semibold text-foreground line-clamp-1">{ticket.customer_name}</span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">{ticket.address}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Trouble Detail</span>
                  <span className="text-xs text-foreground line-clamp-2">{ticket.description}</span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-3 border-t border-border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Solved By</span>
                  <span className="text-xs font-bold text-primary">{ticket.assigned_to || 'System/Admin'}</span>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* BODY (Desktop Always Open) */}
      <div className="hidden lg:block z-10 relative space-y-2 mt-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Customer</span>
          <span className="text-xs font-semibold text-foreground line-clamp-1">{ticket.customer_name}</span>
          <span className="text-[10px] text-muted-foreground line-clamp-1">{ticket.address}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Trouble Detail</span>
          <span className="text-xs text-foreground line-clamp-2">{ticket.description}</span>
        </div>
        <div className="flex justify-between items-center mt-2 pt-3 border-t border-border">
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Solved By</span>
          <span className="text-xs font-bold text-primary">{ticket.assigned_to || 'System/Admin'}</span>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
 const queryClient = useQueryClient();
 const { data: profile } = useQuery({ queryKey: ['adminProfile'], queryFn: getAdminProfile });
 const isVisitor = profile?.email === 'visitor@gmail.com';

 const { data: notifications = [], isLoading } = useQuery({
 queryKey: ['notifications'],
 queryFn: getNotifications,
 refetchInterval: 60000,
 });

 const { data: resolvedTickets = [], isLoading: isLoadingTickets } = useQuery({
 queryKey: ['resolvedTicketsHistory'],
 queryFn: getResolvedHistoryTickets,
 refetchInterval: 60000,
 });

 const [pageMap, setPageMap] = useState<Record<string, number>>({
 Finance: 1,
 Inventory: 1,
 System: 1,
 Tickets: 1
 });

 const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
 Finance: true,
 Billing: true,
 Reminder: true,
 Inventory: true,
 System: true,
 Tickets: true
 });

 const toggleSection = (section: string) => {
 setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
 };

 const itemsPerPage = 5;

 // --- Mutations ---

 const markReadMutation = useMutation({
 mutationFn: markNotificationAsRead,
 onMutate: async (id) => {
 await queryClient.cancelQueries({ queryKey: ['notifications'] });
 const prev = queryClient.getQueryData<Notification[]>(['notifications']);
 queryClient.setQueryData<Notification[]>(['notifications'], (old) => 
 old?.map((n) => n.id === id ? { ...n, is_unread: false } : n)
 );
 return { prev };
 },
 onError: (_err, _id, context: { prev?: Notification[] } | undefined) => {
 if (context?.prev) {
 queryClient.setQueryData(['notifications'], context.prev);
 }
 },
 onSettled: () => {
 queryClient.invalidateQueries({ queryKey: ['notifications'] });
 }
 });

 const markAllReadMutation = useMutation({
 mutationFn: markAllNotificationsAsRead,
 onMutate: async () => {
 await queryClient.cancelQueries({ queryKey: ['notifications'] });
 const prev = queryClient.getQueryData<Notification[]>(['notifications']);
 queryClient.setQueryData<Notification[]>(['notifications'], (old) => 
 old?.map((n) => ({ ...n, is_unread: false }))
 );
 return { prev };
 },
 onError: (_err, _vars, context: { prev?: Notification[] } | undefined) => {
 if (context?.prev) {
 queryClient.setQueryData(['notifications'], context.prev);
 }
 },
 onSettled: () => {
 queryClient.invalidateQueries({ queryKey: ['notifications'] });
 }
 });

 const hideAllMutation = useMutation({
 mutationFn: hideAllNotifications,
 onMutate: async () => {
 await queryClient.cancelQueries({ queryKey: ['notifications'] });
 const prev = queryClient.getQueryData<Notification[]>(['notifications']);
 // Optimistic: clear all from UI immediately
 queryClient.setQueryData(['notifications'], []);
 return { prev };
 },
 onError: (_err, _vars, context: { prev?: Notification[] } | undefined) => {
 if (context?.prev) {
 queryClient.setQueryData(['notifications'], context.prev);
 }
 },
 onSettled: () => {
 queryClient.invalidateQueries({ queryKey: ['notifications'] });
 }
 });

 const deleteMutation = useMutation({
 mutationFn: deleteNotification,
 onMutate: async (id) => {
 await queryClient.cancelQueries({ queryKey: ['notifications'] });
 const prev = queryClient.getQueryData<Notification[]>(['notifications']);
 queryClient.setQueryData<Notification[]>(['notifications'], (old) => 
 old?.filter((n) => n.id !== id)
 );
 return { prev };
 },
 onError: (_err, _id, context: { prev?: Notification[] } | undefined) => {
 if (context?.prev) {
 queryClient.setQueryData(['notifications'], context.prev);
 }
 },
 onSettled: () => {
 queryClient.invalidateQueries({ queryKey: ['notifications'] });
 }
 });

  const [clearedAt, setClearedAt] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setClearedAt(localStorage.getItem('ticketsClearedAt'));
    }
  }, []);

 function NotificationsSkeleton() {
 const skeletonData = [
 { cat: 'Finance', color: 'bg-primary', count: 3 },
 { cat: 'Inventory', color: 'bg-orange-500', count: 2 },
 { cat: 'System', color: 'bg-slate-400', count: 4 },
 ];

 return (
 <div className="space-y-8 pt-6 md:pt-8 pb-10 w-full animate-in fade-in duration-500">
 {/* Header Skeleton */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
 <div className="space-y-3">
 <div className="h-8 w-48 bg-muted animate-pulse rounded-lg"></div>
 <div className="h-4 w-64 bg-muted animate-pulse rounded-lg"></div>
 </div>
 <div className="flex gap-3">
 <div className="h-9 w-28 bg-muted animate-pulse rounded-xl"></div>
 <div className="h-9 w-24 bg-muted animate-pulse rounded-xl"></div>
 </div>
 </div>

 {/* Categories Skeleton */}
 <div className="space-y-8">
 {skeletonData.map((section, idx) => (
 <div key={idx} className="space-y-4">
 {/* Section Title */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className={`w-2 h-2 rounded-full ${section.color} animate-pulse`}></div>
 <div className="h-4 w-24 bg-muted animate-pulse rounded-md"></div>
 </div>
 <div className="h-6 w-6 bg-muted animate-pulse rounded-xl"></div>
 </div>

 {/* Skeleton Cards */}
 <div className="space-y-3 pt-2">
 {Array.from({ length: section.count }).map((_, i) => (
 <div key={i} className="rounded-2xl p-5 flex flex-row items-center gap-4 border border-border shadow-sm bg-card/50 relative overflow-hidden">
 <div className={`absolute left-0 top-0 bottom-0 w-1 ${section.color} opacity-30`}></div>
 <div className="w-10 h-10 rounded-xl bg-muted animate-pulse shrink-0"></div>
 <div className="flex-1 space-y-3">
 <div className="flex justify-between items-center">
 <div className="h-4 w-1/3 bg-muted animate-pulse rounded-md"></div>
 <div className="h-3 w-16 bg-muted animate-pulse rounded-md hidden sm:block"></div>
 </div>
 <div className="h-3 w-2/3 bg-muted animate-pulse rounded-md"></div>
 </div>
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>

 {/* Tickets Skeleton */}
 <div className="mt-12 space-y-6">
 <div className="space-y-2">
 <div className="h-7 w-64 bg-muted animate-pulse rounded-lg"></div>
 <div className="h-4 w-48 bg-muted animate-pulse rounded-lg"></div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="bg-card p-5 rounded-2xl border border-border shadow-sm h-[140px] flex flex-col justify-between">
 <div className="flex justify-between items-start">
 <div className="space-y-2">
 <div className="h-5 w-16 bg-muted animate-pulse rounded-md"></div>
 <div className="h-4 w-32 bg-muted animate-pulse rounded-md"></div>
 </div>
 <div className="h-3 w-20 bg-muted animate-pulse rounded-md"></div>
 </div>
 <div className="space-y-2 mt-4">
 <div className="h-3 w-full bg-muted animate-pulse rounded-md"></div>
 <div className="h-3 w-2/3 bg-muted animate-pulse rounded-md"></div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}

 if (isLoading || isLoadingTickets) {
 return <NotificationsSkeleton />;
 }

 const unreadAlerts = notifications.filter((n: Notification) => n.is_unread).length;
 const inventoryFlagged = notifications.filter((n: Notification) => n.category ==='Inventory'&& n.is_unread).length;
 const financialPending = notifications.filter((n: Notification) => (n.category ==='Finance'|| n.category ==='Billing'|| n.category ==='Reminder') && n.is_unread).length;

 const categories = ['Finance','Billing','Reminder','Inventory','System'];

 return (
 <m.div 
 variants={containerVariants}
 initial="hidden"
 animate="show"
 className="space-y-8 pt-6 md:pt-8 pb-10"
 >
 <m.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
 <div>
 <h1 className="text-3xl font-bold tracking-tight text-foreground">
 Notifications
 </h1>
 <p className="text-sm text-muted-foreground mt-1">Manage system alerts and broadcasts</p>
 </div>
 <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto">
 {unreadAlerts > 0 && (
 <button 
 onClick={() => markAllReadMutation.mutate()}
 disabled={markAllReadMutation.isPending || isVisitor}
 className={cn("text-[10px] sm:text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest",
 (markAllReadMutation.isPending || isVisitor) ? "opacity-50 cursor-not-allowed" : ""
 )}
 >
 Mark All as Read
 </button>
 )}
 <button 
 onClick={() => {
 if (confirm('Clear all notifications from this view? Data will be preserved in the database.')) {
 hideAllMutation.mutate();
 const now = new Date().toISOString();
 localStorage.setItem('ticketsClearedAt', now);
 setClearedAt(now);
 }
 }}
 disabled={isVisitor}
 className={cn("text-[10px] sm:text-xs font-bold text-muted-foreground hover:text-red-500 transition-colors uppercase tracking-widest",
 isVisitor ? "opacity-50 cursor-not-allowed hover:text-muted-foreground" : ""
 )}
 >
 Clear All
 </button>
 </div>
 </m.div>

 {/* Overview Header */}
 <m.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
 <div className="bg-card p-3 md:p-6 rounded-2xl border border-border border-l-4 border-l-primary shadow-sm">
 <p className="text-[8px] md:text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest truncate">
 Unread Alerts
 </p>
 <h3 className="text-xl md:text-4xl font-bold mt-1 md:mt-2 text-foreground">{unreadAlerts}</h3>
 </div>
 <div className="bg-card p-3 md:p-6 rounded-2xl border border-border border-l-4 border-l-orange-500 shadow-sm">
 <p className="text-[8px] md:text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest truncate">
 Inventory Flagged
 </p>
 <h3 className="text-xl md:text-4xl font-bold mt-1 md:mt-2 text-foreground">{inventoryFlagged}</h3>
 </div>
 <div className="bg-card p-3 md:p-6 rounded-2xl border border-border border-l-4 border-l-purple-500 shadow-sm">
 <p className="text-[8px] md:text-[0.6875rem] font-bold text-muted-foreground uppercase tracking-widest truncate">
 Financial Pending
 </p>
 <h3 className="text-xl md:text-4xl font-bold mt-1 md:mt-2 text-foreground">{financialPending}</h3>
 </div>
 </m.div>

 {/* Notifications Content */}
 <div className="flex flex-col gap-8">
 {categories.map((cat) => {
 const catNotifications = notifications.filter((n: Notification) => n.category === cat);
 if (catNotifications.length === 0) return null;

 const currentPage = pageMap[cat] || 1;
 const totalPages = Math.ceil(catNotifications.length / itemsPerPage);
 const paginatedNotifications = catNotifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

 return (
 <m.section key={cat} variants={itemVariants} className="space-y-4">
 <div 
 className="flex items-center justify-between cursor-pointer group"
 onClick={() => toggleSection(cat)}
 >
 <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
 <span className={`w-2 h-2 rounded-full ${cat ==='Finance'?'bg-primary': cat ==='Inventory'?'bg-orange-500': cat ==='Reminder'?'bg-indigo-500':'bg-slate-400'}`}></span>
 {cat}
 </h3>
 <div className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
 <svg 
 width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
 className={cn("text-muted-foreground transition-transform duration-200", expandedSections[cat] ? "rotate-180" : "")}
 >
 <path d="m6 9 6 6 6-6"/>
 </svg>
 </div>
 </div>
 
 <AnimatePresence initial={false}>
 {expandedSections[cat] && (
 <m.div 
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden"
 >
 <div className="space-y-3 pt-2">
 {paginatedNotifications.map((notif: Notification) => {
 const config = typeConfig[notif.type] || typeConfig.backup;
 const Icon = config.icon;

 return (
 <NotificationCard 
 key={notif.id}
 notif={notif}
 cat={cat}
 config={config}
 isVisitor={isVisitor}
 markReadMutation={markReadMutation}
 deleteMutation={deleteMutation}
 toast={toast}
 />
 );
 })}
 </div>

 <PaginationComponent 
 currentPage={currentPage} 
 totalPages={totalPages} 
 onPageChange={(p) => setPageMap(prev => ({ ...prev, [cat]: p }))} 
 />
 </m.div>
 )}
 </AnimatePresence>
 </m.section>
 );
 })}
 </div>

 {/* Resolved Tickets History Section */}
 {resolvedTickets.length > 0 && (
 (() => {
 const visibleResolvedTickets = resolvedTickets.filter((t: any) => !clearedAt || new Date(t.resolved_at_str || t.created_at_str) > new Date(clearedAt));

 if (visibleResolvedTickets.length === 0) return null;

 const ticketsPerPage = 6;
 const ticketsCurrentPage = pageMap['Tickets'] || 1;
 const ticketsTotalPages = Math.ceil(visibleResolvedTickets.length / ticketsPerPage);
 const paginatedTickets = visibleResolvedTickets.slice((ticketsCurrentPage - 1) * ticketsPerPage, ticketsCurrentPage * ticketsPerPage);

 return (
 <m.div variants={itemVariants} className="mt-12 space-y-6">
 <div>
 <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
 <CheckCircle className="text-emerald-500" />
 Resolved Tickets History
 </h2>
 <p className="text-sm text-muted-foreground mt-1">Record of recently closed and resolved tickets</p>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {paginatedTickets.map((ticket: any) => (
 <ResolvedTicketCard key={ticket.id} ticket={ticket} cn={cn} />
 ))}
 </div>

 <PaginationComponent 
 currentPage={ticketsCurrentPage} 
 totalPages={ticketsTotalPages} 
 onPageChange={(p) => setPageMap(prev => ({ ...prev, Tickets: p }))} 
 />
 </m.div>
 );
 })()
 )}
 </m.div>
 );
}
