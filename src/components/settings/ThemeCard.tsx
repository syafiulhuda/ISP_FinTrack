"use client";

import React from "react";
import { ThemePalette } from "@/types/theme";
import { CheckCircle2, Eye, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeCardProps {
  theme: ThemePalette;
  isActive: boolean;
  disabled?: boolean;
  onClick: () => void;
  onPreview: () => void;
}

export function ThemeCard({ theme, isActive, disabled, onClick, onPreview }: ThemeCardProps) {
  // We use the light mode colors for the thumbnail preview if available, else dark mode.
  const previewColors = theme.colors.light || theme.colors.dark;
  if (!previewColors) return null;

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 transition-all overflow-hidden group flex flex-col",
        isActive ? "border-primary shadow-lg shadow-primary/10" : "border-border hover:border-primary/50",
        disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
      )}
      onClick={() => !disabled && onClick()}
    >
      {/* Active Check Badge */}
      {isActive && (
        <div className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground rounded-full p-1 shadow-md">
          <CheckCircle2 size={16} />
        </div>
      )}

      {/* Preview Header Area */}
      <div 
        className="h-28 w-full p-4 flex flex-col justify-between relative"
        style={{ backgroundColor: previewColors.background }}
      >
        <div className="flex justify-between items-start">
          <div className="flex gap-1.5">
            {/* Color Swatches */}
            <div className="w-5 h-5 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: previewColors.primary }} />
            <div className="w-5 h-5 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: previewColors.secondary }} />
            <div className="w-5 h-5 rounded-full shadow-sm border border-black/10" style={{ backgroundColor: previewColors.accent }} />
          </div>
          
          {/* Mode Badges */}
          <div className="flex gap-1 bg-black/10 dark:bg-white/10 backdrop-blur-sm rounded-full px-2 py-1">
            {theme.supportedModes.includes('light') && <Sun size={12} className="text-current" style={{ color: previewColors.foreground }} />}
            {theme.supportedModes.includes('dark') && <Moon size={12} className="text-current" style={{ color: previewColors.foreground }} />}
          </div>
        </div>

        {/* Mock UI Elements */}
        <div className="flex gap-2">
          <div className="h-6 w-16 rounded-md shadow-sm" style={{ backgroundColor: previewColors.primary }}></div>
          <div className="h-6 w-20 rounded-md shadow-sm border" style={{ backgroundColor: previewColors.card, borderColor: previewColors.border }}></div>
        </div>
      </div>

      {/* Info Area */}
      <div className="p-4 bg-card border-t border-border flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-bold text-foreground text-base">{theme.name}</h4>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
          {theme.description}
        </p>
        
        <div className="flex items-center justify-between mt-auto">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-md">
            {theme.aesthetic.split(',')[0]}
          </span>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
          >
            <Eye size={14} /> Preview
          </button>
        </div>
      </div>
    </div>
  );
}
