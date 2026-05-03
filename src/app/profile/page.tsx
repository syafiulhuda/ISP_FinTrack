"use client";

import { useState, useEffect } from "react";
import { m, Variants, AnimatePresence } from "framer-motion";
import { Edit2, Laptop, Smartphone, Verified, ChevronRight, Info, Loader2, Camera, Lock, ArrowRight, X } from "lucide-react";
import { getAdminProfile, updateAdminProfile } from "@/actions/admin";
import { Admin } from "@/types";
import { changePasswordAction } from "@/actions/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingState } from "@/components/LoadingState";

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

export default function ProfilePage() {
  const queryClient = useQueryClient();
  
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['adminProfile'],
    queryFn: getAdminProfile
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Password Change States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '' });
  const [isPassLoading, setIsPassLoading] = useState(false);

  useEffect(() => {
    if (profileData && !editData) {
      setEditData(profileData);
    }
  }, [profileData, editData]);

  const handleEdit = () => {
    setEditData(profileData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editData) return;
    setIsSaving(true);
    try {
      await updateAdminProfile(editData);
      queryClient.invalidateQueries({ queryKey: ['adminProfile'] });
      setIsEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.new !== passData.confirm) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }
    if (passData.new.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    setIsPassLoading(true);
    try {
      const res = await changePasswordAction(passData.old, passData.new);
      if (res.success) {
        toast.success(res.message);
        setIsPasswordModalOpen(false);
        setPassData({ old: '', new: '', confirm: '' });
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("Terjadi kesalahan sistem");
    } finally {
      setIsPassLoading(false);
    }
  };

  const handleUpdateAvatar = () => {
    if (!isEditing) return;
    const newUrl = window.prompt("Enter new Image URL:", editData.image);
    if (newUrl !== null) {
      setEditData({ ...editData, image: newUrl });
    }
  };

  if (isLoading) {
    return <LoadingState message="Memuat profil admin..." />;
  }

  if (!profileData) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-4 text-slate-500">
        <Info size={40} className="text-slate-400" />
        <p className="font-bold">Admin profile not found.</p>
        <button 
          onClick={() => window.location.reload()}
          className="text-primary hover:underline font-bold text-sm"
        >
          Try Refreshing
        </button>
      </div>
    );
  }

  return (
    <m.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      {/* Profile Header */}
      <m.section variants={itemVariants} className="mb-12">
        <div className="flex flex-col md:flex-row items-end gap-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border-4 border-white dark:border-slate-950 shadow-xl relative">
              <img
                alt="Profile"
                className="w-full h-full object-cover"
                src={editData?.image || profileData?.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuAy5r20WVyuBCP6PIyl_WPdUNTOTLej17KRtvHSMhKkmw3XuvRxGquW9NQ7nL1YHK2ckLqfapVp4_3uLUkVNw5iP6LhThAAxHVLg2XMTKCoV5L9JsS-amXXtKCOWVLzMs29k1mHmq6SVCLVAQXzCifNQ93nAZ9Kla__kM7nbiY4R_vtpyT6r9en0Wa_A69W0YZxjzxE7p_x7B-sJfVfarpqrFbo2qgXbuK3unH5TREs7WhJEgFjRsvLWk-ZSbJb_MQwrA9_bw4lNaw"}
              />
              {isEditing && (
                <div 
                  onClick={handleUpdateAvatar}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Camera className="text-white" size={24} />
                </div>
              )}
            </div>
            <button 
              onClick={isEditing ? handleUpdateAvatar : handleEdit}
              className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg active:scale-90 transition-transform hover:bg-blue-600 z-10"
            >
              <Edit2 size={14} />
            </button>
          </div>
          <div className="flex-1 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 opacity-70">
              Internal Profile
            </span>
            <h2 className="text-4xl font-bold tracking-tighter text-slate-900 dark:text-slate-100 mt-1">
              {profileData.fullName}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg mt-1">
              Manage your administrative identity and security preferences.
            </p>
          </div>
        </div>
      </m.section>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Personal Information */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <m.div variants={itemVariants} className="bg-white dark:bg-slate-900/50 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Personal Information
              </h3>
              {!isEditing ? (
                <button onClick={handleEdit} className="text-primary font-bold text-sm hover:underline px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                  Update info
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleCancel} disabled={isSaving} className="text-slate-500 font-bold text-sm hover:underline px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={isSaving} className="bg-primary text-white font-bold text-sm px-4 py-1.5 rounded-lg shadow-md shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50 flex items-center gap-2">
                    {isSaving ? <span className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white"></span> : null}
                    Save
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Full Name
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.fullName} 
                    onChange={e => setEditData({...editData, fullName: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-blue-500 ring-2 ring-blue-500/20 text-slate-900 dark:text-slate-100 font-medium focus:outline-none transition-all"
                  />
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 rounded-xl text-slate-900 dark:text-slate-100 font-medium border border-transparent">
                    {profileData.fullName}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Email Address
                </label>
                {isEditing ? (
                  <input 
                    type="email" 
                    value={editData.email} 
                    onChange={e => setEditData({...editData, email: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-blue-500 ring-2 ring-blue-500/20 text-slate-900 dark:text-slate-100 font-medium focus:outline-none transition-all"
                  />
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 rounded-xl text-slate-900 dark:text-slate-100 font-medium border border-transparent">
                    {profileData.email}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Role
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.role} 
                    onChange={e => setEditData({...editData, role: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-blue-500 ring-2 ring-blue-500/20 text-slate-900 dark:text-slate-100 font-medium focus:outline-none transition-all"
                  />
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 rounded-xl text-slate-900 dark:text-slate-100 font-medium border border-transparent">
                    {profileData.role}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                  Department
                </label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editData.department} 
                    onChange={e => setEditData({...editData, department: e.target.value})}
                    className="w-full bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-blue-500 ring-2 ring-blue-500/20 text-slate-900 dark:text-slate-100 font-medium focus:outline-none transition-all"
                  />
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 rounded-xl text-slate-900 dark:text-slate-100 font-medium border border-transparent">
                    {profileData.department}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-10 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border-l-4 border-primary">
              <div className="flex gap-4">
                <Info className="text-primary shrink-0" size={24} />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Administrator Privileges
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Your account has global read/write access to all ISP Nodes and Financial Ledgers. 
                    Changes to these details require secondary authorization.
                  </p>
                </div>
              </div>
            </div>
          </m.div>

          {/* Session Management */}
          <m.div variants={itemVariants} className="bg-white dark:bg-slate-900/50 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
              Session Management
            </h3>
            <p className="text-sm text-slate-500 mb-8">
              Review and manage your active sessions across different devices and browsers.
            </p>
            <div className="space-y-4">
              {/* Session Item 1 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full text-primary shadow-sm shrink-0">
                    <Laptop size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      MacBook Pro 16" • Chrome
                    </p>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-0.5">
                      San Francisco, CA • Current Session
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-black rounded-full uppercase tracking-widest self-start sm:self-auto">
                  Active Now
                </span>
              </div>
              {/* Session Item 2 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-700 rounded-full text-slate-400 shadow-sm shrink-0">
                    <Smartphone size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      iPhone 15 Pro • App
                    </p>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider mt-0.5">
                      San Francisco, CA • 2 hours ago
                    </p>
                  </div>
                </div>
                <button onClick={() => toast.info("Fitur ini segera hadir 🚀")} className="text-orange-600 dark:text-orange-500 text-xs font-bold hover:underline self-start sm:self-auto">
                  Revoke
                </button>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button onClick={() => toast.info("Fitur ini segera hadir 🚀")} className="text-orange-600 dark:text-orange-500 text-sm font-bold px-4 py-2 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-xl transition-all">
                Logout from all other devices
              </button>
            </div>
          </m.div>
        </div>

        {/* Column 3: Account Security */}
        <div className="space-y-6">
          <m.div variants={itemVariants} className="bg-white dark:bg-slate-900/50 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-8">
              Account Security
            </h3>
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Last changed: 3mo ago
                  </span>
                </div>
                <button 
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full py-3 px-5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-900 dark:text-slate-100 text-sm font-bold rounded-2xl flex items-center justify-between group/btn"
                >
                  Change Password
                  <ChevronRight size={18} className="text-slate-400 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="text-sm font-bold block text-slate-700 dark:text-slate-300">
                      Two-Factor Auth
                    </label>
                    <p className="text-xs text-slate-500 mt-1">Recommended for admins</p>
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-black rounded-full uppercase tracking-tighter">
                    Enabled
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                  <Verified className="text-primary shrink-0" size={20} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate">
                      Authenticator App
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">Google Authenticator active</p>
                  </div>
                  <button onClick={() => toast.info("Fitur ini segera hadir 🚀")} className="text-primary text-[10px] font-bold uppercase tracking-widest hover:underline shrink-0">
                    Manage
                  </button>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <label className="text-sm font-bold block mb-4 text-slate-700 dark:text-slate-300">
                  Security Logs
                </label>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                        Successful login
                      </p>
                      <p className="text-[10px] text-slate-500">Today, 09:12 AM</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
                        Password change request
                      </p>
                      <p className="text-[10px] text-slate-500">Oct 12, 2023</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => toast.info("Fitur ini segera hadir 🚀")} className="mt-6 w-full text-center text-[11px] font-bold text-primary uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-900/20 py-3 rounded-xl transition-all">
                  View Full History
                </button>
              </div>
            </div>
          </m.div>

          {/* Danger Zone */}
          <m.div variants={itemVariants} className="bg-white dark:bg-slate-900/50 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600" />
            <h3 className="text-xl font-bold tracking-tight text-red-600 dark:text-red-500 mb-4">
              Danger Zone
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Actions here are permanent. Please proceed with caution if you are attempting to deactivate this administrator account.
            </p>
            <button onClick={() => toast.info("Fitur ini segera hadir 🚀")} className="w-full py-3 border-2 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500 text-sm font-bold rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-95">
              Deactivate Account
            </button>
          </m.div>
        </div>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {isPasswordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24 md:pl-64">
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPasswordModalOpen(false)}
              className="absolute inset-0 bg-transparent"
            />
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Lock size={24} />
                  </div>
                  <button 
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Update Security</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">Ensure your account remains secure with a strong password.</p>

                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Current Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                      <input 
                        type="password" required
                        value={passData.old}
                        onChange={e => setPassData({...passData, old: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl py-3.5 pl-12 pr-4 outline-none transition-all font-medium text-slate-900 dark:text-white"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">New Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                      <input 
                        type="password" required
                        value={passData.new}
                        onChange={e => setPassData({...passData, new: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl py-3.5 pl-12 pr-4 outline-none transition-all font-medium text-slate-900 dark:text-white"
                        placeholder="Min. 6 characters"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Confirm New Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
                      <input 
                        type="password" required
                        value={passData.confirm}
                        onChange={e => setPassData({...passData, confirm: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-primary/20 rounded-2xl py-3.5 pl-12 pr-4 outline-none transition-all font-medium text-slate-900 dark:text-white"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isPassLoading}
                    className="w-full bg-primary text-white rounded-2xl py-4 font-black shadow-xl shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
                  >
                    {isPassLoading ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </m.div>
  );
}
