"use client";

import { motion } from "framer-motion";
import { 
  Search, 
  BookOpen, 
  MessageCircle, 
  Mail, 
  LifeBuoy, 
  CreditCard, 
  Package, 
  ChevronRight,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { 
    title: "Billing & Finance", 
    desc: "OCR verification, invoice automation, and payment gateways.",
    icon: CreditCard,
    color: "bg-blue-100 text-blue-600",
    articles: ["Setting up QRIS", "OCR Error Handling", "Exporting AR Aging"]
  },
  { 
    title: "Inventory Control", 
    desc: "Hardware deployment, RMA process, and SN tracking.",
    icon: Package,
    color: "bg-orange-100 text-orange-600",
    articles: ["RMA Ticket Workflow", "Batch Asset Upload", "Location Management"]
  },
  { 
    title: "Account Security", 
    desc: "Password policies, 2FA, and role-based access control.",
    icon: LifeBuoy,
    color: "bg-green-100 text-green-600",
    articles: ["Setting up 2FA", "Team Permissions", "Security Audit Logs"]
  }
];

export default function SupportPage() {
  return (
    <div className="space-y-12">
      {/* Search Header */}
      <div className="bg-gradient-to-br from-primary to-blue-700 rounded-3xl p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">How can we help?</h1>
          <p className="text-blue-100 text-lg font-medium">Search our enterprise knowledge base for instant answers.</p>
          <div className="relative group max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={22} />
            <input 
              type="text" 
              placeholder="Describe your issue or search topics..."
              className="w-full bg-white text-slate-900 rounded-2xl py-5 pl-14 pr-6 outline-none shadow-2xl focus:ring-4 focus:ring-white/20 transition-all font-medium text-lg"
            />
          </div>
        </div>
      </div>

      {/* Main Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {categories.map((cat, idx) => (
          <motion.div 
            key={cat.title}
            className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6", cat.color)}>
              <cat.icon size={28} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">{cat.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">{cat.desc}</p>
            
            <ul className="space-y-4">
              {cat.articles.map(article => (
                <li key={article} className="flex items-center justify-between group/item cursor-pointer">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover/item:text-primary transition-colors">{article}</span>
                  <ChevronRight size={16} className="text-slate-300 group-hover/item:text-primary transition-colors" />
                </li>
              ))}
            </ul>

            <button className="mt-10 flex items-center gap-2 text-sm font-black text-primary uppercase tracking-widest hover:gap-3 transition-all">
              View All Topics <ArrowRight size={16} />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Contact Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 text-white rounded-3xl p-10 flex items-center justify-between overflow-hidden relative group">
          <div className="relative z-10 space-y-4">
            <h3 className="text-3xl font-black tracking-tight">Need direct help?</h3>
            <p className="text-slate-400 font-medium">Chat with our dedicated ISP support team on WhatsApp.</p>
            <button className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-3 hover:bg-slate-100 transition-all">
              <MessageCircle size={20} className="text-green-600" />
              START WHATSAPP CHAT
            </button>
          </div>
          <MessageSquare className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 group-hover:scale-110 transition-transform duration-500" />
        </div>

        <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl p-10 flex items-center justify-between group">
          <div className="space-y-4">
            <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Email Support</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">For technical audits and detailed inquiries.</p>
            <button className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-3 shadow-xl shadow-primary/20 hover:opacity-90 transition-all">
              <Mail size={20} />
              SEND AN EMAIL
            </button>
          </div>
          <BookOpen className="w-24 h-24 text-slate-100 dark:text-slate-800 group-hover:rotate-12 transition-transform duration-500" />
        </div>
      </div>

      {/* Community / Docs footer */}
      <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
            <ExternalLink size={18} className="text-slate-500" />
          </div>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">ISP-FinTrack Technical Documentation v2.4.0</span>
        </div>
        <div className="flex gap-6 text-sm font-bold text-slate-400">
          <button className="hover:text-primary transition-colors">API Docs</button>
          <button className="hover:text-primary transition-colors">Release Notes</button>
          <button className="hover:text-primary transition-colors">System Status</button>
        </div>
      </div>
    </div>
  );
}

const ArrowRight = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14m-7-7 7 7-7 7"/>
  </svg>
);
