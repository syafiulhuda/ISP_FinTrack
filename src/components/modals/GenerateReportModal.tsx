"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  PieChart as PieChartIcon, 
  Package, 
  MapPin, 
  Calendar,
  CheckCircle2,
  FileText,
  BarChart3,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

import { jsPDF } from "jspdf";
import { domToPng } from "modern-screenshot";
import { getReportData } from "@/actions/reports";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  PieChart,
  Pie,
  Legend
} from "recharts";

interface GenerateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportType = "Revenue" | "Inventory" | "Regional" | null;

export function GenerateReportModal({ isOpen, onClose }: GenerateReportModalProps) {
  const [step, setStep] = useState(1);
  const [reportType, setReportType] = useState<ReportType>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const breakdownRef = useRef<HTMLDivElement>(null);
  const subBreakdownRef = useRef<HTMLDivElement>(null);

  // Filters State
  const [startDate, setStartDate] = useState("2026-04-01");
  const [endDate, setEndDate] = useState("2026-04-30");
  const [region, setRegion] = useState("All Regions (Indonesia)");
  const [granularity, setGranularity] = useState("Monthly");

  const [reportData, setReportData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch report data when entering step 3
  useEffect(() => {
    if (step === 3 && reportType) {
      const fetchData = async () => {
        setIsLoading(true);
        const data = await getReportData({
          type: reportType,
          startDate,
          endDate,
          region,
          granularity
        });
        setReportData(data);
        setIsLoading(false);
      };
      fetchData();
    }
  }, [step, reportType, startDate, endDate, region, granularity]);

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setReportType(null);
      setIsExporting(false);
    }
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted) return null;

  const steps = [
    { id: 1, name: "Category", icon: PieChart },
    { id: 2, name: "Parameters", icon: SettingsIcon },
    { id: 3, name: "Export", icon: Download },
  ];

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const reportCategories = [
    { id: "Revenue", name: "Revenue Report", desc: "Analyze MRR, ARPU and financial growth.", icon: BarChart3, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "Inventory", name: "Inventory Audit", desc: "Track node assets, routers, and stock levels.", icon: Package, color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: "Regional", name: "Regional Analysis", desc: "Segment performance by province and district.", icon: Globe, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  ];

  const getChartConfig = () => {
    const hasData = reportData && (
      (reportData.main && Array.isArray(reportData.main) && reportData.main.length > 0) || 
      (Array.isArray(reportData) && reportData.length > 0)
    );
    const mainData = reportData ? (reportData.main || reportData) : [];
    const breakdownData = reportData?.breakdown || [];
    
    const isFiltered = region && region !== "All Regions (Indonesia)";
    
    switch (reportType) {
      case "Revenue":
        return {
          main: mainData,
          breakdown: breakdownData,
          color: "#2563eb",
          type: "area",
          mainTitle: "Revenue Performance Trend",
          breakdownTitle: isFiltered ? "Revenue by City" : "Revenue by Province"
        };
      case "Inventory":
        return {
          main: mainData,
          // Hide province breakdown if a specific region is already selected
          breakdown: (region === "All Regions (Indonesia)") ? (reportData?.regional || []) : [],
          subBreakdown: reportData?.subBreakdown || [],
          color: "#f59e0b",
          type: "bar",
          mainTitle: "Jumlah Assets",
          breakdownTitle: "Jumlah Assets Berdasarkan Location (Province)",
          subBreakdownTitle: region === "All Regions (Indonesia)" ? "Stock Assets Location (Unused)" : `Detail Lokasi: ${region}`,
          ownership: reportData?.ownership || [],
          ownershipTitle: "Distribusi Kepemilikan"
        };
      case "Regional":
        return {
          main: mainData,
          breakdown: breakdownData,
          color: "#10b981",
          type: "bar",
          mainTitle: "Regional Subscriber Distribution",
          breakdownTitle: isFiltered ? "Distribution by District" : "Distribution by City"
        };
      default:
        return {
          main: [{ name: 'N/A', value: 0 }],
          breakdown: [],
          color: "#64748b",
          type: "area",
          breakdownTitle: "N/A"
        };
    }
  };

  const chartConfig = getChartConfig();

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let mainChartImg = "";
      let breakdownChartImg = "";
      let subBreakdownChartImg = "";

      if (chartRef.current) {
        mainChartImg = await domToPng(chartRef.current, {
          backgroundColor: '#ffffff',
          scale: 2
        });
      }

      if (breakdownRef.current) {
        breakdownChartImg = await domToPng(breakdownRef.current, {
          backgroundColor: '#ffffff',
          scale: 2
        });
      }

      if (subBreakdownRef.current) {
        subBreakdownChartImg = await domToPng(subBreakdownRef.current, {
          backgroundColor: '#ffffff',
          scale: 2
        });
      }

      const doc = new jsPDF();
      
      // Page 1: Executive Summary
      doc.setFontSize(24);
      doc.setTextColor(0, 74, 198);
      doc.text("ISP-FinTrack Enterprise Report", 20, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`ID: RPT-${Math.random().toString(36).substring(7).toUpperCase()}`, 150, 25);
      
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 35);
      
      doc.setDrawColor(230);
      doc.line(20, 42, 190, 42);
      
      doc.setFillColor(245, 247, 251);
      doc.roundedRect(20, 50, 170, 50, 3, 3, "F");
      
      doc.setFontSize(14);
      doc.setTextColor(0, 74, 198);
      doc.text(`${reportType || "General"} Analysis Summary`, 30, 62);
      
      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Period: ${startDate} to ${endDate}`, 30, 72);
      doc.text(`Region Filter: ${region}`, 30, 80);
      doc.text(`Data Granularity: ${granularity}`, 30, 88);

      if (mainChartImg) {
        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text("Performance Trend", 20, 115);
        doc.addImage(mainChartImg, 'PNG', 20, 125, 170, 80);
      }

      if (breakdownChartImg) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(51, 65, 85);
        doc.text(chartConfig.breakdownTitle, 20, 25);
        doc.addImage(breakdownChartImg, 'PNG', 20, 40, 170, 100);
      }

      if (subBreakdownChartImg) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(51, 65, 85);
        doc.text(chartConfig.subBreakdownTitle || "Sub-Analysis", 20, 25);
        doc.addImage(subBreakdownChartImg, 'PNG', 20, 40, 170, 100);
      }
      
      // Footer on all pages logic skipped for brevity in this replace
      doc.save(`ISP_Detailed_Report_${reportType}_${Date.now()}.pdf`);
      
      setIsExporting(false);
      onClose();
    } catch (error) {
      console.error("PDF Export failed:", error);
      setIsExporting(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 md:pl-64 pt-24 bg-transparent overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">Generate New Report</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Report Generation Wizard</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stepper */}
            <div className="px-8 py-6 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between max-w-2xl mx-auto relative">
                <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 dark:bg-slate-800 -translate-y-1/2 z-0" />
                <motion.div 
                  className="absolute top-5 left-0 h-0.5 bg-blue-600 -translate-y-1/2 z-0" 
                  initial={{ width: "0%" }}
                  animate={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
                />
                
                {steps.map((s) => (
                  <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300",
                      step >= s.id 
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                      {step > s.id ? <CheckCircle2 size={18} /> : s.id}
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      step >= s.id ? "text-blue-600" : "text-slate-400"
                    )}>{s.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 min-h-[400px]">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                  >
                    {reportCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setReportType(cat.id as ReportType);
                          handleNext();
                        }}
                        className={cn(
                          "group p-6 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-[1.02]",
                          reportType === cat.id 
                            ? "border-blue-600 bg-blue-50/50 dark:bg-blue-900/10" 
                            : "border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-200 dark:hover:border-slate-700"
                        )}
                      >
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4", cat.bg)}>
                          <cat.icon className={cn("w-6 h-6", cat.color)} />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{cat.name}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{cat.desc}</p>
                      </button>
                    ))}
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="max-w-xl mx-auto w-full space-y-8"
                  >
                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Reporting Period</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative group cursor-pointer" onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement)?.showPicker()}>
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={16} />
                          <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]" 
                          />
                        </div>
                        <div className="relative group cursor-pointer" onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement)?.showPicker()}>
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" size={16} />
                          <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none cursor-pointer [color-scheme:light] dark:[color-scheme:dark]" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Regional Filter</label>
                      <select 
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none appearance-none"
                      >
                        <option>All Regions (Indonesia)</option>
                        <option>West Java</option>
                        <option>Central Java</option>
                        <option>East Java</option>
                        <option>Bali</option>
                      </select>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Data Granularity</label>
                      <div className="flex gap-2">
                        {['Daily', 'Weekly', 'Monthly'].map((g) => (
                          <button 
                            key={g} 
                            onClick={() => setGranularity(g)}
                            className={cn(
                              "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                              granularity === g 
                                ? "bg-blue-600 text-white" 
                                : "bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="max-w-4xl mx-auto w-full space-y-8"
                  >
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                      {/* Left: Summary */}
                      <div className="flex-1 space-y-6 text-center md:text-left">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto md:mx-0 text-blue-600">
                          <FileText size={32} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-2">Ready to Export</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">
                          Your <span className="text-blue-600 dark:text-blue-400 font-bold">{reportType} Analysis</span> from{" "}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>{" "}
                          to{" "}
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>{" "}
                          has been compiled.
                        </p>
                        </div>

                        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">FORMAT</span>
                            <span className="text-slate-200 font-medium">HD PDF</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">TOTAL RECORDS</span>
                            <span className="text-slate-200 font-medium">
                              {isLoading ? "..." : (chartConfig.main.length > 0 ? `${chartConfig.main.length.toLocaleString()} Entries` : "0 Items")}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">ESTIMATED SIZE</span>
                            <span className="text-slate-200 font-medium">~{chartConfig.main.length > 0 ? "3.2 MB" : "0.1 MB"}</span>
                          </div>
                          
                          {reportType === "Inventory" && (
                            <div className="pt-4 border-t border-slate-700/50">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Ringkasan Kepemilikan</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                                  <p className="text-xl font-black text-emerald-400">
                                    {reportData?.ownership?.find((o: any) => o.name === 'Dimiliki')?.value || 0}
                                  </p>
                                  <p className="text-[9px] font-bold text-emerald-500 uppercase">Dimiliki</p>
                                </div>
                                <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                                  <p className="text-xl font-black text-red-400">
                                    {reportData?.ownership?.find((o: any) => o.name === 'Telah Dijual')?.value || 0}
                                  </p>
                                  <p className="text-[9px] font-bold text-red-500 uppercase">Terjual</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Chart Preview */}
                      <div className="flex-[1.5] w-full">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Data Preview</span>
                            <div className="flex gap-1">
                              <div className="w-2 h-2 rounded-full bg-red-400" />
                              <div className="w-2 h-2 rounded-full bg-amber-400" />
                              <div className="w-2 h-2 rounded-full bg-green-400" />
                            </div>
                          </div>
                          
                          <div className="space-y-6 p-4">
                            {/* Main Performance Chart */}
                            <div ref={chartRef} className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">{chartConfig.mainTitle}</h4>
                              <div className="h-48 w-full flex items-center justify-center">
                                {isLoading ? (
                                  <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                                ) : (
                                  <ResponsiveContainer width="100%" height="100%">
                                    {chartConfig.type === 'area' ? (
                                      <AreaChart data={chartConfig.main}>
                                        <defs>
                                          <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={chartConfig.color} stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor={chartConfig.color} stopOpacity={0}/>
                                          </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="value" stroke={chartConfig.color} strokeWidth={2} fillOpacity={1} fill="url(#colorMain)" />
                                      </AreaChart>
                                    ) : (
                                      <BarChart data={chartConfig.main}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                                        <YAxis fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip />
                                        <Bar dataKey="value" fill={chartConfig.color} radius={[4, 4, 0, 0]} />
                                      </BarChart>
                                    )}
                                  </ResponsiveContainer>
                                )}
                              </div>
                            </div>

                            {/* Breakdown Chart (Province) */}
                            {!isLoading && chartConfig.breakdown.length > 0 && (
                              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                                <h4 className="text-slate-200 font-medium mb-6">{chartConfig.breakdownTitle}</h4>
                                <div ref={breakdownRef} className="h-[300px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart 
                                      data={chartConfig.breakdown} 
                                      layout="vertical" 
                                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} strokeOpacity={0.1} />
                                      <XAxis 
                                        type="number" 
                                        stroke="#94a3b8" 
                                        fontSize={10} 
                                        tickFormatter={(val) => reportType === 'Revenue' ? `Rp ${(val/1000).toLocaleString()}k` : val.toLocaleString()} 
                                      />
                                      <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        stroke="#94a3b8" 
                                        width={140}
                                        fontSize={11} 
                                        interval={0} 
                                      />
                                      <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: any) => [
                                          reportType === 'Revenue' ? `Rp ${Number(value || 0).toLocaleString()}` : Number(value || 0).toLocaleString(), 
                                          reportType === 'Revenue' ? 'Revenue' : 'Quantity'
                                        ]}
                                      />
                                      <ReferenceLine x={0} stroke="#64748b" strokeWidth={2} />
                                      <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
                                        {chartConfig.breakdown.map((entry: any, index: number) => (
                                          <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.value >= 0 ? '#10b981' : '#f43f5e'} 
                                            fillOpacity={0.9}
                                          />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}

                            {/* Sub-Breakdown Chart (Site/Regency / Condition) */}
                            {!isLoading && chartConfig.subBreakdown && chartConfig.subBreakdown.length > 0 && (
                              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                                <h4 className="text-slate-200 font-medium mb-6">{chartConfig.subBreakdownTitle}</h4>
                                <div ref={subBreakdownRef} className="h-[300px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartConfig.subBreakdown} layout="vertical" margin={{ left: 20, right: 20 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} strokeOpacity={0.1} />
                                      <XAxis 
                                        type="number" 
                                        stroke="#94a3b8" 
                                        fontSize={10} 
                                        tickFormatter={(val) => reportType === 'Revenue' ? `Rp ${(val/1000).toLocaleString()}k` : val.toLocaleString()} 
                                      />
                                      <YAxis dataKey="name" type="category" stroke="#94a3b8" width={120} fontSize={11} interval={0} />
                                      <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f1f5f9' }}
                                        formatter={(value: any) => [
                                          reportType === 'Revenue' ? `Rp ${Number(value || 0).toLocaleString()}` : Number(value || 0).toLocaleString(), 
                                          reportType === 'Revenue' ? 'Amount' : 'Quantity'
                                        ]}
                                      />
                                      <ReferenceLine x={0} stroke="#64748b" strokeWidth={2} />
                                      <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                                        {chartConfig.subBreakdown.map((entry: any, index: number) => (
                                          <Cell 
                                            key={`cell-${index}`} 
                                            fill={reportType === 'Revenue' ? (entry.value >= 0 ? '#10b981' : '#f43f5e') : '#f59e0b'} 
                                            fillOpacity={0.8}
                                          />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}

                            {/* Ownership Distribution (Inventory Specific) */}
                            {!isLoading && reportType === "Inventory" && chartConfig.ownership && chartConfig.ownership.length > 0 && (
                              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                                <h4 className="text-slate-200 font-medium mb-6">{chartConfig.ownershipTitle}</h4>
                                <div className="h-[300px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={chartConfig.ownership}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                      >
                                        {chartConfig.ownership.map((entry: any, index: number) => (
                                          <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#6366f1'} />
                                        ))}
                                      </Pie>
                                      <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#f1f5f9' }}
                                      />
                                      <Legend />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-3 italic text-center">
                          * Preview uses current real-time node snapshots.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={handleBack}
                disabled={step === 1}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                  step === 1 
                    ? "opacity-0 pointer-events-none" 
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <ChevronLeft size={18} />
                Previous Step
              </button>

              {step < 3 ? (
                <button
                  onClick={handleNext}
                  disabled={step === 1 && !reportType}
                  className={cn(
                    "flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                  )}
                >
                  Next Step
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Download Report
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

const SettingsIcon = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
