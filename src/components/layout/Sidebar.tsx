"use client";

import Link from"next/link";
import Image from"next/image";
import { usePathname, useRouter } from"next/navigation";
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
} from"lucide-react";
import { cn } from"@/lib/utils";
import { m, AnimatePresence } from"framer-motion";
import { useSettings } from"@/components/providers/SettingsProvider";
import { useState, useRef } from"react";
import { useQuery } from"@tanstack/react-query";
import { getAdminProfile } from"@/actions/admin";
import { LifeBuoy } from"lucide-react";

const navigation = [
 { name:"Dashboard", href:"/", icon: LayoutDashboard },
 { name:"Service Tiers", href:"/service-tiers", icon: Layers },
 { name:"Finance", href:"/finance", icon: CreditCard },
 { name:"Inventory", href:"/inventory", icon: Package },
 { name:"Distribution Map", href:"/distribution", icon: Map },
 { name:"Customer Analysis", href:"/customers", icon: Users },
 { name:"Regional Analysis", href:"/regional", icon: Map },
 { name:"Trouble Tickets", href:"/tickets", icon: LifeBuoy },
 { name:"Predictive Analysis", href:"/predictions", icon: TrendingUp },
];

 export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
 const pathname = usePathname();
 const router = useRouter();
 const { settings } = useSettings();

 const { data: profile } = useQuery({
 queryKey: ['adminProfile'],
 queryFn: getAdminProfile
 });
 const isTimLapangan = profile?.role ==='Tim Lapangan'|| profile?.role ==='Pekerja';

 const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
 const [isLoggingOut, setIsLoggingOut] = useState(false);
 const logoutBtnRef = useRef<HTMLDivElement>(null);

 const handleLogoutConfirm = async () => {
 setIsLoggingOut(true);
 router.push("/logout");
 };

 return (
 <>
 {/* Mobile Backdrop */}
 {isOpen && (
 <div
 className="fixed inset-0 bg-card/60 backdrop-blur-sm z-[55] md:hidden"
 onClick={onClose}
 />
 )}

 <aside className={cn(
"sidebar-fixed fixed inset-y-0 left-0 z-[60] bg-muted flex flex-col border-r border-border md:translate-x-0 shadow-2xl md:shadow-none overflow-hidden",
 isOpen ?"translate-x-0":"-translate-x-full md:translate-x-0"
 )}>
 {/* Header */}
 <div className="pt-4 px-6">
 <div className="flex items-center space-x-3 mb-2 px-2">
 <m.div
 initial={false}
 animate={{ scale: 1, opacity: 1 }}
 className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-lg overflow-hidden shrink-0"
 style={{
 backgroundColor: settings.accentColor.startsWith('#')
 ? settings.accentColor
 : (
 settings.accentColor ==='indigo'?'#4f46e5':
 settings.accentColor ==='emerald'?'#10b981':
 settings.accentColor ==='amber'?'#d97706':
 '#2563eb' // default blue
 ),
 boxShadow: settings.accentColor.startsWith('#') 
 ?`0 10px 15px -3px ${settings.accentColor}44`
 : (
 settings.accentColor ==='indigo'?'0 10px 15px -3px rgba(79, 70, 229, 0.2)':
 settings.accentColor ==='emerald'?'0 10px 15px -3px rgba(16, 185, 129, 0.2)':
 settings.accentColor ==='amber'?'0 10px 15px -3px rgba(217, 119, 6, 0.2)':
 '0 10px 15px -3px rgba(37, 99, 235, 0.2)'
 )
 }}
 >
 {settings.appLogo ? (
 <Image unoptimized src={settings.appLogo} alt="App Logo"width={36} height={36} className="w-full h-full object-cover"/>
 ) : (
 settings.appName.substring(0, 2).toUpperCase()
 )}
 </m.div>
 <div className="flex flex-col">
 <h1 className="font-black text-base tracking-tight text-foreground leading-none whitespace-nowrap">{settings.appName}</h1>
 <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Enterprise Finance</p>
 </div>
 </div>
 </div>

 <div className="px-4 w-full overflow-hidden mt-3">
 {!isTimLapangan && (
 <Link
 href="/executive"
 onClick={onClose}
 className={cn(
"group relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 overflow-hidden w-full border-2",
 pathname ==='/executive'
 ?"bg-primary text-primary-foreground shadow-lg shadow-primary/30 border-primary"
 :"bg-card border-border hover:border-primary/50 hover:shadow-md"
 )}
 >
 {pathname ==='/executive'&& (
 <m.div
 layoutId="header-active-bar"
 className="absolute left-0 top-2 bottom-2 w-1.5 bg-white/50 rounded-r-full"
 />
 )}
 <div className={cn(
"p-1.5 rounded-lg transition-colors shrink-0",
 pathname ==='/executive'?"bg-black/15 text-primary-foreground":"bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
 )}>
 <TrendingUp size={16} />
 </div>
 <span className={cn(
"text-[12px] font-black uppercase tracking-tight whitespace-nowrap transition-colors",
 pathname ==='/executive'?"text-primary-foreground":"text-foreground"
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
 const hiddenItems = ['Finance','Regional Analysis','Predictive Analysis'];
 if (hiddenItems.includes(item.name)) return false;
 }
 return true;
 }).map((item) => {
 const isActive = item.href ==="/"
 ? pathname ==="/"|| pathname ==="/profitability"
 : pathname === item.href;

 return (
 <Link
 key={item.name}
 href={item.href}
 onClick={onClose}
 className={cn(
"group relative flex items-center gap-3 px-4 py-2 rounded-xl transition-colors duration-200 overflow-hidden w-full flex-nowrap",
 isActive
 ?"font-bold text-primary"
 :"text-muted-foreground hover:text-foreground"
 )}
 >
 {isActive && (
 <div
 className="absolute inset-0 bg-card shadow-sm border-2 border-primary/20 rounded-xl pointer-events-none"
 />
 )}
 <item.icon size={20} className={cn("relative z-10 shrink-0", isActive ?"text-primary":"group-hover:scale-110 transition-transform")} />
 <span className="relative z-10 text-[12px] truncate min-w-0">{item.name}</span>
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
 ?'text-red-500 bg-red-50 dark:bg-red-500/10'
 :'text-muted-foreground hover:text-red-500 dark:hover:text-red-400'
 }`}
 >
 <Power size={20} className="group-hover:rotate-12 transition-transform shrink-0"/>
 <span className="text-[12px] font-bold truncate min-w-0">Logout</span>
 </button>

 </div>
 </aside>

 {/* ── DESKTOP: Popup disamping sidebar sejajar tombol logout ── */}
 <AnimatePresence>
 {isLogoutConfirmOpen && (
 <>
 {/* Invisible backdrop */}
 <div
 className="hidden md:block fixed inset-0 z-[9998]"
 onClick={() => setIsLogoutConfirmOpen(false)}
 />
 <m.div
 initial={{ opacity: 0, x: -20, y: 0 }}
 animate={{ opacity: 1, x: 0, y: 0 }}
 exit={{ opacity: 0, x: -20, y: 0 }}
 transition={{ type:'spring', stiffness: 420, damping: 34 }}
 className="hidden md:block fixed bottom-8 left-[17rem] w-72 z-[9999]"
 >
 <div className="bg-card rounded-2xl shadow-2xl border border-border/80 /80 overflow-hidden">
 {/* Red gradient header strip */}
 <div className="bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3 flex items-center gap-3">
 <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
 <AlertTriangle size={16} className="text-white"/>
 </div>
 <div>
 <p className="text-white text-sm font-black tracking-tight leading-tight">Keluar dari sesi ini?</p>
 <p className="text-white/70 text-[10px] font-medium mt-0.5">Sesi aktif Anda akan diakhiri.</p>
 </div>
 </div>
 <div className="px-4 py-3">
 <p className="text-muted-foreground text-xs font-medium leading-relaxed mb-3">
 Pastikan semua pekerjaan sudah tersimpan sebelum melanjutkan.
 </p>
 <div className="flex gap-2">
 <button
 onClick={() => setIsLogoutConfirmOpen(false)}
 disabled={isLoggingOut}
 className="flex-1 py-2 text-xs font-bold bg-muted text-muted-foreground rounded-xl hover:bg-muted transition-all disabled:opacity-50"
 >
 Batal
 </button>
 <button
 onClick={handleLogoutConfirm}
 disabled={isLoggingOut}
 className="flex-1 py-2 text-xs font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/25"
 >
 {isLoggingOut ? (
 <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
 ) : (
 <><LogOut size={13} /> Logout</>
 )}
 </button>
 </div>
 </div>
 </div>
 </m.div>
 </>
 )}
 </AnimatePresence>

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
 className="absolute inset-0 bg-card/70 backdrop-blur-sm"
 />

 {/* Sheet */}
 <m.div
 initial={{ y:'100%'}}
 animate={{ y: 0 }}
 exit={{ y:'100%'}}
 transition={{ type:'spring', stiffness: 400, damping: 36, mass: 0.8 }}
 className="relative bg-white rounded-t-[28px] shadow-2xl overflow-hidden"
 >
 {/* Drag handle */}
 <div className="flex justify-center pt-3 pb-1">
 <div className="w-10 h-1 bg-slate-300 rounded-full"/>
 </div>

 {/* Red strip */}
 <div className="mx-4 mt-3 bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl px-5 py-4 flex items-center gap-4">
 <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
 <AlertTriangle size={20} className="text-white"/>
 </div>
 <div>
 <p className="text-white font-black text-base leading-tight">Keluar dari sesi ini?</p>
 <p className="text-white/70 text-xs font-medium mt-0.5">Sesi aktif Anda akan diakhiri.</p>
 </div>
 </div>

 <div className="px-4 py-4">
 <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-5 text-center">
 Pastikan semua pekerjaan sudah tersimpan sebelum melanjutkan.
 </p>
 <div className="flex gap-3 pb-safe">
 <button
 onClick={() => setIsLogoutConfirmOpen(false)}
 disabled={isLoggingOut}
 className="flex-1 py-4 bg-muted text-foreground font-bold rounded-2xl text-sm hover:bg-muted transition-all disabled:opacity-50"
 >
 Batal
 </button>
 <button
 onClick={handleLogoutConfirm}
 disabled={isLoggingOut}
 className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl text-sm shadow-xl shadow-red-500/30 hover:bg-red-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
 >
 {isLoggingOut ? (
 <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
 ) : (
 <><LogOut size={16} /> Logout</>
 )}
 </button>
 </div>
 {/* Safe area padding for iOS */}
 <div className="h-6"/>
 </div>
 </m.div>
 </div>
 )}
 </AnimatePresence>
 </>
 );
}
