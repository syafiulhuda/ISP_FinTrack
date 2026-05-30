"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getSystemSettings, updateSystemSettings } from "@/actions/settings";
import { applyTheme } from "@/lib/themes/theme-engine";

interface SettingsState {
  appName: string;
  appSubtitle: string;
  accentColor: string;
  appLogo: string;
  timezone: string;
  language: string;
  currentTheme: string;
  darkModeEnabled: boolean;
  darkModePreference: 'light' | 'dark' | 'system';
}

interface SettingsContextType {
  settings: SettingsState;
  updateSettings: (newSettings: Partial<SettingsState>) => Promise<void>;
  isLoaded: boolean;
}

const defaultSettings: SettingsState = {
  appName: "ISP-FinTrack",
  appSubtitle: "Enterprise Finance",
  accentColor: "blue",
  appLogo: "",
  timezone: "Asia/Jakarta (UTC+07)",
  language: "Indonesian (ID)",
  currentTheme: "denim-workwear",
  darkModeEnabled: false,
  darkModePreference: "system",
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
 const [settings, setSettings] = useState<SettingsState>(defaultSettings);
 const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 1. Sync from localStorage (immediate paint)
    const saved = localStorage.getItem("isp_fintrack_settings");
    let initialSettings = defaultSettings;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        initialSettings = { ...defaultSettings, ...parsed };
        setSettings(initialSettings);
        
        // Immediate paint for theme
        if (initialSettings.currentTheme) {
            let activeMode: 'light' | 'dark' = initialSettings.darkModeEnabled ? 'dark' : 'light';
            if (initialSettings.darkModePreference === 'system') {
                activeMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            applyTheme(initialSettings.currentTheme, activeMode);
        }
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }

    // 2. Sync from Database
    getSystemSettings().then((dbSettings) => {
      setSettings((prev) => {
        const merged = { ...prev, ...dbSettings };
        localStorage.setItem("isp_fintrack_settings", JSON.stringify(merged));
        
        // Re-apply if database has different settings
        if (merged.currentTheme !== initialSettings.currentTheme || 
            merged.darkModeEnabled !== initialSettings.darkModeEnabled ||
            merged.darkModePreference !== initialSettings.darkModePreference) {
            let activeMode: 'light' | 'dark' = merged.darkModeEnabled ? 'dark' : 'light';
            if (merged.darkModePreference === 'system') {
                activeMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }
            applyTheme(merged.currentTheme, activeMode);
        }

        return merged;
      });
    }).catch(console.error);
  }, []);

  const updateSettings = async (newSettings: Partial<SettingsState>) => {
    let finalSettings = settings;
    setSettings((prev) => {
      finalSettings = { ...prev, ...newSettings };
      localStorage.setItem("isp_fintrack_settings", JSON.stringify(finalSettings));
      return finalSettings;
    });

    // If theme-related settings changed, apply and save to DB
    if (newSettings.currentTheme !== undefined || newSettings.darkModeEnabled !== undefined || newSettings.darkModePreference !== undefined) {
       const activeTheme = newSettings.currentTheme || finalSettings.currentTheme;
       const activeDark = newSettings.darkModeEnabled !== undefined ? newSettings.darkModeEnabled : finalSettings.darkModeEnabled;
       const activePref = newSettings.darkModePreference || finalSettings.darkModePreference;
       
       let activeMode: 'light' | 'dark' = activeDark ? 'dark' : 'light';
       if (activePref === 'system' && typeof window !== 'undefined') {
           activeMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
       }
       
       applyTheme(activeTheme, activeMode);

       try {
           await updateSystemSettings({
               ...finalSettings,
               currentTheme: activeTheme,
               darkModeEnabled: activeDark,
               darkModePreference: activePref
           });
       } catch (error) {
           console.error("Failed to sync settings to DB:", error);
       }
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoaded: mounted }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
 const context = useContext(SettingsContext);
 if (context === undefined) {
 throw new Error("useSettings must be used within a SettingsProvider");
 }
 return context;
}
