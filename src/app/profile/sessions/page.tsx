"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getActiveSessions, revokeSession, revokeOtherSessions } from "@/actions/profile";
import { Laptop, Smartphone, ChevronLeft, ShieldAlert, MonitorCheck, Info, Loader2, LogOut } from "lucide-react";
import Link from "next/link";
import { m, Variants } from "framer-motion";
import { toast } from "sonner";
import { useState } from "react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const getTimeAgo = (dateString: string | null | undefined) => {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
};

export default function SessionsHistoryPage() {
  const queryClient = useQueryClient();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['adminSessions'],
    queryFn: getActiveSessions
  });

  const handleRevokeSession = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this session?')) return;
    setRevokingId(id);
    try {
      await revokeSession(id);
      queryClient.invalidateQueries({ queryKey: ['adminSessions'] });
      toast.success('Session revoked successfully');
    } catch (error) {
      toast.error('Failed to revoke session');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    if (!confirm('Are you sure you want to logout from all other devices?')) return;
    setIsRevokingAll(true);
    try {
      await revokeOtherSessions();
      queryClient.invalidateQueries({ queryKey: ['adminSessions'] });
      toast.success('Logged out from other devices');
    } catch (error) {
      toast.error('Failed to revoke other sessions');
    } finally {
      setIsRevokingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto animate-pulse space-y-6">
        <div className="w-32 h-4 bg-muted rounded mb-8"></div>
        <div className="w-64 h-10 bg-muted rounded mb-4"></div>
        <div className="w-96 h-4 bg-muted rounded mb-8"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-full h-24 bg-muted rounded-2xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto">
      <div className="mb-8">
        <Link href="/profile" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ChevronLeft size={16} /> Back to Profile
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
                <MonitorCheck size={24} />
              </div>
              Session Management
            </h1>
            <p className="text-muted-foreground font-medium mt-2 max-w-2xl">
              Review and revoke your active sessions across all devices and browsers.
            </p>
          </div>
          {sessions.length > 1 && (
            <button 
              onClick={handleRevokeOtherSessions}
              disabled={isRevokingAll}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-400 font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isRevokingAll ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
              Revoke All Other Sessions
            </button>
          )}
        </div>
      </div>

      <m.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {sessions.map((session: any, index: number) => {
          const isMobile = session.device_info.toLowerCase().includes('mobile') || session.device_info.toLowerCase().includes('android') || session.device_info.toLowerCase().includes('iphone');
          const isCurrent = index === 0;

          return (
            <m.div key={session.id} variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-card border border-border shadow-sm rounded-3xl gap-6">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl shadow-inner shrink-0 ${isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {isMobile ? <Smartphone size={24} /> : <Laptop size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-lg font-black text-foreground">
                      {session.device_info}
                    </p>
                    {isCurrent && (
                      <span className="px-2.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-black rounded-full uppercase tracking-wider">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                      {session.location}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                      {session.ip_address}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                      {isCurrent ? 'Active Now' : `Last active ${getTimeAgo(session.last_active)}`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-4 sm:pt-0 border-t sm:border-t-0 border-border">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Created {new Date(session.created_at).toLocaleDateString()}
                </p>
                {!isCurrent && (
                  <button 
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokingId === session.id}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 font-bold rounded-xl transition-colors disabled:opacity-50 text-sm"
                  >
                    {revokingId === session.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <ShieldAlert size={16} />
                    )}
                    Revoke Access
                  </button>
                )}
              </div>
            </m.div>
          );
        })}

        {sessions.length === 0 && (
          <div className="text-center py-12 bg-card border border-border rounded-3xl">
            <Info className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-foreground">No Active Sessions</h3>
            <p className="text-muted-foreground mt-2">You don't have any active sessions to display.</p>
          </div>
        )}
      </m.div>
    </div>
  );
}
