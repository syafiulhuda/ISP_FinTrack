"use client";

import Link from "next/link";
import Image from "next/image";
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
  AlertTriangle,
  TrendingUp,
  Users,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { m, AnimatePresence } from "framer-motion";
import { useSettings } from "@/components/providers/SettingsProvider";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminProfile } from "@/actions/admin";
import { LifeBuoy } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Service Tiers", href: "/service-tiers", icon: Layers },
  { name: "Finance", href: "/finance", icon: CreditCard },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Distribution Map", href: "/distribution", icon: Map },
  { name: "Customer Analysis", href: "/customers", icon: Users },
  { name: "Regional Analysis", href: "/regional", icon: Map },
  { name: "Trouble Tickets", href: "/tickets", icon: LifeBuoy },
  { name: "Predictive Analysis", href: "/predictions", icon: TrendingUp },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSettings();

  const { data: profile } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: getAdminProfile
  });
  const isTimLapangan = profile?.role === 'Tim Lapangan' || profile?.role === 'Pekerja';

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const logoutBtnRef = useRef<HTMLDivElement>(null);

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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] md:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "sidebar-fixed fixed inset-y-0 left-0 z-[60] bg-slate-100 dark:bg-slate-950 flex flex-col border-r border-slate-200 dark:border-slate-800 md:translate-x-0 shadow-2xl md:shadow-none overflow-hidden",
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Header */}
        <div className="pt-4 px-6">
          <div className="flex items-center space-x-3 mb-2 px-2">
            <m.div
              initial={false}
              animate={{ scale: 1, opacity: 1 }}
              className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg overflow-hidden shrink-0", !theme.isCustom && theme.bg, !theme.isCustom && theme.shadow)}
              style={theme.isCustom ? { backgroundColor: theme.color, boxShadow: `0 10px 15px -3px ${theme.color}44` } : {}}
            >
              {settings.appLogo ? (
                <Image unoptimized src={settings.appLogo} alt="App Logo" width={36} height={36} className="w-full h-full object-cover" />
              ) : (
                settings.appName.substring(0, 2).toUpperCase()
              )}
            </m.div>
            <div className="flex flex-col">
              <h1 className="font-black text-base tracking-tight text-slate-900 dark:text-white leading-none whitespace-nowrap">{settings.appName}</h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Enterprise Finance</p>
            </div>
          </div>
        </div>

        <div className="px-4 w-full overflow-hidden mt-3">
          {!isTimLapangan && (
            <Link
              href="/executive"
              onClick={onClose}
              className={cn(
                "group relative flex items-center gap-3 px-4 py-2 rounded-xl transition-all duration-300 overflow-hidden w-full",
                pathname === '/executive'
                  ? cn(theme.bg, "shadow-xl dark:bg-white/10 border border-white/10 dark:border-indigo-500/50", !theme.isCustom && theme.shadow)
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30"
              )}
              style={pathname === '/executive' && theme.isCustom ? { backgroundColor: theme.color, boxShadow: `0 10px 15px -3px ${theme.color}44` } : {}}
            >
              {pathname === '/executive' && (
                <m.div
                  layoutId="header-active-bar"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full"
                />
              )}
              <div className={cn(
                "p-1 rounded-lg transition-colors shrink-0",
                pathname === '/executive' ? "bg-white/20 text-white" : "bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white"
              )}>
                <TrendingUp size={14} />
              </div>
              <span className={cn(
                "text-[11px] font-black uppercase tracking-tight whitespace-nowrap transition-colors",
                pathname === '/executive' ? "text-white" : "text-slate-700 dark:text-slate-200"
              )}>
                Executive Summary
              </span>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 mt-6 px-4 overflow-y-auto overflow-x-hidden no-scrollbar min-h-0 pb-2">
          {navigation.filter(item => {
            if (isTimLapangan) {
              const hiddenItems = ['Finance', 'Regional Analysis', 'Predictive Analysis'];
              if (hiddenItems.includes(item.name)) return false;
            }
            return true;
          }).map((item) => {
            const isActive = item.href === "/"
              ? pathname === "/" || pathname === "/profitability"
              : pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group relative flex items-center gap-3 px-4 py-2 rounded-xl transition-colors duration-200 overflow-hidden w-full flex-nowrap",
                  isActive
                    ? cn("font-bold", theme.textActive)
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                {isActive && (
                  <div
                    className="absolute inset-0 bg-white dark:bg-slate-900 shadow-sm border border-slate-200/50 dark:border-slate-800 rounded-xl pointer-events-none"
                  />
                )}
                <item.icon size={20} className={cn("relative z-10 shrink-0", isActive && !theme.isCustom ? theme.textActive : "group-hover:scale-110 transition-transform")} style={isActive && theme.isCustom ? { color: theme.color } : {}} />
                <span className="relative z-10 text-[12px] truncate min-w-0" style={isActive && theme.isCustom ? { color: theme.color, fontWeight: 'bold' } : {}}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer: Logout Button */}
        <div ref={logoutBtnRef} className="relative mt-auto px-4 pb-12 md:pb-8 pt-1">
          <button
            onClick={() => setIsLogoutConfirmOpen(v => !v)}
            className={`group w-full flex items-center space-x-3 px-4 py-2 rounded-xl transition-all overflow-hidden ${
              isLogoutConfirmOpen
                ? 'text-red-500 bg-red-50 dark:bg-red-500/10'
                : 'text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400'
            }`}
          >
            <Power size={20} className="group-hover:rotate-12 transition-transform shrink-0" />
            <span className="text-[12px] font-bold truncate min-w-0">Logout</span>
          </button>

          {/* ── DESKTOP: Popover anchored above logout button (inside sidebar) ── */}
          <AnimatePresence>
            {isLogoutConfirmOpen && (
              <m.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className="hidden md:block absolute bottom-full left-0 right-0 mb-2 z-[200]"
              >
                <div className="mx-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
                  {/* Red gradient header strip */}
                  <div className="bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                      <AlertTriangle size={16} className="text-white" />
                    </div>
                    <p className="text-white text-sm font-black tracking-tight">Keluar dari sesi ini?</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-slate-400 dark:text-slate-500 text-xs font-medium leading-relaxed mb-3">
                      Pastikan semua pekerjaan sudah tersimpan.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsLogoutConfirmOpen(false)}
                        disabled={isLoggingOut}
                        className="flex-1 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleLogoutConfirm}
                        disabled={isLoggingOut}
                        className="flex-1 py-2 text-xs font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/25"
                      >
                        {isLoggingOut ? (
                          <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <><LogOut size={13} /> Logout</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* ── MOBILE / TABLET: Bottom Sheet ── */}
      <AnimatePresence>
        {isLogoutConfirmOpen && (
          <div className="md:hidden fixed inset-0 z-[9999] flex flex-col justify-end">
            {/* Backdrop */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLogoutConfirmOpen(false)}
              className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
            />

            {/* Sheet */}
            <m.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 36, mass: 0.8 }}
              className="relative bg-white dark:bg-slate-950 rounded-t-[28px] shadow-2xl overflow-hidden"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
              </div>

              {/* Red strip */}
              <div className="mx-4 mt-3 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-black text-base leading-tight">Keluar dari sesi ini?</p>
                  <p className="text-white/70 text-xs font-medium mt-0.5">Sesi aktif Anda akan diakhiri.</p>
                </div>
              </div>

              <div className="px-4 py-4">
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-5 text-center">
                  Pastikan semua pekerjaan sudah tersimpan sebelum melanjutkan.
                </p>
                <div className="flex gap-3 pb-safe">
                  <button
                    onClick={() => setIsLogoutConfirmOpen(false)}
                    disabled={isLoggingOut}
                    className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleLogoutConfirm}
                    disabled={isLoggingOut}
                    className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl text-sm shadow-xl shadow-red-500/30 hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoggingOut ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><LogOut size={16} /> Logout</>
                    )}
                  </button>
                </div>
                {/* Safe area padding for iOS */}
                <div className="h-6" />
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
