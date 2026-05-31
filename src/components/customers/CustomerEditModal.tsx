"use client";

import { useState, useEffect } from"react";
import { createPortal } from"react-dom";
import { m, AnimatePresence } from"framer-motion";
import { X, Save, Router, Globe, Cpu, Activity, Users } from"lucide-react";
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
 pppoe_user: customer?.pppoe_user ||"",
 pppoe_password: customer?.pppoe_password ||"",
 ip_address: customer?.ip_address ||"",
 mac_address: customer?.mac_address ||"",
 olt_port: customer?.olt_port ||"",
 optical_attenuation: customer?.optical_attenuation ||"",
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
 <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 tablet:p-6">
 <m.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 onClick={onClose} 
 className="absolute inset-0 bg-card/60 backdrop-blur-sm"
 />
 
 <m.div 
 initial={{ scale: 0.95, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.95, opacity: 0, y: 20 }}
 className="relative w-full max-w-2xl bg-card rounded-[2.5rem] shadow-2xl border border-border overflow-hidden"
 >
 {/* Header */}
 <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-muted/50">
 <div>
 <h2 className="text-xl font-black text-foreground">Edit Network Profile</h2>
 <p className="text-xs font-bold text-muted-foreground mt-1">Configure IPAM and OLT details for {customer?.name}</p>
 </div>
 <button 
 onClick={onClose}
 className="p-2 hover:bg-muted dark:hover:bg-muted rounded-full transition-colors"
 >
 <X size={20} className="text-muted-foreground"/>
 </button>
 </div>

 {/* Form */}
 <form onSubmit={handleSubmit} className="p-6">
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
 
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

 {/* Footer */}
 <div className="flex justify-end gap-3 pt-4 border-t border-border">
 <button 
 type="button"
 onClick={onClose}
 className="px-6 py-3 font-bold text-sm text-muted-foreground hover:bg-muted dark:hover:bg-muted rounded-xl transition-colors"
 >
 Cancel
 </button>
 <button 
 type="submit"
 disabled={loading || isVisitor}
 className={cn("flex items-center gap-2 px-6 py-3 font-bold text-sm text-white bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20 transition-all",
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
