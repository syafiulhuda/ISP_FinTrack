"use client";

import React, { useState } from "react";
import { ThemeCard } from "./ThemeCard";
import { ThemePreviewModal } from "./ThemePreviewModal";
import { allThemePalettes } from "@/lib/themes/palettes";
import { ThemePalette } from "@/types/theme";
import { validateThemeContrast } from "@/lib/themes/wcag-validator";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeSelectorProps {
  currentThemeId: string;
  activeMode: 'light' | 'dark';
  onSelectTheme: (themeId: string, mode: 'light' | 'dark') => void;
  disabled?: boolean;
}

export function ThemeSelector({ currentThemeId, activeMode, onSelectTheme, disabled }: ThemeSelectorProps) {
  const [previewTheme, setPreviewTheme] = useState<ThemePalette | null>(null);

  const activeTheme = allThemePalettes.find(t => t.id === currentThemeId) || allThemePalettes[0];

  // Evaluate WCAG compliance of the currently active theme's light mode (or dark if light not available)
  const modeToValidate = activeTheme.colors.light ? 'light' : 'dark';
  const colorsToValidate = activeTheme.colors[modeToValidate];
  const accessibilityIssues = colorsToValidate ? validateThemeContrast(colorsToValidate) : [];
  const hasErrors = accessibilityIssues.some(i => i.severity === 'error');
  const hasWarnings = accessibilityIssues.some(i => i.severity === 'warning');

  return (
    <div className="space-y-6">
      {/* WCAG Status Banner */}
      <div className={cn(
        "p-4 rounded-xl border flex items-start gap-3",
        hasErrors ? "bg-destructive/10 border-destructive/20 text-destructive" :
        hasWarnings ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-500" :
        "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500"
      )}>
        {hasErrors || hasWarnings ? <AlertCircle className="shrink-0 mt-0.5" size={18} /> : <CheckCircle2 className="shrink-0 mt-0.5" size={18} />}
        <div>
          <h4 className="font-bold text-sm">
            {hasErrors ? "Accessibility Issues Detected" : hasWarnings ? "Accessibility Warnings" : "WCAG AA Compliant"}
          </h4>
          <p className="text-xs opacity-90 mt-1">
            {hasErrors 
              ? "The active theme has contrast ratios below the minimum requirement of 3:1." 
              : hasWarnings 
                ? "The active theme has some contrast ratios below the recommended 4.5:1 for normal text." 
                : "The active theme meets all WCAG AA contrast requirements for optimal readability."}
          </p>
        </div>
      </div>

      {/* Theme Grid Filtered by Active Mode */}
      <div className="space-y-8">
        {activeMode === 'light' && (
          <div>
            <div className="mb-4">
              <h4 className="font-bold text-foreground">Light Mode Themes</h4>
              <p className="text-sm text-muted-foreground">These themes are exclusively designed for light mode.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {allThemePalettes.filter(t => t.supportedModes.includes('light')).map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isActive={currentThemeId === theme.id}
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled) {
                      onSelectTheme(theme.id, 'light');
                    }
                  }}
                  onPreview={() => setPreviewTheme(theme)}
                />
              ))}
            </div>
          </div>
        )}

        {activeMode === 'dark' && (
          <div>
            <div className="mb-4">
              <h4 className="font-bold text-foreground">Dark Mode Themes</h4>
              <p className="text-sm text-muted-foreground">These themes are exclusively designed for dark mode.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {allThemePalettes.filter(t => t.supportedModes.includes('dark')).map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  isActive={currentThemeId === theme.id}
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled) {
                      onSelectTheme(theme.id, 'dark');
                    }
                  }}
                  onPreview={() => setPreviewTheme(theme)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewTheme && (
        <ThemePreviewModal
          theme={previewTheme}
          disabled={disabled}
          onClose={() => setPreviewTheme(null)}
          onApply={onSelectTheme}
        />
      )}
    </div>
  );
}
