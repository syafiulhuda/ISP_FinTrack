"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { m, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflowY = 'hidden';
    } else {
      document.body.style.overflowY = '';
    }
    return () => {
      document.body.style.overflowY = '';
    };
  }, [isMobileMenuOpen]);

  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/logout" || pathname.startsWith("/reset-password");

  if (isAuthPage) {
    return (
      <SettingsProvider>
        <ThemeProvider>
          <main className="flex-1 w-full h-full min-h-screen">
            {children}
          </main>
        </ThemeProvider>
      </SettingsProvider>
    );
  }

  return (
    <SettingsProvider>
      <ThemeProvider>
        <div className="flex min-h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
          <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
          <div className="flex-1 flex flex-col min-w-0 relative md:pl-64 transition-all duration-300">
            <Topbar onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />

            <main className="flex-1 overflow-y-auto overflow-x-hidden pt-24 pb-12 px-4 sm:px-6 lg:px-8 2xl:px-12">
              <div className="w-full max-w-[2000px] mx-auto">
                <ErrorBoundary>
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {children}
                  </div>
                </ErrorBoundary>
              </div>
            </main>
          </div>
        </div>
      </ThemeProvider>
    </SettingsProvider>
  );
}
