"use client";

import { useState, useEffect, useRef } from"react";
import { m, Variants, AnimatePresence } from"framer-motion";
import { useSettings } from"@/components/providers/SettingsProvider";
import {
 Settings,
 X,
 Mail,
 Lock,
 BadgeCheck,
 SlidersHorizontal,
 Palette,
 Puzzle,
 Users as UsersIcon,
 Info,
 ImagePlus,
 Pipette,
 Landmark,
 MessageSquare,
 FileScan,
 ShieldCheck,
 Terminal,
 MoreVertical,
 Trash2,
 Loader2,
 CheckCircle2,
 ChevronDown,
 Briefcase
} from"lucide-react";
import { useQuery, useMutation, useQueryClient } from"@tanstack/react-query";
import { getAdminList, createAdmin, getAdminProfile, deleteAdmin, getIntegrationStatus } from"@/actions/admin";
import { Admin } from"@/types";
import { cn } from"@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { ThemeSelector } from "@/components/settings/ThemeSelector";

const containerVariants: Variants = {
 hidden: { opacity: 0 },
 show: {
 opacity: 1,
 transition: { staggerChildren: 0.1 }
 }
};

const itemVariants: Variants = {
 hidden: { opacity: 0, y: 20 },
 show: { opacity: 1, y: 0, transition: { type:"spring", stiffness: 300, damping: 24 } }
};

export default function SettingsPage() {
 const { settings, updateSettings } = useSettings();
 const [formData, setFormData] = useState({
 appName: settings.appName,
 appSubtitle: settings.appSubtitle,
 accentColor: settings.accentColor,
 appLogo: settings.appLogo,
 timezone: settings.timezone ||'Asia/Jakarta (UTC+07)',
 language: settings.language ||'Indonesian (ID)',
 currentTheme: settings.currentTheme || 'paper-white',
 darkModeEnabled: settings.darkModeEnabled || false,
 darkModePreference: settings.darkModePreference || 'system',
 });

 const colorPickerRef = useRef<HTMLInputElement>(null);
 const queryClient = useQueryClient();

 const [activeTab, setActiveTab] = useState<'general'|'branding'|'integrations'|'users'>('general');
 const [isEditing, setIsEditing] = useState(false);
 const [isSaving, setIsSaving] = useState(false);
 const [isDiscarding, setIsDiscarding] = useState(false);
 const [showSuccess, setShowSuccess] = useState(false);
 const [isAddManagerOpen, setIsAddManagerOpen] = useState(false);
 const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
 const [tempLogoUrl, setTempLogoUrl] = useState('');
 const [newAdmin, setNewAdmin] = useState({ nama:'', email:'', password:'', role:'System Administrator', department:'Operations', image:'https://ui-avatars.com/api/?name=New+Admin&background=random&size=256', nickname:''});

 const { data: profile } = useQuery({
 queryKey: ['adminProfile'],
 queryFn: getAdminProfile
 });
 const isTimLapangan = profile?.role ==='Tim Lapangan'|| profile?.role ==='Pekerja';
 const isSystemAdmin = profile?.role ==='System Administrator';

 const { data: adminList = [] } = useQuery({
 queryKey: ['adminList'],
 queryFn: getAdminList,
 enabled: isSystemAdmin // Only fetch if user is System Admin
 });

 const { data: integrations } = useQuery({
 queryKey: ['integrationStatus'],
 queryFn: getIntegrationStatus
 });

 const createAdminMutation = useMutation({
 mutationFn: createAdmin,
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['adminList'] });
 setIsAddManagerOpen(false);
 setNewAdmin({ nama:'', email:'', password:'', role:'System Administrator', department:'Operations', image:'https://ui-avatars.com/api/?name=New+Admin&background=random&size=256', nickname:''});
 }
 });

 const deleteAdminMutation = useMutation({
 mutationFn: deleteAdmin,
 onSuccess: (res) => {
 if (res.success) {
 toast.success("User successfully deleted");
 queryClient.invalidateQueries({ queryKey: ['adminList'] });
 } else {
 toast.error(res.error ||"Failed to delete user");
 }
 },
 onError: (err: any) => {
 toast.error(err.message ||"Failed to delete user");
 }
 });

 useEffect(() => {
 setFormData({
 appName: settings.appName,
 appSubtitle: settings.appSubtitle,
 accentColor: settings.accentColor,
 appLogo: settings.appLogo,
 timezone: settings.timezone ||'Asia/Jakarta (UTC+07)',
 language: settings.language ||'Indonesian (ID)',
 currentTheme: settings.currentTheme || 'paper-white',
 darkModeEnabled: settings.darkModeEnabled || false,
 darkModePreference: settings.darkModePreference || 'system',
 });
 }, [settings]);

 const handleSave = async () => {
 setIsSaving(true);
 try {
 await updateSettings(formData);
 setShowSuccess(true);
 setIsEditing(false);
 setTimeout(() => setShowSuccess(false), 2000);
 } catch {
 toast.error('Failed to save settings.');
 } finally {
 setIsSaving(false);
 }
 };

 const handleDiscard = () => {
 setIsDiscarding(true);
 setFormData({
 appName: settings.appName,
 appSubtitle: settings.appSubtitle,
 accentColor: settings.accentColor,
 appLogo: settings.appLogo,
 timezone: settings.timezone ||'Asia/Jakarta (UTC+07)',
 language: settings.language ||'Indonesian (ID)',
 currentTheme: settings.currentTheme || 'paper-white',
 darkModeEnabled: settings.darkModeEnabled || false,
 darkModePreference: settings.darkModePreference || 'system',
 });
 setIsEditing(false);
 setIsDiscarding(false);
 };

 const handleUpdateLogo = () => {
 setTempLogoUrl(formData.appLogo);
 setIsLogoModalOpen(true);
 };

 const confirmLogoUpdate = () => {
 setFormData({ ...formData, appLogo: tempLogoUrl });
 setIsLogoModalOpen(false);
 };

 const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 256;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to WEBP with 0.8 quality to reduce payload size while preserving transparency
          const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);
          setTempLogoUrl(compressedDataUrl);
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

 return (
 <>
 <AnimatePresence>
 {(isSaving || isDiscarding || showSuccess) && (
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-auto"
 >
 <m.div
 initial={{ scale: 0.9, y: 20 }}
 animate={{ scale: 1, y: 0 }}
 exit={{ scale: 0.9, y: 20 }}
 className="bg-card border border-border p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center max-w-sm w-full mx-4"
 >
 {showSuccess ? (
 <>
 <m.div
 initial={{ scale: 0 }}
 animate={{ scale: 1 }}
 transition={{ type:"spring", bounce: 0.5 }}
 className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center mb-4"
 >
 <CheckCircle2 size={32} />
 </m.div>
 <h3 className="text-xl font-bold text-foreground mb-1">Success!</h3>
 <p className="text-sm text-muted-foreground text-center font-medium">Your configurations have been successfully updated.</p>
 </>
 ) : (
 <>
 <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 rounded-full flex items-center justify-center mb-4 relative">
 <Loader2 size={32} className="animate-spin relative z-10"/>
 <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping"></div>
 </div>
 <h3 className="text-xl font-bold text-foreground mb-1">
 {isSaving ?"Saving Settings...":"Discarding Changes..."}
 </h3>
 <p className="text-sm text-muted-foreground text-center font-medium">
 Please wait while we process your request.
 </p>
 </>
 )}
 </m.div>
 </m.div>
 )}
 </AnimatePresence>

 

 <AnimatePresence>
 {isLogoModalOpen && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
 <m.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setIsLogoModalOpen(false)}
 className="absolute inset-0 bg-card/50 backdrop-blur-sm"
 />
 <m.div
 initial={{ scale: 0.9, y: 20, opacity: 0 }}
 animate={{ scale: 1, y: 0, opacity: 1 }}
 exit={{ scale: 0.9, y: 20, opacity: 0 }}
 className="relative bg-card w-full max-w-md rounded-[2.5rem] shadow-2xl border border-border overflow-hidden"
 >
 <div className="p-8 border-b border-border flex items-center justify-between">
 <h3 className="text-xl font-black text-foreground">Update Logo</h3>
 <button onClick={() => setIsLogoModalOpen(false)} aria-label="Close modal"className="p-2 hover:bg-muted dark:hover:bg-muted rounded-xl transition-colors text-muted-foreground">
 <X size={20} />
 </button>
 </div>
 <div className="p-8 space-y-4">
 <div className="space-y-4">
 <div className="flex flex-col gap-2">
   <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
   <ImagePlus size={12} /> Upload Image (Auto Compress)
   </label>
   <input
     type="file"
     accept="image/*"
     onChange={handleLogoUpload}
     className="w-full bg-muted border border-border rounded-xl p-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-primary file:text-white hover:file:bg-primary/90 text-sm font-medium transition-colors"
   />
 </div>
 <div className="flex items-center gap-4">
   <div className="h-px bg-border flex-1"></div>
   <span className="text-xs font-bold text-muted-foreground uppercase">OR</span>
   <div className="h-px bg-border flex-1"></div>
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
 <ImagePlus size={12} /> Image URL
 </label>
 <input
 required
 type="url"
 className="w-full bg-muted border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
 value={tempLogoUrl}
 onChange={(e) => setTempLogoUrl(e.target.value)}
 placeholder="https://example.com/logo.png"
 />
 </div>
 </div>
 <button
 onClick={confirmLogoUpdate}
 className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2 mt-4"
 >
 Save Logo
 </button>
 </div>
 </m.div>
 </div>
 )}
 </AnimatePresence>

 <m.div
 variants={containerVariants}
 initial="hidden"
 animate="show"
 className="pt-6 md:pt-10 space-y-8 pb-10"
 >
 <m.div variants={itemVariants} className="mb-10">
 <h1 className="text-3xl font-bold tracking-tight text-foreground">
 Settings
 </h1>
 <p className="text-muted-foreground mt-1 font-medium">Configure your ISP management environment</p>
 </m.div>

 {/* Bento Grid Settings Layout */}
 <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

 {/* Left Nav: Category Selection */}
 <m.nav variants={itemVariants} className="md:col-span-8 lg:col-span-5 xl:col-span-3 flex flex-col gap-2 p-1 bg-card/30 rounded-2xl border border-border">
 <button
 onClick={() => setActiveTab('general')}
 className={cn(
"flex items-center gap-1.5 lg:gap-2 xl:gap-3 px-2 lg:px-3 xl:px-4 py-3 rounded-xl transition-all font-bold text-[13px] lg:text-[14px] xl:text-base whitespace-nowrap",
 activeTab ==='general'
 ?"bg-primary text-primary-foreground shadow-lg shadow-primary/20"
 :"text-muted-foreground hover:bg-muted dark:hover:bg-muted/50"
 )}
 >
 <SlidersHorizontal size={18} className="shrink-0"/>
 <span>General</span>
 </button>
 <button
 onClick={() => setActiveTab('branding')}
 className={cn(
"flex items-center gap-1.5 lg:gap-2 xl:gap-3 px-2 lg:px-3 xl:px-4 py-3 rounded-xl transition-all font-bold text-[13px] lg:text-[14px] xl:text-base whitespace-nowrap",
 activeTab ==='branding'
 ?"bg-primary text-primary-foreground shadow-lg shadow-primary/20"
 :"text-muted-foreground hover:bg-muted dark:hover:bg-muted/50"
 )}
 >
 <Palette size={18} className="shrink-0"/>
 <span>Branding</span>
 </button>
 {!isTimLapangan && (
 <>
 <button
 onClick={() => setActiveTab('integrations')}
 className={cn(
"flex items-center gap-1.5 lg:gap-2 xl:gap-3 px-2 lg:px-3 xl:px-4 py-3 rounded-xl transition-all font-bold text-[13px] lg:text-[14px] xl:text-base whitespace-nowrap",
 activeTab ==='integrations'
 ?"bg-primary text-primary-foreground shadow-lg shadow-primary/20"
 :"text-muted-foreground hover:bg-muted dark:hover:bg-muted/50"
 )}
 >
 <Puzzle size={18} className="shrink-0"/>
 <span>Integrations</span>
 </button>
 
 {profile?.role ==='System Administrator'&& (
 <button
 onClick={() => setActiveTab('users')}
 className={cn(
"flex items-center gap-1.5 lg:gap-2 xl:gap-3 px-2 lg:px-3 xl:px-4 py-3 rounded-xl transition-all font-bold text-[13px] lg:text-[14px] xl:text-base whitespace-nowrap",
 activeTab ==='users'
 ?"bg-primary text-primary-foreground shadow-lg shadow-primary/20"
 :"text-muted-foreground hover:bg-muted dark:hover:bg-muted/50"
 )}
 >
 <UsersIcon size={18} className="shrink-0"/>
 <span>User Management</span>
 </button>
 )}

 <Link
 href="/settings/audit"
 className="flex items-center gap-1.5 lg:gap-2 xl:gap-3 px-2 lg:px-3 xl:px-4 py-3 rounded-xl transition-all font-bold text-[13px] lg:text-[14px] xl:text-base whitespace-nowrap text-muted-foreground hover:bg-muted dark:hover:bg-muted/50"
 >
 <ShieldCheck size={18} className="shrink-0"/>
 <span>Security & Audit</span>
 </Link>

 {(profile?.role ==='System Administrator'|| profile?.role ==='Admin Kantor') && (
 <Link
 href="/settings/logs"
 className="flex items-center gap-1.5 lg:gap-2 xl:gap-3 px-2 lg:px-3 xl:px-4 py-3 rounded-xl transition-all font-bold text-[13px] lg:text-[14px] xl:text-base whitespace-nowrap text-muted-foreground hover:bg-muted dark:hover:bg-muted/50"
 >
 <Terminal size={18} className="shrink-0"/>
 <span>System Logs</span>
 </Link>
 )}
 </>
 )}
 </m.nav>

 {/* Right Content */}
 <div className="md:col-span-4 lg:col-span-7 xl:col-span-9 space-y-6">

 {/* Section 1: General Info */}
 {activeTab ==='general'&& (
 <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-8 rounded-3xl border border-border relative overflow-hidden group shadow-sm">
 <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
 <Info className="text-primary"size={20} />
 Application Configuration
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 App Name
 </label>
 <input
 disabled={!isEditing}
 className="w-full bg-muted border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed"
 type="text"
 value={formData.appName}
 onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 App Subtitle
 </label>
 <input
 disabled={!isEditing}
 className="w-full bg-muted border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground font-medium transition-all disabled:opacity-70 disabled:cursor-not-allowed"
 type="text"
 value={formData.appSubtitle}
 onChange={(e) => setFormData({ ...formData, appSubtitle: e.target.value })}
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Default Timezone
 </label>
 <select
 disabled={!isEditing}
 value={formData.timezone}
 onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
 className="w-full bg-muted border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 text-foreground font-medium appearance-none outline-none disabled:opacity-70 disabled:cursor-not-allowed"
 >
 <option>Asia/Jakarta (UTC+07)</option>
 <option>Asia/Makassar (UTC+08)</option>
 <option>Asia/Jayapura (UTC+09)</option>
 </select>
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 System Language
 </label>
 <select
 disabled={!isEditing}
 value={formData.language}
 onChange={(e) => setFormData({ ...formData, language: e.target.value })}
 className="w-full bg-muted border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 text-foreground font-medium appearance-none outline-none disabled:opacity-70 disabled:cursor-not-allowed"
 >
 <option>Indonesian (ID)</option>
 <option>English (Universal)</option>
 <option>Javanese (JV)</option>
 </select>
 </div>
 </div>
 </m.div>
 )}

 {/* Section 2: Branding */}
 {activeTab ==='branding'&& (
 <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-8 rounded-3xl border border-border shadow-sm">
 <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
 <Palette className="text-primary"size={20} />
 Visual Identity
 </h3>
 <div className="space-y-6">
 <div className="flex items-center gap-6">
 <div
 onClick={() => isEditing && handleUpdateLogo()}
 className={cn(
 "h-20 w-auto rounded-2xl flex items-center justify-center relative group overflow-hidden border-2 border-dashed border-border transition-colors text-white",
 isEditing ?"hover:border-primary cursor-pointer":"cursor-not-allowed opacity-70"
 )}
 style={{
 backgroundColor: formData.accentColor.startsWith('#')
 ? formData.accentColor
 : (
 formData.accentColor ==='indigo'?'#4f46e5':
 formData.accentColor ==='emerald'?'#10b981':
 formData.accentColor ==='amber'?'#d97706':
 '#2563eb' // default blue
 )
 }}
 >
 {formData.appLogo ? (
 <img src={formData.appLogo} alt="Preview" className="w-auto h-full object-contain"/>
 ) : (
 <ImagePlus className={cn("group-hover:hidden", !formData.accentColor ?'text-muted-foreground':'text-white/80')} size={24} />
 )}
 {isEditing && (
 <span className="text-[10px] absolute bottom-2 hidden group-hover:block font-bold text-primary bg-white/80 px-2 py-0.5 rounded-full shadow-sm">CHANGE</span>
 )}
 </div>
 <div>
 <p className="font-bold text-sm text-foreground">Corporate Logo</p>
 <p className="text-xs text-muted-foreground mt-1">Recommended: SVG or PNG (256x256)</p>
 {isEditing && (
   <div className="mt-3 flex items-center gap-2">
     <label className="text-xs font-bold uppercase text-muted-foreground">Bg Color</label>
     <input 
       type="color" 
       value={formData.accentColor.startsWith('#') ? formData.accentColor : (formData.accentColor === 'indigo' ? '#4f46e5' : formData.accentColor === 'emerald' ? '#10b981' : formData.accentColor === 'amber' ? '#d97706' : '#2563eb')} 
       onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
       className="w-6 h-6 rounded cursor-pointer border-0 p-0 bg-transparent"
     />
   </div>
 )}
 </div>
 </div>
 
          {/* Advanced Theming System */}
          <div className="space-y-6 pt-6 border-t border-border mt-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-foreground">Application Theme</h4>
                <p className="text-xs text-muted-foreground mt-1">Select a visual theme and color mode for your dashboard.</p>
              </div>
              <div className="flex items-center gap-2 bg-muted p-1 rounded-xl shrink-0">
                <button
                  disabled={isTimLapangan}
                  onClick={() => setFormData({ ...formData, darkModePreference: 'light', darkModeEnabled: false })}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    formData.darkModePreference === 'light' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    isTimLapangan && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Light
                </button>
                <button
                  disabled={isTimLapangan}
                  onClick={() => setFormData({ ...formData, darkModePreference: 'dark', darkModeEnabled: true })}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    formData.darkModePreference === 'dark' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    isTimLapangan && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Dark
                </button>
              </div>
            </div>

            <ThemeSelector 
              currentThemeId={formData.currentTheme || 'paper-white'}
              activeMode={formData.darkModePreference as 'light' | 'dark'}
              disabled={!isEditing || isTimLapangan}
              onSelectTheme={(themeId, mode) => {
                setFormData({
                  ...formData,
                  currentTheme: themeId,
                  darkModePreference: mode,
                  darkModeEnabled: mode === 'dark'
                });
              }}
            />
          </div>
 </div>
 </m.div>
 )}

 {/* Section 3: Integrations */}
 {activeTab ==='integrations'&& (
 <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-8 rounded-3xl border border-border border-l-4 border-l-primary shadow-sm">
 <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-foreground">
 <Puzzle className="text-primary"size={20} />
 Core Service Status
 </h3>
 <div className="space-y-4">
 {[
 { 
 name:"Bank API Gateway (Midtrans)", 
 icon: Landmark, 
 status: integrations?.midtrans.status ||"DISCONNECTED", 
 env: integrations?.midtrans.env,
 color: integrations?.midtrans.status ==='CONNECTED'?"bg-blue-50 text-primary":"bg-red-50 text-red-600", 
 dotColor: integrations?.midtrans.status ==='CONNECTED'?"bg-primary":"bg-red-600"
 },
 { 
 name:"WhatsApp Gateway", 
 icon: MessageSquare, 
 status: integrations?.whatsapp.status ||"DISCONNECTED", 
 color: integrations?.whatsapp.status ==='CONNECTED'?"bg-emerald-50 text-emerald-600": integrations?.whatsapp.status ==='MANUAL (WA.ME)'?"bg-blue-50 text-blue-600":"bg-red-50 text-red-600", 
 dotColor: integrations?.whatsapp.status ==='CONNECTED'?"bg-emerald-500": integrations?.whatsapp.status ==='MANUAL (WA.ME)'?"bg-blue-500":"bg-red-600"
 },
 { 
 name:"OCR Processor", 
 icon: FileScan, 
 status: integrations?.ocr.status ||"IDLE", 
 color: integrations?.ocr.status ==='CONNECTED'?"bg-emerald-50 text-emerald-600":"bg-orange-50 text-orange-600", 
 dotColor: integrations?.ocr.status ==='CONNECTED'?"bg-emerald-500":"bg-orange-500"
 },
 ].map((item) => (
 <div key={item.name} className="flex items-center justify-between p-3 bg-muted rounded-xl">
 <div className="flex items-center gap-3">
 <item.icon className="text-muted-foreground"size={18} />
 <span className="text-sm font-bold text-foreground flex items-center gap-2">
 {item.name}
 {item.env && (
 <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground tracking-wider">
 {item.env}
 </span>
 )}
 </span>
 </div>
 <button
 onClick={() => toast.info("Status ditarik otomatis dari konfigurasi server (Environment Variables).")}
 className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest cursor-pointer hover:opacity-80 transition-opacity", item.color)}
 >
 <span className={cn("w-1.5 h-1.5 rounded-full", item.dotColor, item.status ==="CONNECTED"&&"animate-pulse")}></span>
 {item.status}
 </button>
 </div>
 ))}
 </div>
 </m.div>
 )}

 {/* Section 4: User Management */}
 {activeTab ==='users'&& (
 <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-4 sm:p-8 rounded-3xl border border-border shadow-sm">
 <div className="flex items-center justify-between mb-8">
 <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
 <ShieldCheck className="text-primary"size={20} />
 Active Administrators
 </h3>
 <button
 onClick={() => setIsAddManagerOpen(true)}
 className="text-primary font-bold text-sm hover:underline"
 >
 Add New User
 </button>
 </div>
 <AnimatePresence>
 {isAddManagerOpen && (
 <m.div initial={{ height: 0, opacity: 0, marginBottom: 0 }} animate={{ height:'auto', opacity: 1, marginBottom: 32 }} exit={{ height: 0, opacity: 0, marginBottom: 0 }} className="overflow-hidden">
 <form
 onSubmit={(e) => {
 e.preventDefault();
 createAdminMutation.mutate(newAdmin);
 }}
 className="p-4 sm:p-6 space-y-4 bg-muted rounded-2xl border border-border"
 >
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
 <UsersIcon size={12} /> Full Name
 </label>
 <input
 required
 className="w-full bg-muted border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
 value={newAdmin.nama}
 onChange={(e) => setNewAdmin({ ...newAdmin, nama: e.target.value })}
 placeholder="e.g. John Doe"
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
 <Mail size={12} /> Email Address
 </label>
 <input
 required
 type="email"
 className="w-full bg-muted border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
 value={newAdmin.email}
 onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
 placeholder="john@example.com"
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
 <Lock size={12} /> Password
 </label>
 <input
 required
 type="password"
 className="w-full bg-muted border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
 value={newAdmin.password}
 onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
 placeholder="••••••••"
 />
 </div>
 <div className="space-y-4">
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
 <UsersIcon size={12} /> Nickname
 </label>
 <input
 required
 className="w-full bg-muted border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
 value={newAdmin.nickname}
 onChange={(e) => setNewAdmin({ ...newAdmin, nickname: e.target.value })}
 placeholder="e.g. John"
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
 <ImagePlus size={12} /> Profile Image
 </label>
 <div className="flex flex-col sm:flex-row gap-2">
 <input
 type="text"
 className="flex-1 bg-muted border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none font-medium text-sm"
 value={newAdmin.image}
 onChange={(e) => setNewAdmin({ ...newAdmin, image: e.target.value })}
 placeholder="Image URL"
 />
 <label className="cursor-pointer bg-muted hover:bg-muted transition-colors rounded-xl px-4 py-3 sm:py-0 flex items-center justify-center text-sm font-bold text-foreground shrink-0">
 Upload
 <input
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const file = e.target.files?.[0];
 if (file) {
 const reader = new FileReader();
 reader.onloadend = () => {
 setNewAdmin({ ...newAdmin, image: reader.result as string });
 };
 reader.readAsDataURL(file);
 }
 }}
 />
 </label>
 </div>
 </div>
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
 <BadgeCheck size={12} /> Role
 </label>
 <div className="relative">
 <select
 className="w-full bg-muted border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
 value={newAdmin.role}
 onChange={(e) => {
 const val = e.target.value;
 setNewAdmin({
 ...newAdmin,
 role: val,
 department: val ==='System Administrator'?'Operations': newAdmin.department
 });
 }}
 >
 <option value="System Administrator">System Administrator</option>
 <option value="Admin Kantor">Admin Kantor</option>
 <option value="Tim Lapangan">Tim Lapangan</option>
 </select>
 <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
 </div>
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
 <Briefcase size={12} /> Department
 </label>
 <div className="relative">
 <select
 className="w-full bg-muted border border-border rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
 value={newAdmin.department}
 onChange={(e) => setNewAdmin({ ...newAdmin, department: e.target.value })}
 >
 <option>Operations</option>
 <option>Finance</option>
 <option>Technical</option>
 </select>
 <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
 </div>
 </div>
 </div>
 <div className="flex gap-4 pt-2">
 <button
 type="button"
 onClick={() => setIsAddManagerOpen(false)}
 className="flex-1 py-4 bg-muted text-muted-foreground rounded-2xl font-black text-sm hover:bg-muted transition-all"
 >
 Cancel
 </button>
 <button
 type="submit"
 disabled={createAdminMutation.isPending}
 className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
 >
 {createAdminMutation.isPending ? <Loader2 className="animate-spin"size={18} /> :"Create User"}
 </button>
 </div>
 </form>
 </m.div>
 )}
 </AnimatePresence>
 <div className="space-y-2">
 {adminList.map((admin: any) => (
 <div key={admin.id} className="flex items-center justify-between p-4 bg-muted hover:bg-muted dark:hover:bg-muted/80 rounded-2xl transition-all group">
 <div className="flex items-center gap-4">
 <Image
 unoptimized
 width={40}
 height={40}
 alt={admin.nama}
 className="w-10 h-10 rounded-full object-cover border border-border"
 src={admin.image ||`https://ui-avatars.com/api/?name=${encodeURIComponent(admin.nama)}&background=random`}
 />
 <div>
 <div className="flex items-center gap-2">
 <p className="font-bold text-sm text-foreground">{admin.nama}</p>
 {admin.role ==='Owner'&& <BadgeCheck size={14} className="text-primary"/>}
 </div>
 <p className="text-xs text-muted-foreground">{admin.role} • {admin.department}</p>
 </div>
 </div>
 {admin.role !=='Owner'? (
 <button
 onClick={() => {
 if (confirm(`Are you sure you want to delete ${admin.nama}?`)) {
 deleteAdminMutation.mutate(admin.id);
 }
 }}
 disabled={deleteAdminMutation.isPending}
 className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 cursor-pointer transition-all disabled:opacity-50 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
 title="Delete User"
 >
 <Trash2 size={18} />
 </button>
 ) : (
 <div className="p-2 opacity-0 group-hover:opacity-50 text-muted-foreground"title="Owner cannot be deleted">
 <Lock size={18} />
 </div>
 )}
 </div>
 ))}
 </div>
 </m.div>
 )}

 {/* Actions */}
 {activeTab !=='users'&& (
 <m.div variants={itemVariants} className="flex items-center justify-end gap-4 py-8">
 {!isEditing ? (
 <button
 onClick={() => setIsEditing(true)}
 className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
 >
 Edit Configurations
 </button>
 ) : (
 <>
 <button
 onClick={handleDiscard}
 disabled={isSaving || isDiscarding}
 className="px-6 py-3 rounded-xl font-bold text-muted-foreground hover:bg-muted dark:hover:bg-muted transition-all disabled:opacity-50"
 >
 Discard Changes
 </button>
 <button
 onClick={handleSave}
 disabled={isSaving || isDiscarding}
 className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
 >
 Save Configurations
 </button>
 </>
 )}
 </m.div>
 )}

 </div>
 </div>
 </m.div>
 </>
 );
}
