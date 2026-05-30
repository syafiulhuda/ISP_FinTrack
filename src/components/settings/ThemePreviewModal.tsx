"use client";

import React, { useEffect, useRef, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { X, LayoutDashboard, Users, CreditCard, Settings, Bell, Search, BarChart3 } from "lucide-react";
import { ThemePalette } from "@/types/theme";
import { applyThemeColors, clearThemeColors } from "@/lib/themes/css-variable-manager";
import { cn } from "@/lib/utils";

interface ThemePreviewModalProps {
  theme: ThemePalette | null;
  onClose: () => void;
  onApply: (themeId: string, mode: 'light' | 'dark') => void;
  disabled?: boolean;
}

export function ThemePreviewModal({ theme, onClose, onApply, disabled }: ThemePreviewModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewMode, setPreviewMode] = useState<'light' | 'dark'>('light');

  // Initialize preview mode based on theme support
  useEffect(() => {
    if (theme) {
      if (!theme.supportedModes.includes(previewMode)) {
        setPreviewMode(theme.supportedModes[0] as 'light' | 'dark');
      }
    }
  }, [theme]);

  // Apply colors scoped to the container
  useEffect(() => {
    if (theme && containerRef.current) {
      const colors = theme.colors[previewMode];
      if (colors) {
        // We apply the variables to our container to scope them
        applyThemeColors(colors, containerRef.current);
      }
      
      // Cleanup on unmount or mode change
      return () => {
        if (colors && containerRef.current) {
          clearThemeColors(colors, containerRef.current);
        }
      };
    }
  }, [theme, previewMode]);

  if (!theme) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <m.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative bg-card w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[85vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between bg-card shrink-0">
            <div>
              <h3 className="text-xl font-bold text-foreground">Theme Preview: {theme.name}</h3>
              <p className="text-sm text-muted-foreground">{theme.aesthetic}</p>
            </div>
            <div className="flex items-center gap-4">
              {theme.supportedModes.length > 1 && (
                <div className="bg-muted p-1 rounded-xl flex items-center">
                  <button
                    onClick={() => setPreviewMode('light')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                      previewMode === 'light' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setPreviewMode('dark')}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-bold transition-all",
                      previewMode === 'dark' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Dark
                  </button>
                </div>
              )}
              <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Preview Container - Scoped CSS Variables apply here */}
          <div 
            ref={containerRef}
            className={cn(
              "flex-1 overflow-auto bg-background text-foreground p-6 sm:p-10",
              // We need to force a local stacking context so globals don't override 
              // the scoped variables if they are set directly on children
            )}
            style={{
              // Force background color directly so it overrides the global body background for this preview
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)'
            }}
          >
            {/* Mock Application Layout */}
            <div className="max-w-4xl mx-auto flex gap-6 h-full">
              {/* Mock Sidebar */}
              <div className="w-64 hidden md:flex flex-col gap-6" style={{ 
                backgroundColor: 'var(--sidebar, var(--card))',
                borderColor: 'var(--sidebar-border, var(--border))',
                color: 'var(--sidebar-foreground, var(--card-foreground))'
              }}>
                <div className="flex items-center gap-3 px-2">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    IS
                  </div>
                  <span className="font-bold text-lg">FinTrack</span>
                </div>
                
                <nav className="space-y-1">
                  {[
                    { icon: LayoutDashboard, label: "Dashboard", active: true },
                    { icon: Users, label: "Customers", active: false },
                    { icon: CreditCard, label: "Invoices", active: false },
                    { icon: BarChart3, label: "Reports", active: false },
                    { icon: Settings, label: "Settings", active: false },
                  ].map((item, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors",
                        item.active 
                          ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon size={18} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                  ))}
                </nav>

                <div className="mt-auto bg-muted p-4 rounded-xl">
                  <p className="text-xs font-bold mb-2">Storage Usage</p>
                  <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-3/4 rounded-full" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">75% capacity reached</p>
                </div>
              </div>

              {/* Mock Main Content */}
              <div className="flex-1 flex flex-col gap-6">
                {/* Mock Header */}
                <header className="flex items-center justify-between bg-card border border-border p-3 rounded-2xl shadow-sm">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search anything..." 
                      className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors relative">
                      <Bell size={18} />
                      <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full border border-card" />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold border-2 border-border shadow-sm">
                      AD
                    </div>
                  </div>
                </header>

                {/* Mock Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: "Total Revenue", value: "Rp 125.000.000", change: "+12.5%", positive: true },
                    { label: "Active Users", value: "2,451", change: "+5.2%", positive: true },
                    { label: "Churn Rate", value: "1.2%", change: "-0.4%", positive: false },
                  ].map((stat, i) => (
                    <div key={i} className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                      <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                      <h4 className="text-2xl font-bold text-foreground mb-2">{stat.value}</h4>
                      <span className={cn(
                        "text-xs font-bold px-2 py-1 rounded-md",
                        stat.positive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                      )}>
                        {stat.change}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Mock Chart / Content Area */}
                <div className="bg-card flex-1 rounded-2xl border border-border shadow-sm p-6 flex flex-col">
                  <h4 className="font-bold text-lg mb-6">Revenue Analytics</h4>
                  <div className="flex-1 flex items-end gap-2">
                    {[40, 70, 45, 90, 65, 85, 120].map((height, i) => (
                      <div key={i} className="flex-1 bg-muted rounded-t-md relative group">
                        <div 
                          className="absolute bottom-0 w-full rounded-t-md transition-all duration-500"
                          style={{ 
                            height: `${height}%`,
                            backgroundColor: i === 6 ? 'var(--primary)' : 'var(--accent)'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-6 border-t border-border bg-card shrink-0 flex items-center justify-between">
            <p className="text-sm text-muted-foreground max-w-lg hidden sm:block">
              {theme.metadata.usageGuidelines}
            </p>
            <div className="flex gap-3 w-full sm:w-auto">
              <button 
                onClick={onClose}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-foreground bg-muted hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (!disabled) {
                    onApply(theme.id, previewMode);
                    onClose();
                  }
                }}
                disabled={disabled}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-primary-foreground bg-primary hover:opacity-90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Theme
              </button>
            </div>
          </div>
        </m.div>
      </div>
    </AnimatePresence>
  );
}
