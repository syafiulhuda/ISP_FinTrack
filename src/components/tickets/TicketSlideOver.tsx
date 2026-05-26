"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { m, AnimatePresence } from "framer-motion";
import { X, Send, AlertCircle, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { createTicket } from "@/actions/tickets";
import { cn } from "@/lib/utils";

interface TicketSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
}

export function TicketSlideOver({ isOpen, onClose, customerId }: TicketSlideOverProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    issue_category: "LOSS",
    description: "",
    priority: "MEDIUM",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      toast.error("Description is required");
      return;
    }
    setLoading(true);

    const res = await createTicket({
      customer_id: customerId,
      issue_category: formData.issue_category,
      description: formData.description,
      priority: formData.priority,
    });

    if (res.success) {
      toast.success(`Ticket created: ${res.ticket_number}`);
      setFormData({ issue_category: "LOSS", description: "", priority: "MEDIUM" });
      onClose();
    } else {
      toast.error("Failed to create ticket");
    }
    setLoading(false);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Slide-Over Panel */}
          <m.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[210] w-full md:max-w-md bg-white dark:bg-slate-950 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <AlertCircle size={20} className="text-indigo-500" />
                  New Trouble Ticket
                </h2>
                <p className="text-xs font-bold text-slate-500 mt-1">Report an issue for customer {customerId}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors border border-slate-200 dark:border-slate-700"
              >
                <X size={16} className="text-slate-500" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6">
              <form id="ticket-form" onSubmit={handleSubmit} className="space-y-6">
                
                {/* Category */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Issue Category</label>
                  <select
                    name="issue_category"
                    value={formData.issue_category}
                    onChange={handleChange}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  >
                    <option value="LOSS">LOSS (Red Light)</option>
                    <option value="SLOW">Slow Connection</option>
                    <option value="INTERMITTENT">Intermittent Connection</option>
                    <option value="BILLING">Billing Issue</option>
                    <option value="ROUTER_ISSUE">Router/Modem Issue</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Priority Selection Grid */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Priority Level</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      onClick={() => setFormData({...formData, priority: "CRITICAL"})}
                      className={cn(
                        "cursor-pointer p-4 rounded-2xl border-2 transition-all",
                        formData.priority === "CRITICAL" 
                          ? "border-rose-500 bg-rose-50 dark:bg-rose-500/10" 
                          : "border-slate-100 dark:border-slate-800 hover:border-rose-200"
                      )}
                    >
                      <AlertCircle size={20} className={formData.priority === "CRITICAL" ? "text-rose-500" : "text-slate-400"} />
                      <p className={cn("font-black mt-2 text-sm", formData.priority === "CRITICAL" ? "text-rose-700 dark:text-rose-400" : "text-slate-600 dark:text-slate-400")}>Critical</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">SLA: 2 Hours</p>
                    </div>

                    <div 
                      onClick={() => setFormData({...formData, priority: "HIGH"})}
                      className={cn(
                        "cursor-pointer p-4 rounded-2xl border-2 transition-all",
                        formData.priority === "HIGH" 
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10" 
                          : "border-slate-100 dark:border-slate-800 hover:border-amber-200"
                      )}
                    >
                      <Clock size={20} className={formData.priority === "HIGH" ? "text-amber-500" : "text-slate-400"} />
                      <p className={cn("font-black mt-2 text-sm", formData.priority === "HIGH" ? "text-amber-700 dark:text-amber-400" : "text-slate-600 dark:text-slate-400")}>High</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">SLA: 4 Hours</p>
                    </div>

                    <div 
                      onClick={() => setFormData({...formData, priority: "MEDIUM"})}
                      className={cn(
                        "cursor-pointer p-4 rounded-2xl border-2 transition-all",
                        formData.priority === "MEDIUM" 
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" 
                          : "border-slate-100 dark:border-slate-800 hover:border-indigo-200"
                      )}
                    >
                      <CheckCircle size={20} className={formData.priority === "MEDIUM" ? "text-indigo-500" : "text-slate-400"} />
                      <p className={cn("font-black mt-2 text-sm", formData.priority === "MEDIUM" ? "text-indigo-700 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400")}>Medium</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">SLA: 24 Hours</p>
                    </div>

                    <div 
                      onClick={() => setFormData({...formData, priority: "LOW"})}
                      className={cn(
                        "cursor-pointer p-4 rounded-2xl border-2 transition-all",
                        formData.priority === "LOW" 
                          ? "border-slate-500 bg-slate-100 dark:bg-slate-800" 
                          : "border-slate-100 dark:border-slate-800 hover:border-slate-300"
                      )}
                    >
                      <Clock size={20} className={formData.priority === "LOW" ? "text-slate-600 dark:text-slate-300" : "text-slate-400"} />
                      <p className={cn("font-black mt-2 text-sm", formData.priority === "LOW" ? "text-slate-800 dark:text-slate-200" : "text-slate-600 dark:text-slate-400")}>Low</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">SLA: 48 Hours</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Problem Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Describe the issue in detail..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
              <button
                type="submit"
                form="ticket-form"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={18} />
                    <span>Create Ticket</span>
                  </>
                )}
              </button>
            </div>

          </m.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
