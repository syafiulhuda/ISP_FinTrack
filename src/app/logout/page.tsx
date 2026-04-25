"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/actions/auth";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const performLogout = async () => {
      await logoutAction();
      router.push("/login");
      router.refresh();
    };

    const timer = setTimeout(performLogout, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-8"
      >
        <div className="relative inline-block">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
          />
          <div className="relative w-24 h-24 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center mx-auto mb-8">
            <LogOut size={40} className="text-primary" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Signing out...</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
            Ending your enterprise session and clearing secure data cache.
          </p>
        </div>

        <div className="pt-8 flex flex-col items-center gap-6">
          <motion.div 
            animate={{ width: ["0%", "100%"] }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative"
          >
            <div className="absolute top-0 left-0 h-full bg-primary rounded-full" style={{ width: "100%" }} />
          </motion.div>
          
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <ShieldCheck size={14} className="text-primary" />
            Secure Logout in Progress
          </div>
        </div>
      </motion.div>

      {/* Decorative Branding */}
      <div className="absolute bottom-12 flex items-center gap-3 opacity-20">
        <div className="w-8 h-8 rounded-xl bg-slate-400 flex items-center justify-center">
          <span className="text-white font-black text-sm">IF</span>
        </div>
        <span className="text-lg font-black text-slate-400 tracking-tight">ISP-FinTrack</span>
      </div>
    </div>
  );
}
