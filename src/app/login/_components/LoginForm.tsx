"use client";

import { m } from "framer-motion";
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { loginAction, requestPasswordReset, getUsersForResetDropdown, verifyLogin2FA } from "@/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shake, setShake] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  
  // 2FA states
  const [requires2FA, setRequires2FA] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [adminId, setAdminId] = useState<number | null>(null);
  
  // States for Password Reset Hierarchy
  const [requesterRole, setRequesterRole] = useState("Owner");
  const [targetUserId, setTargetUserId] = useState<number | "">("");
  const [requesterPassword, setRequesterPassword] = useState("");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  // Determine if this is a self-reset (Owner resetting Owner)
  const targetUser = availableUsers.find((u) => u.id === targetUserId);
  const isSelfReset = requesterRole === "Owner" && targetUser && (targetUser.role.toLowerCase().includes("owner") || targetUser.role.toLowerCase().includes("system"));

  // Fetch users when requesterRole changes and in forgot mode
  const fetchUsersForRole = async (role: string) => {
    setIsLoadingUsers(true);
    setTargetUserId("");
    const res = await getUsersForResetDropdown(role);
    if (res.success) {
      setAvailableUsers(res.users || []);
    } else {
      setAvailableUsers([]);
    }
    setIsLoadingUsers(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (requires2FA && adminId) {
      // Handle 2FA verification
      const result = await verifyLogin2FA(adminId, otpToken);
      if (result.success) {
        window.location.href = "/";
      } else {
        setError(result.error || "Kode verifikasi salah.");
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setIsLoading(false);
      }
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const result = await loginAction(formData);

    if (result.success && result.requires2FA) {
      setRequires2FA(true);
      setAdminId(result.adminId || null);
      setIsLoading(false);
    } else if (result.success) {
      window.location.href = "/";
    } else {
      setError(result.error || "Login gagal.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) {
      setError("Pilih user yang ingin direset.");
      return;
    }

    if (!isSelfReset && !requesterPassword) {
      setError("Masukkan password Anda untuk memvalidasi permintaan ini.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    setSuccess("");

    const result = await requestPasswordReset(Number(targetUserId), requesterRole, requesterPassword);

    if (result.success) {
      setSuccess(result.message || "Reset link sent!");
      setIsLoading(false);
    } else {
      setError(result.message || "Failed to send reset link.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md min-h-[450px] flex flex-col justify-center">
      <m.div 
        key={isForgotMode ? "forgot" : "login"}
        initial={false} 
        animate={{ opacity: 1, x: 0 }} 
        transition={{ duration: 0.5 }}
      >
        <div className="mb-12">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
            {isForgotMode ? "Reset Password" : "Welcome Back"}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
            {isForgotMode 
              ? "Enter your work email and we'll send you a link to reset your password."
              : requires2FA 
              ? "Enter the 6-digit code from your authenticator app to continue." 
              : "Enter your credentials to access the enterprise dashboard."}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          >
            <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-sm font-bold text-red-700 dark:text-red-300">{error}</p>
          </m.div>
        )}

        {/* Success Message */}
        {success && (
          <m.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
          >
            <ShieldCheck size={20} className="text-green-600 dark:text-green-400 shrink-0" />
            <p className="text-sm font-bold text-green-700 dark:text-green-300">{success}</p>
          </m.div>
        )}

        <m.form 
          onSubmit={isForgotMode ? handleForgot : handleLogin} 
          className="space-y-6"
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          {!isForgotMode && !requires2FA ? (
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Work Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                <input 
                  id="email"
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>
          ) : !isForgotMode && requires2FA ? (
            <div className="space-y-2">
              <label htmlFor="otp" className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Verification Code</label>
              <div className="relative group">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                <input 
                  id="otp"
                  type="text" required value={otpToken}
                  maxLength={6}
                  onChange={(e) => setOtpToken(e.target.value)}
                  placeholder="000000"
                  className="w-full text-center tracking-widest text-lg bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-4 pr-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 dark:text-white font-black"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Identitas Anda (Role)</label>
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                  <select 
                    value={requesterRole}
                    onChange={(e) => {
                      setRequesterRole(e.target.value);
                      fetchUsersForRole(e.target.value);
                    }}
                    className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-10 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 dark:text-white font-medium"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Admin Kantor">Admin Kantor</option>
                    <option value="Tim Lapangan">Tim Lapangan</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">User yang Ingin Direset</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                  <select 
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value ? Number(e.target.value) : "")}
                    disabled={isLoadingUsers || availableUsers.length === 0}
                    className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-10 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 dark:text-white font-medium disabled:opacity-50"
                  >
                    <option value="">-- Pilih User --</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.email}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
                {availableUsers.length === 0 && !isLoadingUsers && (
                  <p className="text-xs text-red-500 mt-1">Anda tidak memiliki wewenang mereset siapapun.</p>
                )}
              </div>

              {!isSelfReset && availableUsers.length > 0 && targetUserId !== "" && (
                <m.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2 overflow-hidden"
                >
                  <label htmlFor="requesterPassword" className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                    Validasi (Password Anda)
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                    <input 
                      id="requesterPassword"
                      type="password" required value={requesterPassword}
                      onChange={(e) => setRequesterPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 dark:text-white font-medium"
                    />
                  </div>
                </m.div>
              )}
            </>
          )}

          {!isForgotMode && !requires2FA && (
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label htmlFor="password" className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Password</label>
                <button 
                  type="button" 
                  onClick={() => { 
                    setIsForgotMode(true); 
                    setError(""); 
                    setSuccess(""); 
                    fetchUsersForRole(requesterRole); 
                  }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                <input 
                  id="password"
                  type="password" required={!isForgotMode && !requires2FA} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>
          )}

          {isForgotMode && (
            <button 
              type="button" 
              onClick={() => { setIsForgotMode(false); setError(""); setSuccess(""); }}
              className="text-sm font-bold text-slate-500 hover:text-primary transition-colors"
            >
              ← Back to Login
            </button>
          )}

          {requires2FA && !isForgotMode && (
            <button 
              type="button" 
              onClick={() => { setRequires2FA(false); setOtpToken(""); setError(""); }}
              className="text-sm font-bold text-slate-500 hover:text-primary transition-colors"
            >
              ← Back
            </button>
          )}

          {!isForgotMode && !requires2FA && (
            <div className="flex items-center gap-2 py-2">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
              <label htmlFor="remember" className="text-sm font-medium text-slate-500 dark:text-slate-400">Keep me logged in for 30 days</label>
            </div>
          )}

          <button 
            type="submit" disabled={isLoading}
            className={cn(
              "w-full bg-gradient-to-br from-primary to-blue-700 text-white rounded-2xl py-4 font-black text-lg shadow-xl shadow-blue-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden",
              isLoading && "cursor-not-allowed opacity-80"
            )}
          >
            {isLoading ? (
              <m.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full"
              />
            ) : (
              <>
                <span>{isForgotMode ? "Send Reset Link" : requires2FA ? "Verify Code" : "Enter Dashboard"}</span>
                <ArrowRight size={22} />
              </>
            )}
          </button>
        </m.form>

        <div className="mt-12 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Don&apos;t have an account yet? <button className="text-primary font-bold hover:underline">Contact Administrator</button>
          </p>
        </div>
      </m.div>
    </div>
  );
}
