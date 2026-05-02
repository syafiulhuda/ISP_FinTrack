"use client";

import { motion } from "framer-motion";
import { Lock, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { resetPassword, validateResetToken } from "@/actions/auth";
import { useEffect } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setError("Invalid or missing token.");
        setIsValidating(false);
        return;
      }

      const result = await validateResetToken(token);
      if (result.valid) {
        setIsTokenValid(true);
      } else {
        setError("This password reset link is invalid or has already been used.");
      }
      setIsValidating(false);
    };

    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Invalid or missing token.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await resetPassword(token, password);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } else {
      setError(result.message || "Failed to reset password.");
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full"
        />
        <p className="text-slate-500 font-bold animate-pulse">Validating security token...</p>
      </div>
    );
  }

  if (!isTokenValid && !success) {
    return (
      <div className="w-full max-w-md text-center space-y-8">
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-3xl flex items-center justify-center text-red-600 dark:text-red-400 rotate-12">
            <AlertCircle size={48} />
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Link Invalid</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
            {error || "This password reset link is invalid or has already been used."}
          </p>
        </div>
        <button 
          onClick={() => router.push("/login")}
          className="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl py-4 font-black text-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
        >
          <span>Back to Login</span>
          <ArrowRight size={22} />
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <CheckCircle2 size={40} />
          </div>
        </div>
        <h2 className="text-3xl font-black text-slate-900">Success!</h2>
        <p className="text-slate-500 font-medium text-lg">Your password has been updated. Redirecting you to login...</p>
        <button 
          onClick={() => router.push("/login")}
          className="text-primary font-bold hover:underline"
        >
          Click here if not redirected
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-12">
        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-3">New Password</h2>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Create a strong password for your account.</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
        >
          <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm font-bold text-red-700 dark:text-red-300">{error}</p>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">New Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="password" required value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 dark:text-white font-medium"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Confirm New Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="password" required value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all text-slate-900 dark:text-white font-medium"
            />
          </div>
        </div>

        <button 
          type="submit" disabled={isLoading || !token}
          className={cn(
            "w-full bg-gradient-to-br from-primary to-blue-700 text-white rounded-2xl py-4 font-black text-lg shadow-xl shadow-blue-500/20 hover:opacity-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden",
            (isLoading || !token) && "cursor-not-allowed opacity-80"
          )}
        >
          {isLoading ? (
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full"
            />
          ) : (
            <>
              <span>Update Password</span>
              <ArrowRight size={22} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-950 overflow-hidden font-sans">
      {/* Left side - Branding (Simplified) */}
      <div className="hidden lg:flex w-1/3 bg-slate-900 relative p-16 flex-col justify-between overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
            <span className="text-slate-900 font-black text-xl">IF</span>
          </div>
          <span className="text-xl font-black text-white tracking-tight">ISP-FinTrack</span>
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-white leading-tight mb-4">Secure Your Account.</h2>
          <p className="text-slate-400 font-medium">Protecting your enterprise financial data is our top priority.</p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
          <ShieldCheck size={16} />
          Standard Security Protocol
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-2/3 flex items-center justify-center p-8 relative">
        <Suspense fallback={<div>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
