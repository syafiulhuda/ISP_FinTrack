"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Layers, 
  CreditCard, 
  Package, 
  Map, 
  Power,
  Plus,
  X,
  LogOut,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/components/providers/SettingsProvider";
import { useState } from "react";
import { GenerateReportModal } from "@/components/modals/GenerateReportModal";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Service Tiers", href: "/service-tiers", icon: Layers },
  { name: "Finance", href: "/finance", icon: CreditCard },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Distribution Map", href: "/distribution", icon: Map },
  { name: "Regional Analysis", href: "/regional", icon: Map },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSettings();

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutConfirm = async () => {
    setIsLoggingOut(true);
    router.push("/logout");
  };

  interface ThemeConfig {
    bg: string;
    shadow: string;
    text: string;
    textDark: string;
    textActive: string;
    btn: string;
    isCustom?: boolean;
    color?: string;
  }

  const colorMap: Record<string, ThemeConfig> = {
    blue: { bg: 'bg-blue-600', shadow: 'shadow-blue-600/20', text: 'text-blue-800', textDark: 'dark:text-blue-500', textActive: 'text-blue-700 dark:text-blue-400', btn: 'from-blue-600 to-blue-700' },
    indigo: { bg: 'bg-indigo-600', shadow: 'shadow-indigo-600/20', text: 'text-indigo-800', textDark: 'dark:text-indigo-500', textActive: 'text-indigo-700 dark:text-indigo-400', btn: 'from-indigo-600 to-indigo-700' },
    emerald: { bg: 'bg-emerald-600', shadow: 'shadow-emerald-600/20', text: 'text-emerald-800', textDark: 'dark:text-emerald-500', textActive: 'text-emerald-700 dark:text-emerald-400', btn: 'from-emerald-600 to-emerald-700' },
    amber: { bg: 'bg-amber-600', shadow: 'shadow-amber-600/20', text: 'text-amber-800', textDark: 'dark:text-amber-500', textActive: 'text-amber-700 dark:text-amber-400', btn: 'from-amber-600 to-amber-700' },
  };

  const isHex = settings.accentColor.startsWith('#');
  const theme = colorMap[settings.accentColor] || (isHex ? {
    bg: '',
    shadow: '',
    text: '',
    textDark: '',
    textActive: '',
    btn: '',
    isCustom: true,
    color: settings.accentColor
  } : colorMap.blue);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={cn(
        "fixed left-0 top-0 bottom-0 w-64 z-50 bg-slate-100 dark:bg-slate-950 flex-col h-full p-4 space-y-2 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 md:flex md:translate-x-0 shadow-2xl md:shadow-none",
        isOpen ? "flex translate-x-0" : "-translate-x-full hidden"
      )}>
        {/* Mobile Close Button */}
        {isOpen && (
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 p-2 md:hidden text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full z-50"
          >
            <X size={20} />
          </button>
        )}

      {/* Header */}
      <div className="mb-8 px-4 flex items-center space-x-3">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg overflow-hidden", !theme.isCustom && theme.bg, !theme.isCustom && theme.shadow)}
          style={theme.isCustom ? { backgroundColor: theme.color, boxShadow: `0 10px 15px -3px ${theme.color}44` } : {}}
        >
          {settings.appLogo ? (
            <img src={settings.appLogo} alt="App Logo" className="w-full h-full object-cover" />
          ) : (
            settings.appName.substring(0, 2).toUpperCase()
          )}
        </motion.div>
        <div>
          <h1 className={cn("text-lg font-black tracking-tight", !theme.isCustom && theme.text, !theme.isCustom && theme.textDark)} style={theme.isCustom ? { color: theme.color } : {}}>{settings.appName}</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{settings.appSubtitle}</p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-2 mb-6">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsReportModalOpen(true)}
          className={cn("w-full py-3 px-4 bg-gradient-to-br text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all", !theme.isCustom && theme.btn, !theme.isCustom && theme.shadow)}
          style={theme.isCustom ? { background: `linear-gradient(to bottom right, ${theme.color}, ${theme.color}dd)`, boxShadow: `0 10px 15px -3px ${theme.color}44` } : {}}
        >
          <Plus size={18} />
          <span>New Report</span>
        </motion.button>
      </div>

      <GenerateReportModal 
        isOpen={isReportModalOpen} 
        onClose={() => setIsReportModalOpen(false)} 
      />

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const isActive = item.href === "/" 
            ? pathname === "/" || pathname === "/profitability"
            : pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group relative flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200",
                isActive 
                  ? cn("font-bold", theme.textActive) 
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-white dark:bg-slate-900 shadow-sm border border-slate-200/50 dark:border-slate-800 rounded-xl"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                />
              )}
              <item.icon size={20} className={cn("relative z-10", isActive && !theme.isCustom ? theme.textActive : "group-hover:scale-110 transition-transform")} style={isActive && theme.isCustom ? { color: theme.color } : {}} />
              <span className="relative z-10 text-[13px]" style={isActive && theme.isCustom ? { color: theme.color, fontWeight: 'bold' } : {}}>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: Logout Button */}
      <div className="mt-auto pt-4 space-y-1">
        <button
          onClick={() => setIsLogoutConfirmOpen(true)}
          className="group w-full flex items-center space-x-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-all"
        >
          <Power size={20} className="group-hover:rotate-12 transition-transform" />
          <span className="text-[13px] font-bold">Logout</span>
        </button>
      </div>
      </aside>

      {/* Logout Confirmation Modal — No blur, transparent overlay */}
      <AnimatePresence>
        {isLogoutConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-40 px-4 md:pl-64">
            {/* Transparent clickable backdrop — no blur, no color */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLogoutConfirmOpen(false)}
              className="absolute inset-0 bg-transparent"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-8">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 mb-6">
                  <AlertTriangle size={28} />
                </div>

                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                  Konfirmasi Logout
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-8">
                  Anda akan keluar dari sesi ini. Pastikan semua pekerjaan sudah tersimpan sebelum melanjutkan.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsLogoutConfirmOpen(false)}
                    disabled={isLoggingOut}
                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleLogoutConfirm}
                    disabled={isLoggingOut}
                    className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoggingOut ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogOut size={16} />
                        Logout
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
