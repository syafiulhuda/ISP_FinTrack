"use client";

import { m } from "framer-motion";
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { loginAction, requestPasswordReset } from "@/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shake, setShake] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await loginAction(email, password);

    if (result.success) {
      router.push("/");
      router.refresh();
    } else {
      setError(result.error || "Login gagal.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    const result = await requestPasswordReset(email);

    if (result.success) {
      setSuccess(result.message || "Reset link sent!");
      setIsLoading(false);
    } else {
      setError(result.message || "Failed to send reset link.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
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

          {!isForgotMode && (
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label htmlFor="password" className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Password</label>
                <button 
                  type="button" 
                  onClick={() => { setIsForgotMode(true); setError(""); setSuccess(""); }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                <input 
                  id="password"
                  type="password" required={!isForgotMode} value={password}
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

          {!isForgotMode && (
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
                <span>{isForgotMode ? "Send Reset Link" : "Enter Dashboard"}</span>
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
