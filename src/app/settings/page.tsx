"use client";

import { useState, useEffect, useRef } from "react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { useSettings } from "@/components/providers/SettingsProvider";
import { 
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
  });

  const colorPickerRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setFormData({
      appName: settings.appName,
      appSubtitle: settings.appSubtitle,
      accentColor: settings.accentColor,
      appLogo: settings.appLogo,
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4"
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
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 text-primary font-bold shadow-sm transition-all border border-slate-200 dark:border-slate-700">
            <SlidersHorizontal size={18} />
            General
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all text-slate-500 font-medium">
            <Palette size={18} />
            Branding
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all text-slate-500 font-medium">
            <Puzzle size={18} />
            Integrations
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all text-slate-500 font-medium">
            <Users size={18} />
            User Management
          </button>
        </motion.nav>

        {/* Right Content */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* Section 1: General Info */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group shadow-sm">
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
                <select className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-100 font-medium appearance-none">
                  <option>UTC -05:00 Eastern Time</option>
                  <option>UTC +00:00 Greenwich Mean Time</option>
                  <option>UTC +08:00 Singapore Time</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  System Language
                </label>
                <select className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-primary/20 text-slate-900 dark:text-slate-100 font-medium appearance-none">
                  <option>English (Universal)</option>
                  <option>Spanish (ES)</option>
                  <option>French (FR)</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Section 2: Branding (Bento Style) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
                    <button 
                      onClick={() => setFormData({ ...formData, accentColor: 'blue' })}
                      className={`w-8 h-8 rounded-full bg-blue-600 transition-all ${formData.accentColor === 'blue' ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 ring-blue-600 opacity-100' : 'opacity-60 hover:opacity-100'}`}
                    ></button>
                    <button 
                      onClick={() => setFormData({ ...formData, accentColor: 'indigo' })}
                      className={`w-8 h-8 rounded-full bg-indigo-600 transition-all ${formData.accentColor === 'indigo' ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 ring-indigo-600 opacity-100' : 'opacity-60 hover:opacity-100'}`}
                    ></button>
                    <button 
                      onClick={() => setFormData({ ...formData, accentColor: 'emerald' })}
                      className={`w-8 h-8 rounded-full bg-emerald-600 transition-all ${formData.accentColor === 'emerald' ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 ring-emerald-600 opacity-100' : 'opacity-60 hover:opacity-100'}`}
                    ></button>
                    <button 
                      onClick={() => setFormData({ ...formData, accentColor: 'amber' })}
                      className={`w-8 h-8 rounded-full bg-amber-600 transition-all ${formData.accentColor === 'amber' ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 ring-amber-600 opacity-100' : 'opacity-60 hover:opacity-100'}`}
                    ></button>
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

            {/* Section 3: Integrations (Status Checklist) */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 border-l-4 border-l-primary shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Puzzle className="text-primary" size={20} />
                Core Service Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Landmark className="text-slate-400" size={18} />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Bank API Gateway</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-primary text-[10px] font-black tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    CONNECTED
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="text-slate-400" size={18} />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">WhatsApp Gateway</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 text-[10px] font-black tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                    DISCONNECTED
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileScan className="text-slate-400" size={18} />
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">OCR Processor</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 text-[10px] font-black tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    IDLE
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Section 4: User Management */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900/50 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <ShieldCheck className="text-primary" size={20} />
                Active Administrators
              </h3>
              <button className="text-primary font-bold text-sm hover:underline">Add New Manager</button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-2xl transition-all group">
                <div className="flex items-center gap-4">
                  <img 
                    alt="Admin Profile" 
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCA5haV6tNaCkQuE5uWxaBqfA_BrmG9oAIi1Iz8dl2bpVIi70VO4F7pZc6cXpfhQ_ZRn8YFeJJiiNPw-6X6G7ZEVN3r_P6x1G-rhuQquiuT8Ad0j_GdqGY6Yw7-Q7GINHeeJwuS18ayXURA8U0tmaraxlqtzialMiJKGgfcyTkvvTliv8M7sf0jvYEqLAQKMKG8uM_u-mUf5IHgURO7GRPYCajFeqP9VQbdD6-bv2a8MNcfRHEIQAw6bN8ODyxT61Tl0ukeVvlvrMo"
                  />
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Adrian Sterling</p>
                    <p className="text-xs text-slate-500">Owner • Last active 2m ago</p>
                  </div>
                </div>
                <MoreVertical className="text-slate-400 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity" size={18} />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-2xl transition-all group">
                <div className="flex items-center gap-4">
                  <img 
                    alt="Admin Profile" 
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4lG48mutyjq7_x5Nv3FgbB-fwSfQrB5_PcvCmtdp_XlN-fp23w5NxRkeZcIjfN2RcIq_eLrWaHPr7RzlE5kYQ2HyXzKhnngmzUQcKE0mjv-1wWdYRkPRr2t7J_E3zFmL13v0C9uqmO6ldoBIzobTIlvrr3dkbKROZ7A2M4BGD1BACiJ1QR5j8-wFMVtGUP662X_--KLlfF3XWfFHDeV5HpCJeeT3z0S_-iw_EcGN8SEnh1ZXQISJM3ORD0O_Jv5SVJeJkHYNONgc"
                  />
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100">Lydia Vance</p>
                    <p className="text-xs text-slate-500">Billing Manager • Last active 4h ago</p>
                  </div>
                </div>
                <MoreVertical className="text-slate-400 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity" size={18} />
              </div>
            </div>
          </motion.div>

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
