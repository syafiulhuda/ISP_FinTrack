"use client";

import { m, Variants } from "framer-motion";
import { Banknote, FileScan, AlertTriangle, Clock, ShieldCheck, Loader2, Trash2, Server, CheckCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  hideAllNotifications
} from "@/actions/db";

import { useState } from "react";
import { LoadingState } from "@/components/LoadingState";
import { toast } from "sonner";

function timeAgo(date: string | Date) {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " mins ago";
  return "just now";
}

const typeConfig: Record<string, { icon: any, color: string, bg: string }> = {
  transaction: { icon: Banknote, color: 'text-primary', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  ocr: { icon: FileScan, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  hardware: { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  backup: { icon: Clock, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-200 dark:bg-slate-800' },
  audit: { icon: ShieldCheck, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-200 dark:bg-slate-800' },
  system: { icon: Server, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  success: { icon: CheckCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
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
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 60000,
  });

  const [pageMap, setPageMap] = useState<Record<string, number>>({
    Finance: 1,
    Inventory: 1,
    System: 1
  });

  const itemsPerPage = 5;

  // --- Mutations ---

  const markReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (old: any) => 
        old?.map((n: any) => n.id === id ? { ...n, is_unread: false } : n)
      );
      return { prev };
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(['notifications'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (old: any) => 
        old?.map((n: any) => ({ ...n, is_unread: false }))
      );
      return { prev };
    },
    onError: (_err, _vars, context: any) => {
      queryClient.setQueryData(['notifications'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const hideAllMutation = useMutation({
    mutationFn: hideAllNotifications,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData(['notifications']);
      // Optimistic: clear all from UI immediately
      queryClient.setQueryData(['notifications'], []);
      return { prev };
    },
    onError: (_err, _vars, context: any) => {
      queryClient.setQueryData(['notifications'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData(['notifications']);
      queryClient.setQueryData(['notifications'], (old: any) => 
        old?.filter((n: any) => n.id !== id)
      );
      return { prev };
    },
    onError: (_err, _id, context: any) => {
      queryClient.setQueryData(['notifications'], context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // --- Render ---

  if (isLoading) {
    return <LoadingState message="Mengambil pemberitahuan..." />;
  }

  const unreadAlerts = notifications.filter((n: any) => n.is_unread).length;
  const inventoryFlagged = notifications.filter((n: any) => n.category === 'Inventory' && n.is_unread).length;
  const financialPending = notifications.filter((n: any) => n.category === 'Finance' && n.is_unread).length;

  const categories = ['Finance', 'Inventory', 'System'];

  return (
    <m.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      <m.div variants={itemVariants} className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Notifications
          </h2>
          <p className="text-sm text-slate-500 mt-1">Manage system alerts and broadcasts</p>
        </div>
        <div className="flex items-center gap-4">
          {unreadAlerts > 0 && (
            <button 
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest disabled:opacity-50"
            >
              Mark All as Read
            </button>
          )}
          <button 
            onClick={() => {
              if (confirm('Clear all notifications from this view? Data will be preserved in the database.')) {
                hideAllMutation.mutate();
              }
            }}
            className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
          >
            Clear All
          </button>
        </div>
      </m.div>

      {/* Overview Header */}
      <m.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-primary shadow-sm">
          <p className="text-[0.6875rem] font-bold text-slate-500 uppercase tracking-widest">
            Unread Alerts
          </p>
          <h3 className="text-4xl font-bold mt-2 text-slate-900 dark:text-slate-100">{unreadAlerts}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-orange-500 shadow-sm">
          <p className="text-[0.6875rem] font-bold text-slate-500 uppercase tracking-widest">
            Inventory Flagged
          </p>
          <h3 className="text-4xl font-bold mt-2 text-slate-900 dark:text-slate-100">{inventoryFlagged}</h3>
        </div>
        <div className="bg-white dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-purple-500 shadow-sm">
          <p className="text-[0.6875rem] font-bold text-slate-500 uppercase tracking-widest">
            Financial Pending
          </p>
          <h3 className="text-4xl font-bold mt-2 text-slate-900 dark:text-slate-100">{financialPending}</h3>
        </div>
      </m.div>

      {/* Notifications Content */}
      <div className="flex flex-col gap-8">
        {categories.map((cat) => {
          const catNotifications = notifications.filter((n: any) => n.category === cat);
          if (catNotifications.length === 0) return null;

          const currentPage = pageMap[cat] || 1;
          const totalPages = Math.ceil(catNotifications.length / itemsPerPage);
          const paginatedNotifications = catNotifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

          return (
            <m.section key={cat} variants={itemVariants} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cat === 'Finance' ? 'bg-primary' : cat === 'Inventory' ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
                  {cat}
                </h3>
              </div>
              
              <div className="space-y-3">
                {paginatedNotifications.map((notif: any) => {
                  const config = typeConfig[notif.type] || typeConfig.backup;
                  const Icon = config.icon;

                  return (
                    <div 
                      key={notif.id}
                      className={`group transition-all duration-300 rounded-2xl p-5 flex flex-col sm:flex-row items-start gap-5 relative overflow-hidden border shadow-sm ${
                        notif.is_unread 
                          ? 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800' 
                          : 'bg-slate-50/50 dark:bg-slate-900/20 border-transparent opacity-60'
                      }`}
                    >
                      {notif.is_unread && (
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${cat === 'Finance' ? 'bg-primary' : cat === 'Inventory' ? 'bg-orange-500' : 'bg-slate-400'}`}></div>
                      )}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-1">
                          <h4 className={`text-sm font-bold ${notif.is_unread ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                            {notif.title}
                          </h4>
                          <span className="text-[0.6875rem] font-medium text-slate-500">{timeAgo(notif.created_at)}</span>
                        </div>
                        <p className={`text-sm leading-relaxed mt-1 ${notif.is_unread ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500 dark:text-slate-500'}`}>
                          {notif.message}
                        </p>
                        <div className="mt-4 flex gap-2">
                          {notif.action_label && (
                            <button 
                              onClick={() => toast.info("Fitur ini segera hadir 🚀")}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                              cat === 'Finance' ? 'bg-primary text-primary-foreground hover:bg-blue-600' : 
                              cat === 'Inventory' ? 'bg-orange-500 text-white hover:bg-orange-600' :
                              'bg-purple-600 text-white hover:bg-purple-700'
                            }`}>
                              {notif.action_label}
                            </button>
                          )}
                          {notif.is_unread && (
                            <button 
                              onClick={() => markReadMutation.mutate(notif.id)}
                              className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                              disabled={markReadMutation.isPending}
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      </div>
                      {notif.is_unread && (
                        <div className="hidden sm:flex flex-col items-end shrink-0">
                          <span className={`w-2 h-2 rounded-full ${cat === 'Finance' ? 'bg-primary' : cat === 'Inventory' ? 'bg-orange-500' : 'bg-slate-400'}`}></span>
                        </div>
                      )}

                      {/* Delete Action */}
                      <button 
                        onClick={() => {
                          if (confirm('Delete this notification?')) {
                            deleteMutation.mutate(notif.id);
                          }
                        }}
                        className="absolute right-4 bottom-4 p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete notification"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Section Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 pt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Page</span>
                    <input 
                      type="text"
                      key={`notif-${cat}-page-${currentPage}`}
                      defaultValue={currentPage}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 1 && val <= totalPages) setPageMap(prev => ({ ...prev, [cat]: val }));
                        else e.target.value = String(currentPage);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      className="w-8 h-8 text-center rounded-lg text-[10px] font-black bg-primary text-white shadow-sm border-none outline-none"
                    />
                    <span className="text-[10px] font-bold text-slate-400">of {totalPages}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPageMap(prev => ({ ...prev, [cat]: Math.max(1, currentPage - 1) }))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <button 
                      onClick={() => setPageMap(prev => ({ ...prev, [cat]: Math.min(totalPages, currentPage + 1) }))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                  </div>
                </div>
              )}
            </m.section>
          );
        })}
      </div>
    </m.div>
  );
}
