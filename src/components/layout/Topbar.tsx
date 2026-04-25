"use client";

import { Menu, Search, Bell, Settings, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAdminProfile } from "@/actions/db";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { data: adminProfile } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: getAdminProfile
  });

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 z-50 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[0px_12px_32px_rgba(25,28,30,0.06)] flex items-center justify-between px-6 h-16 w-auto">
      {/* Mobile Brand/Menu & Title Wrapper */}
      <div className="flex items-center space-x-4">
        {/* Mobile Menu */}
        <div className="flex items-center md:hidden space-x-4">
          <button className="text-on-surface">
            <Menu size={24} />
          </button>
          <span className="text-xl font-bold tracking-tight text-blue-700 dark:text-blue-500">ISP-FinTrack</span>
        </div>

        {/* Dark Mode Toggle (Desktop & Mobile) */}
        <button 
          onClick={(e) => toggleTheme(e)}
          className="p-2 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary-container transition-all duration-300"
          title="Toggle theme"
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Page Title (Desktop) */}
        <div className="hidden md:block">
          <h2 className="text-xl font-bold tracking-tight text-on-surface dark:text-slate-100">Executive Overview</h2>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-4">
        <div className="relative hidden sm:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            className="bg-slate-200/50 dark:bg-slate-800/50 text-on-surface dark:text-slate-100 pl-9 pr-4 py-1.5 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 border-none w-48 transition-all" 
            placeholder="Search..." 
            type="text"
          />
        </div>
        <Link href="/notifications" className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-2 rounded-full active:opacity-80">
          <Bell size={20} />
        </Link>
        <Link href="/settings" className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-2 rounded-full active:opacity-80">
          <Settings size={20} />
        </Link>
        <Link href="/profile" className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 ml-2 block">
          <img 
            alt="User profile avatar" 
            className="w-full h-full object-cover" 
            src={adminProfile?.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuB16vqPWetcC6kIf85x6AAuF-x6yUt8WmOitBoxEKyYPnR5Vh6FmA5-VNcyKgEltts0AfO1q2wcP-2k913aaSTQ30Yx1mGAKXpX9KpWy0fldOAPSKlR5LcX3A2T9qaDeb7gcKEkIDsuK_NTXGEPwUSK-qy-V9CC9EMhUxUpn2WxZmoeeIzklcIVHET9Y6TwBaYeuGMVj8v5gf8f9CTdXAf1TBAAJtKQi_hUdDgPSEQ8Y8cWd8f86xPw7IgvKV83_lusd_Q-AXKDJPI"}
          />
        </Link>
      </div>
    </header>
  );
}
