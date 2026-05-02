"use client";

import { useState, useEffect, useRef } from "react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { useSettings } from "@/components/providers/SettingsProvider";
import { 
  Settings,
  X,
  Mail,
  Lock,
  BadgeCheck,
  SlidersHorizontal, 
  Palette, 
  Puzzle, 
  Users, 
  Info, 
  ImagePlus, 
  Pipette, 
  Landmark, 
  MessageSquare, 
  FileScan, 
  ShieldCheck, 
  MoreVertical,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminList, createAdmin } from "@/actions/db";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const [formData, setFormData] = useState({
    appName: settings.appName,
    appSubtitle: settings.appSubtitle,
    accentColor: settings.accentColor,
    appLogo: settings.appLogo,
    timezone: settings.timezone || 'UTC +08:00 Singapore Time',
    language: settings.language || 'English (Universal)',
  });

  const colorPickerRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'integrations' | 'users'>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isAddManagerOpen, setIsAddManagerOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ nama: '', email: '', role: 'Manager', department: 'Operations', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256&h=256' });

  const { data: adminList = [] } = useQuery({
    queryKey: ['adminList'],
    queryFn: getAdminList
  });

  const createAdminMutation = useMutation({
    mutationFn: createAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminList'] });
      setIsAddManagerOpen(false);
      setNewAdmin({ nama: '', email: '', role: 'Manager', department: 'Operations', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256&h=256' });
    }
  });

  useEffect(() => {
    setFormData({
      appName: settings.appName,
      appSubtitle: settings.appSubtitle,
      accentColor: settings.accentColor,
      appLogo: settings.appLogo,
      timezone: settings.timezone || 'UTC +08:00 Singapore Time',
      language: settings.language || 'English (Universal)',
    });
  }, [settings]);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      updateSettings(formData);
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }, 1200);
  };

  const handleDiscard = () => {
    setIsDiscarding(true);
    setTimeout(() => {
      setFormData({
        appName: settings.appName,
        appSubtitle: settings.appSubtitle,
        accentColor: settings.accentColor,
        appLogo: settings.appLogo,
        timezone: settings.timezone || 'UTC +08:00 Singapore Time',
        language: settings.language || 'English (Universal)',
      });
      setIsDiscarding(false);
    }, 800);
  };

  const handleUpdateLogo = () => {
    const url = window.prompt("Enter Corporate Logo URL:", formData.appLogo);
    if (url !== null) {
      setFormData({ ...formData, appLogo: url });
    }
  };

  return (
    <>
      <AnimatePresence>
        {(isSaving || isDiscarding || showSuccess) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center max-w-sm w-full mx-4 pointer-events-auto"
            >
              {showSuccess ? (
                <>
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 rounded-full flex items-center justify-center mb-4"
                  >
                    <CheckCircle2 size={32} />
                  </motion.div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Success!</h3>
                  <p className="text-sm text-slate-500 text-center font-medium">Your configurations have been successfully updated.</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 rounded-full flex items-center justify-center mb-4 relative">
                    <Loader2 size={32} className="animate-spin relative z-10" />
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping"></div>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {isSaving ? "Saving Settings..." : "Discarding Changes..."}
                  </h3>
                  <p className="text-sm text-slate-500 text-center font-medium">
                    Please wait while we process your request.
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddManagerOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddManagerOpen(false)}
              className="absolute inset-0"
            />
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">Add New Manager</h3>
                <button onClick={() => setIsAddManagerOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
                  <X size={20} />
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  createAdminMutation.mutate(newAdmin);
                }}
                className="p-8 space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Users size={12} /> Full Name
                  </label>
                  <input 
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    value={newAdmin.nama}
                    onChange={(e) => setNewAdmin({ ...newAdmin, nama: e.target.value })}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <Mail size={12} /> Email Address
                  </label>
                  <input 
                    required
                    type="email"
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Role</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                      value={newAdmin.role}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewAdmin({ 
                          ...newAdmin, 
                          role: val,
                          department: val === 'Owner' ? 'Owner' : newAdmin.department
                        });
                      }}
                    >
                      <option>Manager</option>
                      <option>Owner</option>
                      <option>Admin</option>
                      <option>Support</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Department</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                      value={newAdmin.department}
                      onChange={(e) => setNewAdmin({ ...newAdmin, department: e.target.value })}
                    >
                      <option>Operations</option>
                      <option>Finance</option>
                      <option>Technical</option>
                      {newAdmin.role === 'Owner' && <option>Owner</option>}
                    </select>
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={createAdminMutation.isPending}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  {createAdminMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : "Create Manager"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      <motion.div variants={itemVariants} className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Settings
        </h2>
        <p className="text-slate-500 mt-1 font-medium">Configure your ISP management environment</p>
      </motion.div>

      {/* Bento Grid Settings Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Nav: Category Selection */}
        <motion.nav variants={itemVariants} className="lg:col-span-3 flex flex-col gap-2 p-1 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => setActiveTab('general')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold",
              activeTab === 'general' 
                ? "bg-white dark:bg-slate-800 text-primary shadow-sm border border-slate-200 dark:border-slate-700" 
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            )}
          >
            <SlidersHorizontal size={18} />
            General
          </button>
          <button 
            onClick={() => setActiveTab('branding')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold",
              activeTab === 'branding' 
                ? "bg-white dark:bg-slate-800 text-primary shadow-sm border border-slate-200 dark:border-slate-700" 
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            )}
          >
            <Palette size={18} />
            Branding
          </button>
          <button 
            onClick={() => setActiveTab('integrations')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold",
              activeTab === 'integrations' 
                ? "bg-white dark:bg-slate-800 text-primary shadow-sm border border-slate-200 dark:border-slate-700" 
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            )}
          >
            <Puzzle size={18} />
            Integrations
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold",
              activeTab === 'users' 
                ? "bg-white dark:bg-slate-800 text-primary shadow-sm border border-slate-200 dark:border-slate-700" 
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
            )}
          >
            <Users size={18} />
            User Management
          </button>
        </motion.nav>

        {/* Right Content */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Section 1: General Info */}
          {activeTab === 'general' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Info className="text-primary" size={20} />
                Application Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    App Name
                  </label>
                  <input 
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-slate-900 dark:text-slate-100 font-medium transition-all" 
                    type="text" 
                    value={formData.appName}
                    onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    App Subtitle
                  </label>
                  <input 
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-slate-900 dark:text-slate-100 font-medium transition-all" 
                    type="text" 
                    value={formData.appSubtitle}
                    onChange={(e) => setFormData({ ...formData, appSubtitle: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Default Timezone
                  </label>
                  <select 
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-100 font-medium appearance-none outline-none"
                  >
                    <option>UTC -05:00 Eastern Time</option>
                    <option>UTC +00:00 Greenwich Mean Time</option>
                    <option>UTC +08:00 Singapore Time</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    System Language
                  </label>
                  <select 
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-100 font-medium appearance-none outline-none"
                  >
                    <option>English (Universal)</option>
                    <option>Spanish (ES)</option>
                    <option>French (FR)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Section 2: Branding */}
          {activeTab === 'branding' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Palette className="text-primary" size={20} />
                Visual Identity
              </h3>
              <div className="space-y-6">
                <div className="flex items-center gap-6">
                  <div 
                    onClick={handleUpdateLogo}
                    className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center relative group overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-primary transition-colors cursor-pointer"
                  >
                    {formData.appLogo ? (
                      <img src={formData.appLogo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImagePlus className="text-slate-400 group-hover:hidden" size={24} />
                    )}
                    <span className="text-[10px] absolute bottom-2 hidden group-hover:block font-bold text-primary bg-white/80 dark:bg-slate-900/80 px-2 py-0.5 rounded-full shadow-sm">CHANGE</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Corporate Logo</p>
                    <p className="text-xs text-slate-500 mt-1">Recommended: SVG or PNG (256x256)</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Accent Color</p>
                  <div className="flex gap-3">
                    {['blue', 'indigo', 'emerald', 'amber'].map((color) => (
                      <button 
                        key={color}
                        onClick={() => setFormData({ ...formData, accentColor: color })}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all",
                          color === 'blue' && "bg-blue-600",
                          color === 'indigo' && "bg-indigo-600",
                          color === 'emerald' && "bg-emerald-600",
                          color === 'amber' && "bg-amber-600",
                          formData.accentColor === color ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 opacity-100' : 'opacity-60 hover:opacity-100'
                        )}
                      />
                    ))}
                    <div 
                      onClick={() => colorPickerRef.current?.click()}
                      className={`w-8 h-8 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-500 relative ${formData.accentColor.startsWith('#') ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 opacity-100' : 'opacity-60'}`}
                      style={formData.accentColor.startsWith('#') ? { backgroundColor: formData.accentColor, color: 'white', borderColor: 'transparent' } : {}}
                    >
                      <Pipette size={14} className="relative z-10" />
                      <input 
                        ref={colorPickerRef}
                        type="color" 
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        value={formData.accentColor.startsWith('#') ? formData.accentColor : '#004ac6'}
                        onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Section 3: Integrations */}
          {activeTab === 'integrations' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-primary shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Puzzle className="text-primary" size={20} />
                Core Service Status
              </h3>
              <div className="space-y-4">
                {[
                  { name: "Bank API Gateway", icon: Landmark, status: "CONNECTED", color: "bg-blue-50 text-primary", dotColor: "bg-primary" },
                  { name: "WhatsApp Gateway", icon: MessageSquare, status: "DISCONNECTED", color: "bg-red-50 text-red-600", dotColor: "bg-red-600" },
                  { name: "OCR Processor", icon: FileScan, status: "IDLE", color: "bg-orange-50 text-orange-600", dotColor: "bg-orange-500" },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <item.icon className="text-slate-400" size={18} />
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{item.name}</span>
                    </div>
                    <button
                      onClick={() => toast.info("Fitur ini segera hadir 🚀")}
                      className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest cursor-pointer hover:opacity-80 transition-opacity", item.color)}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", item.dotColor, item.status === "CONNECTED" && "animate-pulse")}></span>
                      {item.status}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Section 4: User Management */}
          {activeTab === 'users' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <ShieldCheck className="text-primary" size={20} />
                  Active Administrators
                </h3>
                <button 
                  onClick={() => setIsAddManagerOpen(true)}
                  className="text-primary font-bold text-sm hover:underline"
                >
                  Add New Manager
                </button>
              </div>
              <div className="space-y-2">
                {adminList.map((admin: any) => (
                  <div key={admin.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-2xl transition-all group">
                    <div className="flex items-center gap-4">
                      <img 
                        alt={admin.nama} 
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
                        src={admin.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(admin.nama)}&background=random`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{admin.nama}</p>
                          {admin.role === 'Owner' && <BadgeCheck size={14} className="text-primary" />}
                        </div>
                        <p className="text-xs text-slate-500">{admin.role} • {admin.department}</p>
                      </div>
                    </div>
                    <MoreVertical 
                      onClick={() => toast.info("Fitur ini segera hadir 🚀")}
                      className="text-slate-400 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity" size={18} 
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div variants={itemVariants} className="flex items-center justify-end gap-4 py-8">
            <button 
              onClick={handleDiscard}
              disabled={isSaving || isDiscarding}
              className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              Discard Changes
            </button>
            <button 
              onClick={handleSave} 
              disabled={isSaving || isDiscarding}
              className="px-8 py-3 rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              Save Configurations
            </button>
          </motion.div>

        </div>
      </div>
    </motion.div>
    </>
  );
}
