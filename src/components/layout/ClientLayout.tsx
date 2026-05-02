"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            <Topbar onMenuClick={() => setIsMobileMenuOpen(true)} />

            <main className="flex-1 overflow-y-auto pt-24 pb-12 px-6 lg:px-8">
              <div className="max-w-7xl mx-auto w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 8, scale: 0.99, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, scale: 0.99, filter: "blur(8px)" }}
                    transition={{ 
                      duration: 0.4, 
                      ease: [0.22, 1, 0.36, 1] 
                    }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>
            </main>
          </div>
        </div>
      </ThemeProvider>
    </SettingsProvider>
  );
}
