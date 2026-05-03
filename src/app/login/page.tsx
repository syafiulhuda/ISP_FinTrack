"use client";

import { m } from "framer-motion";
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { loginAction, requestPasswordReset } from "@/actions/auth";

export default function LoginPage() {
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
    <div className="min-h-screen w-full flex bg-white dark:bg-slate-950 overflow-hidden font-sans">
      {/* Left side - Visual & Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary via-blue-700 to-indigo-900 relative p-16 flex-col justify-between overflow-hidden">
        <m.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"
        />
        <m.div 
          animate={{ scale: [1, 1.3, 1], rotate: [0, -45, 0], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl"
        />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-2xl">
            <span className="text-primary font-black text-2xl">IF</span>
          </div>
          <span className="text-2xl font-black text-white tracking-tight">ISP-FinTrack</span>
        </div>

        <div className="relative z-10 max-w-lg">
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h1 className="text-6xl font-black text-white leading-[1.1] mb-6">
              Empowering <span className="text-blue-300">ISP Growth</span> Through Data.
            </h1>
            <p className="text-blue-100/80 text-xl leading-relaxed font-medium">
              Enterprise-grade financial intelligence, income automation, and inventory control tailored for internet service providers.
            </p>
          </m.div>
          <div className="mt-12 flex gap-8">
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-black text-white">1.2B+</span>
              <span className="text-sm font-bold text-blue-200/60 uppercase tracking-widest text-[10px]">Monthly Revenue</span>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-black text-white">88%</span>
              <span className="text-sm font-bold text-blue-200/60 uppercase tracking-widest text-[10px]">Efficiency Gain</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-blue-200/60 text-sm font-bold">
          <ShieldCheck size={18} className="text-blue-300" />
          ISO 27001 Certified Enterprise Financial Platform
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-24 relative">
        <div className="w-full max-w-md">
          <m.div 
            key={isForgotMode ? "forgot" : "login"}
            initial={{ opacity: 0, x: 20 }} 
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
                <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Work Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                  <input 
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
                    <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">Password</label>
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

        <div className="absolute bottom-8 lg:hidden text-slate-400 text-xs font-bold uppercase tracking-widest">
          ISP-FinTrack Enterprise v2.4.0
        </div>
      </div>
    </div>
  );
}
