"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { m, AnimatePresence } from "framer-motion";
import { X, Save, Router, Globe, Cpu, Activity, Users } from "lucide-react";
import { toast } from "sonner";
import { updateCustomerNetwork } from "@/actions/customers";
import { useQuery } from "@tanstack/react-query";
import { getAdminProfile } from "@/actions/admin";
import { cn } from "@/lib/utils";

interface CustomerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
}

export function CustomerEditModal({ isOpen, onClose, customer }: CustomerEditModalProps) {
  const { data: profile } = useQuery({ queryKey: ['adminProfile'], queryFn: getAdminProfile });
  const isVisitor = profile?.email === 'visitor@gmail.com';
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pppoe_user: customer?.pppoe_user || "",
    pppoe_password: customer?.pppoe_password || "",
    ip_address: customer?.ip_address || "",
    mac_address: customer?.mac_address || "",
    olt_port: customer?.olt_port || "",
    optical_attenuation: customer?.optical_attenuation || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await updateCustomerNetwork(customer.id, formData);
    if (res.success) {
      toast.success("Network profile updated successfully!");
      onClose();
    } else {
      toast.error("Failed to update network profile.");
    }
    
    setLoading(false);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {/* Backdrop */}
      <m.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
      />

      {/*
        Mobile / Tablet Portrait: Slide up from bottom, full-width bottom sheet
        Landscape / Desktop (lg+): Centered floating modal, max-w-2xl
      */}
      <div className="fixed inset-0 z-[201] flex items-end lg:items-center justify-center pointer-events-none">
        <m.div
          key="modal"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className={cn(
            "relative w-full bg-card pointer-events-auto flex flex-col",
            "h-[92dvh] rounded-t-[2.5rem] rounded-b-none",
            "lg:h-auto lg:max-h-[90dvh] lg:max-w-2xl lg:rounded-[2.5rem] lg:mx-4",
            "shadow-2xl border-0 lg:border border-border overflow-hidden"
          )}
        >
          {/* Drag Handle — mobile only */}
          <div className="lg:hidden flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50 shrink-0">
            <div>
              <h2 className="text-xl font-black text-foreground">Edit Network Profile</h2>
              <p className="text-xs font-bold text-muted-foreground mt-1">Configure IPAM and OLT details for {customer?.name}</p>
            </div>
            <button 
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 hover:bg-muted dark:hover:bg-muted rounded-full transition-colors"
            >
              <X size={20} className="text-muted-foreground"/>
            </button>
          </div>

          {/* Form — scrollable body */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Users size={14} className="text-indigo-500"/> PPPoE Username
                  </label>
                  <input 
                    type="text"
                    name="pppoe_user"
                    value={formData.pppoe_user}
                    onChange={handleChange}
                    placeholder="e.g. jdoe_home"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Router size={14} className="text-indigo-500"/> PPPoE Password
                  </label>
                  <input 
                    type="text"
                    name="pppoe_password"
                    value={formData.pppoe_password}
                    onChange={handleChange}
                    placeholder="Password"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Globe size={14} className="text-emerald-500"/> IP Address
                  </label>
                  <input 
                    type="text"
                    name="ip_address"
                    value={formData.ip_address}
                    onChange={handleChange}
                    placeholder="e.g. 10.10.2.14"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-mono font-bold text-foreground focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Cpu size={14} className="text-amber-500"/> MAC Address
                  </label>
                  <input 
                    type="text"
                    name="mac_address"
                    value={formData.mac_address}
                    onChange={handleChange}
                    placeholder="e.g. 00:1A:2B:3C:4D:5E"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-mono font-bold text-foreground focus:ring-2 focus:ring-amber-500 outline-none uppercase placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Router size={14} className="text-rose-500"/> OLT Port
                  </label>
                  <input 
                    type="text"
                    name="olt_port"
                    value={formData.olt_port}
                    onChange={handleChange}
                    placeholder="e.g. PON 1/1/2"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-rose-500 outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Activity size={14} className="text-violet-500"/> Optical Attenuation
                  </label>
                  <input 
                    type="text"
                    name="optical_attenuation"
                    value={formData.optical_attenuation}
                    onChange={handleChange}
                    placeholder="e.g. -21.5 dBm"
                    className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-bold text-foreground focus:ring-2 focus:ring-violet-500 outline-none placeholder:text-muted-foreground"
                  />
                </div>

              </div>
            </div>

            {/* Footer — pinned at bottom, always visible */}
            <div className="shrink-0 flex flex-col sm:flex-row gap-3 p-6 pt-4 border-t border-border bg-card">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none py-3 px-6 font-bold text-sm text-muted-foreground hover:bg-muted dark:hover:bg-muted rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading || isVisitor}
                className={cn("flex-1 flex items-center justify-center gap-2 px-6 py-3 font-bold text-sm text-white bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 transition-all",
                  (loading || isVisitor) ? "opacity-50 cursor-not-allowed" : ""
                )}
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"/> : <Save size={16} />}
                Save Changes
              </button>
            </div>
          </form>
        </m.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
