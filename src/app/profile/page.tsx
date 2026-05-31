"use client";

import { useState, useEffect } from"react";
import Image from"next/image";
import { m, Variants, AnimatePresence } from"framer-motion";
import { Edit2, Laptop, Smartphone, Verified, ChevronRight, Info, Loader2, Camera, Lock, ArrowRight, X, AlertTriangle, ShieldAlert, Copy } from"lucide-react";
import { getAdminProfile, updateAdminProfile } from"@/actions/admin";
import { Admin } from"@/types";
import { changePasswordAction } from"@/actions/auth";
import { getActiveSessions, revokeSession, revokeOtherSessions, generateTwoFactorSecret, verifyAndEnableTwoFactor, disableTwoFactor, checkTwoFactorStatus, getSecurityLogs, deactivateAccount } from"@/actions/profile";
import { useQuery, useQueryClient } from"@tanstack/react-query";
import { toast } from"sonner";
import { LoadingState } from"@/components/LoadingState";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

const getTimeAgo = (dateString: string | null | undefined) => {
 if (!dateString) return"Never";
 const date = new Date(dateString);
 const now = new Date();
 const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
 
 if (diffInSeconds < 60) return"Just now";
 const diffInMinutes = Math.floor(diffInSeconds / 60);
 if (diffInMinutes < 60) return`${diffInMinutes}m ago`;
 const diffInHours = Math.floor(diffInMinutes / 60);
 if (diffInHours < 24) return`${diffInHours}h ago`;
 const diffInDays = Math.floor(diffInHours / 24);
 if (diffInDays < 30) return`${diffInDays}d ago`;
 const diffInMonths = Math.floor(diffInDays / 30);
 if (diffInMonths < 12) return`${diffInMonths}mo ago`;
 const diffInYears = Math.floor(diffInDays / 365);
 return`${diffInYears}y ago`;
};

export default function ProfilePage() {
 const queryClient = useQueryClient();
 
 const { data: profileData, isLoading: isProfileLoading } = useQuery({
 queryKey: ['adminProfile'],
 queryFn: getAdminProfile
 });

 const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
 queryKey: ['adminSessions'],
 queryFn: getActiveSessions
 });

 const { data: securityLogs = [], isLoading: isLogsLoading } = useQuery({
 queryKey: ['adminSecurityLogs'],
 queryFn: getSecurityLogs
 });

 const { data: twoFactorStatus = { enabled: false } } = useQuery({
 queryKey: ['adminTwoFactorStatus'],
 queryFn: checkTwoFactorStatus
 });
 
 const isVisitor = profileData?.email === 'visitor@gmail.com';
 const [isEditing, setIsEditing] = useState(false);
 const [editData, setEditData] = useState<Admin | null>(null);
 const [isSaving, setIsSaving] = useState(false);
 
 // Password Change States
 const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
 const [passData, setPassData] = useState({ old:'', new:'', confirm:''});
 const [isPassLoading, setIsPassLoading] = useState(false);

 // Avatar Modal States
 const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
 const [avatarInputUrl, setAvatarInputUrl] = useState('');

 // 2FA Modal States
 const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
 const [qrCodeUrl, setQrCodeUrl] = useState('');
 const [twoFactorSecret, setTwoFactorSecret] = useState('');
 const [otpToken, setOtpToken] = useState('');
 const [is2FALoading, setIs2FALoading] = useState(false);
 const [disable2FAPassword, setDisable2FAPassword] = useState('');

 // Danger Zone Modal States
 const [showManualKey, setShowManualKey] = useState(false);
 const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
 const [isDeactivating, setIsDeactivating] = useState(false);

 // Pagination State
 const [securityLogsPage, setSecurityLogsPage] = useState(1);
 const logsPerPage = 5;

 useEffect(() => {
 if (profileData && !editData) {
 setEditData(profileData as unknown as Admin);
 }
 }, [profileData, editData]);

 const handleEdit = () => {
 setEditData((profileData as unknown as Admin) || null);
 setIsEditing(true);
 };

 const handleCancel = () => {
 setIsEditing(false);
 };

 const handleSave = async () => {
 if (!editData) return;
 setIsSaving(true);
 try {
 await updateAdminProfile({
 fullName: editData.fullName || editData.nama ||"",
 email: editData.email,
 role: editData.role,
 department: editData.department,
 image: editData.image
 });
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

 setIsPassLoading(true);
 try {
 const res = await changePasswordAction(passData.old, passData.new);
 if (res.success) {
 toast.success(res.message);
 setIsPasswordModalOpen(false);
 setPassData({ old:'', new:'', confirm:''});
 queryClient.invalidateQueries({ queryKey: ['adminProfile'] });
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
 setAvatarInputUrl(editData?.image || profileData?.image ||'');
 setIsAvatarModalOpen(true);
 };

 const handleSaveAvatar = (e: React.FormEvent) => {
 e.preventDefault();
 if (editData) setEditData({ ...editData, image: avatarInputUrl });
 setIsAvatarModalOpen(false);
 };

 // Profile Features Handlers
 const handleRevokeSession = async (id: string) => {
 if (!confirm('Are you sure you want to revoke this session?')) return;
 try {
 await revokeSession(id);
 queryClient.invalidateQueries({ queryKey: ['adminSessions'] });
 toast.success('Session revoked successfully');
 } catch (error) {
 toast.error('Failed to revoke session');
 }
 };

 const handleRevokeOtherSessions = async () => {
 if (!confirm('Are you sure you want to logout from all other devices?')) return;
 try {
 // Find current session ID conceptually (the active token is handled backend)
 const currentToken =""; // backend action uses current token from cookie
 await revokeOtherSessions(currentToken);
 queryClient.invalidateQueries({ queryKey: ['adminSessions'] });
 toast.success('Logged out from other devices');
 } catch (error) {
 toast.error('Failed to revoke other sessions');
 }
 };

 const handleManage2FA = async () => {
 if (is2FAModalOpen) {
 setIs2FAModalOpen(false);
 return;
 }
 if (twoFactorStatus.enabled) {
 setIs2FAModalOpen(true);
 } else {
 try {
 setIs2FALoading(true);
 const { qrCode, secret } = await generateTwoFactorSecret();
 setQrCodeUrl(qrCode);
 setTwoFactorSecret(secret);
 setIs2FAModalOpen(true);
 } catch (error) {
 toast.error('Failed to generate 2FA secret');
 } finally {
 setIs2FALoading(false);
 }
 }
 };

 const handleVerify2FA = async (e: React.FormEvent) => {
 e.preventDefault();
 setIs2FALoading(true);
 try {
 const formData = new FormData();
 formData.append('token', otpToken);
 formData.append('secret', twoFactorSecret);
 
 const res = await verifyAndEnableTwoFactor(formData);
 if (res.success) {
 toast.success('2FA Enabled Successfully');
 queryClient.invalidateQueries({ queryKey: ['adminTwoFactorStatus'] });
 queryClient.invalidateQueries({ queryKey: ['adminSecurityLogs'] });
 setIs2FAModalOpen(false);
 setOtpToken('');
 } else {
 toast.error(res.error ||'Invalid Verification Code');
 }
 } catch (error) {
 toast.error('Failed to verify 2FA');
 } finally {
 setIs2FALoading(false);
 }
 };

 const handleDisable2FA = async (e: React.FormEvent) => {
 e.preventDefault();
 setIs2FALoading(true);
 try {
 const formData = new FormData();
 formData.append('password', disable2FAPassword);
 
 const res = await disableTwoFactor(formData);
 if (res.success) {
 toast.success('2FA Disabled Successfully');
 queryClient.invalidateQueries({ queryKey: ['adminTwoFactorStatus'] });
 queryClient.invalidateQueries({ queryKey: ['adminSecurityLogs'] });
 setIs2FAModalOpen(false);
 setDisable2FAPassword('');
 } else {
 toast.error(res.error ||'Failed to disable 2FA');
 }
 } catch (error) {
 toast.error('Failed to disable 2FA');
 } finally {
 setIs2FALoading(false);
 }
 };

 const handleDeactivateAccount = async () => {
 setIsDeactivating(true);
 try {
 const res = await deactivateAccount();
 if (res.success) {
 toast.success('Account deactivated. Redirecting...');
 setTimeout(() => window.location.href ='/login', 2000);
 }
 } catch (error: any) {
 toast.error(error.message ||'Failed to deactivate account');
 setIsDeactivating(false);
 setIsDeactivateModalOpen(false);
 }
 };

 if (isProfileLoading || isSessionsLoading || isLogsLoading) {
 return (
 <div className="space-y-8 pb-10 animate-pulse">
 {/* Profile Header Skeleton */}
 <section className="mb-12">
 <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
 <div className="w-32 h-32 rounded-full bg-muted border-4 border-white dark:border-slate-950 shadow-xl"></div>
 <div className="flex-1 pb-2 w-full flex flex-col items-center md:items-start gap-2">
 <div className="w-24 h-3 bg-muted rounded-full mt-2"></div>
 <div className="w-48 h-8 bg-muted rounded-full"></div>
 <div className="w-72 h-4 bg-muted rounded-full mt-2"></div>
 </div>
 </div>
 </section>
 
 {/* Layout Skeleton */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-6">
 <div className="bg-card rounded-3xl p-6 md:p-8 shadow-xl border border-border">
 <div className="w-40 h-6 bg-muted rounded-full mb-8"></div>
 <div className="space-y-6">
 {[1, 2, 3].map(i => (
 <div key={i} className="space-y-2">
 <div className="w-20 h-3 bg-muted rounded-full"></div>
 <div className="w-full h-12 bg-muted rounded-xl"></div>
 </div>
 ))}
 </div>
 </div>
 </div>
 <div className="space-y-6">
 <div className="bg-card rounded-3xl p-6 md:p-8 shadow-xl border border-border">
 <div className="w-32 h-6 bg-muted rounded-full mb-6"></div>
 <div className="w-full h-24 bg-muted rounded-2xl mb-4"></div>
 <div className="w-full h-12 bg-muted rounded-xl"></div>
 </div>
 <div className="bg-card rounded-3xl p-6 md:p-8 shadow-xl border border-border">
 <div className="w-32 h-6 bg-muted rounded-full mb-6"></div>
 <div className="w-full h-20 bg-muted rounded-2xl mb-4"></div>
 </div>
 </div>
 </div>
 </div>
 );
 }

 if (!profileData) {
 return (
 <div className="h-[70vh] flex flex-col items-center justify-center gap-4 text-muted-foreground">
 <Info size={40} className="text-muted-foreground"/>
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
 <AnimatePresence>
 {isAvatarModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/50 backdrop-blur-sm">
 <m.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="bg-card rounded-3xl p-6 shadow-xl max-w-md w-full border border-border"
 >
 <div className="flex justify-between items-center mb-4">
 <h3 className="text-xl font-bold text-foreground">Update Avatar URL</h3>
 <button 
 onClick={() => setIsAvatarModalOpen(false)}
 className="p-2 hover:bg-muted dark:hover:bg-muted rounded-full transition-colors"
 >
 <X size={18} className="text-muted-foreground"/>
 </button>
 </div>
 <form onSubmit={handleSaveAvatar} className="space-y-4">
 <div className="space-y-1.5">
 <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
 Image URL
 </label>
 <input 
 type="url"required
 value={avatarInputUrl}
 onChange={(e) => setAvatarInputUrl(e.target.value)}
 className="w-full bg-muted border border-transparent focus:border-primary/20 rounded-xl py-2.5 px-4 outline-none transition-all font-medium text-sm text-foreground"
 />
 </div>
 <button 
 type="submit"
 className="w-full bg-primary text-white rounded-xl py-3 font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-all text-sm"
 >
 Save Avatar
 </button>
 </form>
 </m.div>
 </div>
 )}
 </AnimatePresence>



 <AnimatePresence>
 {isDeactivateModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-card/50 backdrop-blur-sm">
 <m.div
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="bg-card rounded-3xl p-8 shadow-xl max-w-md w-full border-2 border-red-500/20"
 >
 <div className="flex flex-col items-center text-center">
 <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
 <ShieldAlert size={32} />
 </div>
 <h3 className="text-2xl font-bold text-foreground mb-2">Deactivate Account</h3>
 <p className="text-sm text-muted-foreground mb-6">
 This action will immediately revoke your access and all active sessions. 
 You will not be able to log in again until another administrator reactivates your account.
 </p>
 <div className="w-full flex gap-3">
 <button 
 onClick={() => setIsDeactivateModalOpen(false)}
 className="flex-1 py-3 bg-muted text-foreground font-bold rounded-xl hover:bg-muted transition-colors"
 >
 Cancel
 </button>
 <button 
 onClick={handleDeactivateAccount}
 disabled={isDeactivating}
 className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
 >
 {isDeactivating && <Loader2 className="animate-spin"size={16} />}
 Deactivate Now
 </button>
 </div>
 </div>
 </m.div>
 </div>
 )}
 </AnimatePresence>

 {/* Profile Header */}
 <m.section variants={itemVariants} className="mb-12">
 <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
 <div className="relative group">
 <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-4 border-white dark:border-slate-950 shadow-xl relative">
 <Image
 unoptimized
 priority
 width={128}
 height={128}
 alt="Profile"
 className="w-full h-full object-cover"
 src={editData?.image || profileData?.image ||"https://ui-avatars.com/api/?name=New+Admin&background=random&size=256"}
 />
 {isEditing && (
 <div 
 onClick={handleUpdateAvatar}
 className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
 >
 <Camera className="text-white"size={24} />
 </div>
 )}
 </div>
 <button 
 onClick={isEditing ? handleUpdateAvatar : handleEdit}
 className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg active:scale-90 transition-transform hover:bg-blue-600 z-10"
 aria-label="Edit Profile"
 >
 <Edit2 size={14} />
 </button>
 </div>
 <div className="flex-1 pb-2">
 <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground opacity-70">
 Internal Profile
 </span>
 <h2 className="text-4xl font-bold tracking-tighter text-foreground mt-1">
 {profileData.fullName}
 </h2>
 <p className="text-muted-foreground text-lg mt-1">
 Manage your administrative identity and security preferences.
 </p>
 </div>
 </div>
 </m.section>

 {/* Bento Grid Layout */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {/* Left Column: Personal Info & Sessions */}
 <div className="md:col-span-1 lg:col-span-2 flex flex-col gap-6 h-full">
 {/* Personal Information */}
 <m.div variants={itemVariants} className="bg-card rounded-3xl p-8 shadow-sm border border-border">
 <div className="flex items-start sm:items-center justify-between gap-4 mb-8">
 <h3 className="text-xl font-bold tracking-tight text-foreground">
 Personal Information
 </h3>
 {!isEditing ? (
 <button onClick={handleEdit} disabled={isVisitor} className={cn("text-primary font-bold text-sm whitespace-nowrap px-3 py-1.5 rounded-lg transition-colors",
 isVisitor ? "opacity-50 cursor-not-allowed" : "hover:underline hover:bg-blue-50 dark:hover:bg-blue-900/20"
 )}>
 Update info
 </button>
 ) : (
 <div className="flex gap-2">
 <button onClick={handleCancel} disabled={isSaving} className="text-muted-foreground font-bold text-sm hover:underline px-3 py-1.5 rounded-lg hover:bg-muted dark:hover:bg-muted transition-colors disabled:opacity-50">
 Cancel
 </button>
 <button onClick={handleSave} disabled={isSaving} className="bg-primary text-white font-bold text-sm px-4 py-1.5 rounded-lg shadow-md shadow-primary/20 hover:shadow-primary/40 transition-all disabled:opacity-50 flex items-center gap-2">
 {isSaving ? <span className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white"></span> : null}
 Save
 </button>
 </div>
 )}
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
 <div className="space-y-1.5">
 <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
 Full Name
 </label>
 {isEditing ? (
 <input 
 type="text"
 value={editData?.fullName ||""} 
 onChange={e => setEditData(prev => prev ? {...prev, fullName: e.target.value} : null)}
 className="w-full bg-card px-4 py-3 rounded-xl border border-blue-500 ring-2 ring-blue-500/20 text-foreground font-medium focus:outline-none transition-all"
 />
 ) : (
 <div className="bg-muted px-4 py-3 rounded-xl text-foreground font-medium border border-transparent">
 {profileData.fullName}
 </div>
 )}
 </div>
 <div className="space-y-1.5">
 <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
 Email Address
 </label>
 {isEditing ? (
 <input 
 type="email"
 value={editData?.email ||""} 
 onChange={e => setEditData(prev => prev ? {...prev, email: e.target.value} : null)}
 className="w-full bg-card px-4 py-3 rounded-xl border border-blue-500 ring-2 ring-blue-500/20 text-foreground font-medium focus:outline-none transition-all"
 />
 ) : (
 <div className="bg-muted px-4 py-3 rounded-xl text-foreground font-medium border border-transparent">
 {profileData.email}
 </div>
 )}
 </div>
 <div className="space-y-1.5">
 <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
 Role
 </label>
 {isEditing ? (
 <input 
 type="text"
 value={editData?.role ||""} 
 onChange={e => setEditData(prev => prev ? {...prev, role: e.target.value} : null)}
 className="w-full bg-card px-4 py-3 rounded-xl border border-blue-500 ring-2 ring-blue-500/20 text-foreground font-medium focus:outline-none transition-all"
 />
 ) : (
 <div className="bg-muted px-4 py-3 rounded-xl text-foreground font-medium border border-transparent">
 {profileData.role}
 </div>
 )}
 </div>
 <div className="space-y-1.5">
 <label className="text-[11px] font-bold uppercase text-muted-foreground tracking-wider">
 Department
 </label>
 {isEditing ? (
 <input 
 type="text"
 value={editData?.department ||""} 
 onChange={e => setEditData(prev => prev ? {...prev, department: e.target.value} : null)}
 className="w-full bg-card px-4 py-3 rounded-xl border border-blue-500 ring-2 ring-blue-500/20 text-foreground font-medium focus:outline-none transition-all"
 />
 ) : (
 <div className="bg-muted px-4 py-3 rounded-xl text-foreground font-medium border border-transparent">
 {profileData.department}
 </div>
 )}
 </div>
 </div>
 <div className="mt-10 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-primary/20">
 <div className="flex gap-3">
 <Info className="text-primary shrink-0 mt-0.5" size={18} />
 <div>
 <p className="text-xs font-bold text-foreground">
 Administrator Privileges
 </p>
 <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
 Your account has global read/write access to all ISP Nodes and Financial Ledgers. Changes to these details require secondary authorization.
 </p>
 </div>
 </div>
 </div>
 </m.div>

 {/* Session Management */}
 <m.div variants={itemVariants} className="bg-card rounded-3xl p-8 shadow-sm border border-border">
  <h3 className="text-xl font-bold tracking-tight text-foreground mb-2">
  Session Management
  </h3>
  <p className="text-sm text-muted-foreground mb-8">
  Review and manage your active sessions across different devices and browsers.
  </p>
  <div className="space-y-4">
  {sessions.length > 0 ? (
   (() => {
     const session = sessions[0];
     const isMobile = session.device_info.toLowerCase().includes('mobile') || session.device_info.toLowerCase().includes('android') || session.device_info.toLowerCase().includes('iphone');
     return (
       <div className="flex flex-wrap items-center justify-between p-5 bg-muted rounded-2xl gap-4">
       <div className="flex items-center gap-4">
         <div className="w-10 h-10 flex items-center justify-center rounded-full shadow-sm shrink-0 bg-white text-primary">
         {isMobile ? <Smartphone size={18} /> : <Laptop size={18} />}
         </div>
         <div>
         <p className="text-sm font-bold text-foreground">
           {session.device_info}
         </p>
         <p className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">
           {session.location} • Current Session • {session.ip_address}
         </p>
         </div>
       </div>
       <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-black rounded-full uppercase tracking-wider">
         Active Now
       </span>
       </div>
     );
   })()
  ) : (
   <p className="text-sm text-muted-foreground italic">No active sessions found.</p>
  )}
  </div>
 
 <div className="mt-8 pt-4 border-t border-border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
 <p className="text-xs text-muted-foreground font-medium">
  Manage all your active devices and revoke unauthorized access.
 </p>
 <Link href="/profile/sessions" className="text-primary text-sm font-bold px-4 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
  View All Sessions <ArrowRight size={16} />
 </Link>
 </div>
 </m.div>

  {/* Danger Zone (Moved to Left Column to fill gap) */}
  <m.div variants={itemVariants} className="bg-card rounded-3xl p-8 shadow-sm border border-red-500/20 relative overflow-hidden group w-full flex-1 flex flex-col justify-center">
  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-600"/>
  <h3 className="text-xl font-bold tracking-tight text-red-600 dark:text-red-500 mb-2 flex items-center gap-2">
  <AlertTriangle size={20} /> Danger Zone
  </h3>
  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
  Actions here are permanent. Please proceed with caution if you are attempting to deactivate this administrator account.
  </p>
  <button onClick={() => setIsDeactivateModalOpen(true)} disabled={isVisitor} className={cn("w-full px-8 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500 text-sm font-bold rounded-2xl transition-all shadow-sm",
  isVisitor ? "opacity-50 cursor-not-allowed" : "dark:hover:bg-red-900/30 active:scale-95"
  )}>
  Deactivate Account
  </button>
  </m.div>
 </div>

 {/* Right Column: Security & Danger Zone */}
 <div className="md:col-span-1 lg:col-span-1 flex flex-col gap-6 h-full">
 {/* Account Security */}
 <AnimatePresence>
 {isPasswordModalOpen && (
 <m.div
 initial={{ opacity: 0, height: 0, marginBottom: 0 }}
 animate={{ opacity: 1, height:"auto", marginBottom: 24 }}
 exit={{ opacity: 0, height: 0, marginBottom: 0 }}
 className="bg-card rounded-3xl p-8 shadow-xl border-2 border-primary/20 overflow-hidden"
 >
 <div className="flex items-center justify-between mb-6">
 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
 <Lock size={20} />
 </div>
 <button 
 onClick={() => {
 setIsPasswordModalOpen(false);
 setPassData({ old:'', new:'', confirm:''});
 }}
 className="p-2 hover:bg-muted dark:hover:bg-muted rounded-full transition-colors"
 >
 <X size={18} className="text-muted-foreground"/>
 </button>
 </div>
 
 <h3 className="text-xl font-black text-foreground tracking-tight mb-1">Update Security</h3>
 <p className="text-xs text-muted-foreground font-medium mb-6">Ensure your account remains secure.</p>

 <form onSubmit={handleChangePassword} className="space-y-4">
 <div className="space-y-1.5">
 <label className="text-[9px] font-black uppercase text-muted-foreground tracking-wider ml-1">Current Password</label>
 <div className="relative group">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"size={16} />
 <input 
 type="password"required
 value={passData.old}
 onChange={e => setPassData({...passData, old: e.target.value})}
 className="w-full bg-muted border border-transparent focus:border-primary/20 rounded-xl py-2.5 pl-11 pr-4 outline-none transition-all font-medium text-sm text-foreground"
 placeholder="••••••••"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-[9px] font-black uppercase text-muted-foreground tracking-wider ml-1">New Password</label>
 <div className="relative group">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"size={16} />
 <input 
 type="password"required
 value={passData.new}
 onChange={e => setPassData({...passData, new: e.target.value})}
 className="w-full bg-muted border border-transparent focus:border-primary/20 rounded-xl py-2.5 pl-11 pr-4 outline-none transition-all font-medium text-sm text-foreground"
 placeholder="••••••••"
 />
 </div>
 </div>

 <div className="space-y-1.5">
 <label className="text-[9px] font-black uppercase text-muted-foreground tracking-wider ml-1">Confirm Password</label>
 <div className="relative group">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"size={16} />
 <input 
 type="password"required
 value={passData.confirm}
 onChange={e => setPassData({...passData, confirm: e.target.value})}
 className="w-full bg-muted border border-transparent focus:border-primary/20 rounded-xl py-2.5 pl-11 pr-4 outline-none transition-all font-medium text-sm text-foreground"
 placeholder="••••••••"
 />
 </div>
 </div>

 <button 
 type="submit"
 disabled={isPassLoading}
 className="w-full bg-primary text-white rounded-xl py-3 font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 text-sm"
 >
 {isPassLoading ? (
 <Loader2 className="animate-spin"size={18} />
 ) : (
 <>
 <span>Update Password</span>
 <ArrowRight size={18} />
 </>
 )}
 </button>
 </form>
 </m.div>
 )}
 </AnimatePresence>

 <m.div variants={itemVariants} className="bg-card rounded-3xl p-8 shadow-sm border border-border">
 <h3 className="text-xl font-bold tracking-tight text-foreground mb-8">
 Account Security
 </h3>
 <div className="space-y-8">
 <div>
 <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-4">
 <label className="text-sm font-bold text-foreground">Password</label>
 <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
 Last changed: {(profileData as any).last_password_change ? getTimeAgo((profileData as any).last_password_change) :'Never'}
 </span>
 </div>
 <button 
 onClick={() => setIsPasswordModalOpen(true)}
 className="w-full py-3 px-5 bg-muted hover:bg-muted transition-colors text-foreground text-sm font-bold rounded-2xl flex items-center justify-between group/btn"
 >
 Change Password
 <ChevronRight size={18} className="text-muted-foreground group-hover/btn:translate-x-1 transition-transform"/>
 </button>
 </div>
 <div className="pt-6 border-t border-border">
 <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
 <div>
 <label className="text-sm font-bold block text-foreground">
 Two-Factor Auth
 </label>
 <p className="text-xs text-muted-foreground mt-1">Recommended for admins</p>
 </div>
 {twoFactorStatus.enabled ? (
 <div className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-black rounded-full uppercase tracking-wider">
 Enabled
 </div>
 ) : (
 <div className="px-3 py-1 bg-muted text-muted-foreground text-[10px] font-black rounded-full uppercase tracking-wider">
 Disabled
 </div>
 )}
 </div>
 <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
 <Verified className="text-primary shrink-0"size={20} />
 <div className="flex-1 min-w-0">
 <p className="text-[11px] font-bold text-foreground truncate">
 Authenticator App
 </p>
 <p className="text-[10px] text-muted-foreground truncate">{twoFactorStatus.enabled ?'Google Authenticator active':'Not configured'}</p>
 </div>
 <button onClick={handleManage2FA} disabled={isVisitor} className={cn("text-primary text-[10px] font-bold uppercase tracking-wider shrink-0",
 isVisitor ? "opacity-50 cursor-not-allowed" : "hover:underline"
 )}>
 {is2FAModalOpen ?'Cancel': twoFactorStatus.enabled ?'Manage':'Setup'}
 </button>
 </div>
 <AnimatePresence>
 {is2FAModalOpen && (
 <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height:'auto'}} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
 <div className="pt-4 mt-4 border-t border-border">
 {!twoFactorStatus.enabled ? (
 <form onSubmit={handleVerify2FA} className="space-y-4">
 <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl mb-6 border border-blue-100 dark:border-blue-900/30">
 <div className="text-[11px] md:text-xs text-muted-foreground font-medium space-y-1.5 text-left">
 <p>1. Install <strong className="text-foreground">Google Authenticator</strong> or <strong className="text-foreground">Authy</strong>.</p>
 <p>2. Scan the QR code below.</p>
 </div>
 </div>

 <div className="flex justify-center mb-6">
 <div className="p-3 bg-white rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.05)] border border-border">
 {qrCodeUrl ? (
 <img src={qrCodeUrl} alt="2FA QR Code"className="w-44 h-44 rounded-xl object-contain"/>
 ) : (
 <div className="w-44 h-44 bg-muted animate-pulse rounded-xl"/>
 )}
 </div>
 </div>

 <div className="bg-muted p-4 rounded-2xl mb-6 border border-border">
 <button 
 type="button"
 onClick={() => setShowManualKey(!showManualKey)}
 className="w-full flex items-center justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors"
 >
 <span>Or enter this setup key manually</span>
 <ChevronRight size={14} className={`transform transition-transform ${showManualKey ?'rotate-90':''}`} />
 </button>
 
 <AnimatePresence>
 {showManualKey && (
 <m.div 
 initial={{ opacity: 0, height: 0, marginTop: 0 }}
 animate={{ opacity: 1, height:"auto", marginTop: 12 }}
 exit={{ opacity: 0, height: 0, marginTop: 0 }}
 className="overflow-hidden"
 >
 <div className="flex items-center justify-between gap-2 bg-card px-4 py-2.5 rounded-xl border border-border">
 <p className="font-mono text-sm tracking-[0.15em] text-foreground select-all truncate">
 {twoFactorSecret}
 </p>
 <button 
 type="button"
 onClick={() => {
 navigator.clipboard.writeText(twoFactorSecret);
 toast.success("Secret copied to clipboard");
 }}
 className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted dark:hover:bg-muted rounded-lg transition-colors shrink-0"
 >
 <Copy size={16} />
 </button>
 </div>
 </m.div>
 )}
 </AnimatePresence>
 </div>

 <div className="space-y-2 mb-2">
 <label className="text-[11px] font-black uppercase text-muted-foreground tracking-wider flex justify-center">
 3. Enter 6-Digit Code
 </label>
 <div className="relative group w-full">
 <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors z-20"size={20} />
 
 <input 
 type="text"required maxLength={6}
 value={otpToken}
 onChange={(e) => setOtpToken(e.target.value.replace(/\D/g,''))}
 className="w-full text-left tracking-[0.5em] sm:tracking-[0.75em] font-mono bg-card border-2 border-border rounded-2xl py-4 pl-14 pr-2 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-xl font-bold text-foreground relative z-10 bg-transparent"
 />

 {/* Background placeholder zeros */}
 <div className="absolute left-14 top-1/2 -translate-y-1/2 pointer-events-none flex text-xl font-bold font-mono tracking-[0.5em] sm:tracking-[0.75em] text-muted-foreground dark:text-foreground z-0 select-none">
 <span className="text-transparent">{otpToken}</span>
 <span>{'0'.repeat(Math.max(0, 6 - otpToken.length))}</span>
 </div>
 </div>
 </div>
 
 <button 
 type="submit"disabled={is2FALoading || otpToken.length < 6}
 className="w-full bg-gradient-to-r from-primary to-blue-600 text-white rounded-2xl py-4 font-black shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {is2FALoading ? <Loader2 className="animate-spin"size={18} /> : <Verified size={18} />}
 Verify & Enable 2FA
 </button>
 </form>
 ) : (
 <form onSubmit={handleDisable2FA} className="space-y-4">
 <p className="text-sm text-muted-foreground mb-4">To disable Two-Factor Authentication, please enter your password.</p>
 <div className="space-y-1.5">
 <label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
 Password
 </label>
 <div className="relative">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"size={16} />
 <input 
 type="password"required
 value={disable2FAPassword}
 onChange={(e) => setDisable2FAPassword(e.target.value)}
 className="w-full pl-11 pr-4 bg-muted border border-transparent focus:border-primary/20 rounded-xl py-2.5 outline-none transition-all font-medium text-sm text-foreground"
 />
 </div>
 </div>
 <button 
 type="submit"disabled={is2FALoading}
 className="w-full bg-red-600 text-white rounded-xl py-3 font-bold shadow-lg shadow-red-600/20 hover:opacity-90 transition-all text-sm flex items-center justify-center gap-2"
 >
 {is2FALoading && <Loader2 className="animate-spin"size={16} />}
 Disable 2FA
 </button>
 </form>
 )}
 </div>
 </m.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 </m.div>

 {/* Security Logs Card */}
 <m.div variants={itemVariants} className="bg-card rounded-3xl p-8 shadow-sm border border-border flex-1 flex flex-col">
 <div className="flex items-center justify-between mb-8">
 <h3 className="text-xl font-bold tracking-tight text-foreground">
 Security Logs
 </h3>
 <span className="text-[10px] uppercase text-muted-foreground font-black tracking-wider">Last 100 activities</span>
 </div>
 
 <div className="space-y-7">
 {(() => {
  const startIndex = (securityLogsPage - 1) * logsPerPage;
  const paginatedLogs = securityLogs.slice(startIndex, startIndex + logsPerPage);
  
  if (paginatedLogs.length === 0) {
    return <p className="text-[11px] text-muted-foreground">No security logs available.</p>;
  }

  // Group logs by date
  let lastDateStr = '';
  const groupedLogs: any[] = [];
  
  for (const log of paginatedLogs) {
    const dateObj = new Date(log.created_at);
    const dateStr = dateObj.toLocaleDateString();
    
    if (dateStr !== lastDateStr) {
      groupedLogs.push({ isHeader: true, dateStr, dateObj });
      lastDateStr = dateStr;
    }
    groupedLogs.push({ isHeader: false, log, dateObj });
  }

  return groupedLogs.map((item: any, idx: number) => {
    if (item.isHeader) {
      const isToday = new Date().toLocaleDateString() === item.dateStr;
      return (
        <div key={`header-${item.dateStr}-${idx}`} className="sticky top-0 bg-card py-1 z-10 border-b border-border/50 mb-2">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {isToday ? "Today" : item.dateStr}
          </p>
        </div>
      );
    }

    const log = item.log;
    const isLastInGroup = idx === groupedLogs.length - 1 || groupedLogs[idx + 1].isHeader;
    
    return (
      <div key={log.created_at + log.action + idx} className="flex items-start gap-3 relative pl-2">
        {!isLastInGroup && (
          <div className="absolute left-[7px] top-4 bottom-[-20px] w-[1px] bg-border" />
        )}
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 relative z-10 ring-4 ring-card ${log.action.toLowerCase().includes('fail') || log.action.toLowerCase().includes('deactivate') ?'bg-red-500':'bg-green-500'}`} />
        <div>
          <p className="text-[11px] font-bold text-foreground">
            {log.action}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {item.dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {log.ip_address}
          </p>
        </div>
      </div>
    );
  });
 })()}
 </div>

 {/* Pagination Controls */}
 {securityLogs.length > logsPerPage && (
 <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
  <button 
    onClick={() => setSecurityLogsPage(p => Math.max(1, p - 1))}
    disabled={securityLogsPage === 1}
    className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    Previous
  </button>
  <span className="text-[11px] font-bold text-muted-foreground">
    {securityLogsPage} / {Math.ceil(securityLogs.length / logsPerPage)}
  </span>
  <button 
    onClick={() => setSecurityLogsPage(p => Math.min(Math.ceil(securityLogs.length / logsPerPage), p + 1))}
    disabled={securityLogsPage >= Math.ceil(securityLogs.length / logsPerPage)}
    className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
    Next
  </button>
 </div>
  )}
 </m.div>
 </div>
 </div>

 </m.div>
 );
}
