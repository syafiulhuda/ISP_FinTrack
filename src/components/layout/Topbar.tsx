"use client";

import { Menu, Bell, Settings, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { getAdminProfile, getNotifications } from "@/actions/admin";
import { Admin, Notification } from "@/types";

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const { data: adminProfile } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: getAdminProfile
  });
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
    refetchInterval: 60000,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const unreadCount = notifications.filter((n: any) => n.is_unread).length;

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 z-50 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[0px_12px_32px_rgba(25,28,30,0.06)] flex items-center justify-between px-4 md:px-8 h-16 transition-all duration-300">
      {/* Mobile Brand/Menu & Title Wrapper */}
      <div className="flex items-center space-x-2 md:space-x-4 min-w-0">
        {/* Mobile Menu & Logo */}
        <div className="flex items-center md:hidden space-x-3 shrink-0">
          <button
            className="text-slate-900 dark:text-white p-1 -ml-1"
            onClick={onMenuClick}
            aria-label="Open mobile menu"
          >
            <Menu size={24} />
          </button>
          <span className="text-lg font-black tracking-tight text-blue-600 dark:text-blue-500 whitespace-nowrap shrink-0">ISP-FinTrack</span>
        </div>

        {/* Dark Mode Toggle (Desktop & Mobile) */}
        <button
          onClick={(e) => toggleTheme(e)}
          className="p-2 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary-container transition-all duration-300"
          title="Toggle theme"
          aria-label="Toggle dark and light mode"
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {/* Page Title (Desktop) */}
        <div className="hidden md:block">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Executive Overview</h1>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-1 md:space-x-4">

        <Link href="/notifications" className="relative text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-2 rounded-full active:opacity-80" aria-label="View notifications">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-50 dark:border-slate-900"></span>
          )}
        </Link>
        <Link href="/settings" className="text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-2 rounded-full active:opacity-80" aria-label="Settings">
          <Settings size={20} />
        </Link>
        <Link href="/profile" className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 ml-1 tablet:ml-2 block shrink-0" aria-label="View user profile">
          <Image
            unoptimized
            width={32}
            height={32}
            alt="User profile avatar"
            className="w-full h-full object-cover"
            src={adminProfile?.image || "https://ui-avatars.com/api/?name=New+Admin&background=random&size=256"}
          />
        </Link>
      </div>
    </header>
  );
}
