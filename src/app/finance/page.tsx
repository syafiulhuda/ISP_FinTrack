"use client";

import { useState, useEffect, useRef } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { 
  CloudUpload, 
  ZoomIn, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  QrCode,
  Building2,
  ChevronRight,
  ChevronLeft,
  X,
  Search,
  Filter as FilterIcon
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions, getOcrData, updateOcrData, postOcrEntry } from "@/actions/db";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function FinancePage() {
  const { data: transactions = [], isLoading: loadingTx } = useQuery({ 
    queryKey: ['transactions'], 
    queryFn: getTransactions,
    refetchInterval: 60000 
  });
  const { data: ocrData, isLoading: loadingOcr } = useQuery({ queryKey: ['ocrData'], queryFn: getOcrData });

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedKeterangan, setSelectedKeterangan] = useState("All");
  const itemsPerPage = 5;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [isZoomed, setIsZoomed] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Form States
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState("Bank Transfer");

  // Sync state with ocrData when loaded
  useEffect(() => {
    if (ocrData) {
      setVendor(ocrData.vendor || "");
      setDate(ocrData.date || "");
      setAmount(ocrData.amount || "");
      setReference(ocrData.reference || "");
    }
  }, [ocrData]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    e.preventDefault();
    let files: FileList | null = null;
    
    if ('dataTransfer' in e) {
      files = e.dataTransfer.files;
    } else if (e.target instanceof HTMLInputElement) {
      files = e.target.files;
    }

    if (files && files[0]) {
      toast.success("File uploaded successfully! Starting AI analysis...");
      // Mock AI processing delay
      setTimeout(() => {
        toast.info("AI Analysis complete. Please verify the extracted data.");
      }, 2000);
    }
  };

  const handleSave = async () => {
    if (!ocrData?.id) return;
    const res = await updateOcrData(ocrData.id, { vendor, date, amount, reference });
    if (res) {
      toast.success("OCR data updated successfully");
      setIsEditing(false);
    } else {
      toast.error("Failed to update OCR data");
    }
  };

  const handlePost = async () => {
    if (!ocrData?.id) return;
    setIsPosting(true);
    const res = await postOcrEntry(ocrData.id, { vendor, amount, date, reference, method });
    if (res.success) {
      toast.success(`Transaction ${res.trxId} posted successfully!`);
    } else {
      toast.error("Failed to post transaction");
    }
    setIsPosting(false);
  };

  const filteredByKeterangan = transactions.filter(trx => {
    if (selectedKeterangan === "All") return true;
    return trx.keterangan?.toLowerCase() === selectedKeterangan.toLowerCase();
  });

  const totalPages = Math.ceil(filteredByKeterangan.length / itemsPerPage);
  const paginatedTransactions = filteredByKeterangan.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  const filteredTransactions = filteredByKeterangan.filter(trx => 
    (trx.id?.toLowerCase() || "").includes(modalSearch.toLowerCase()) ||
    (trx.method?.toLowerCase() || "").includes(modalSearch.toLowerCase()) ||
    (trx.status?.toLowerCase() || "").includes(modalSearch.toLowerCase())
  );

  if (loadingTx || loadingOcr || !ocrData) {
    return <div className="h-full w-full flex items-center justify-center"><div className="animate-pulse flex flex-col items-center gap-4"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div><p className="text-slate-500 font-medium">Loading Finance Data...</p></div></div>;
  }

  return (
    <div className="space-y-10">
      {/* Header & Drop Zone */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1">
          <h1 className="text-6xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100 mb-2">Receipt OCR</h1>
          <p className="text-xl font-medium text-slate-500 max-w-2xl">Upload and verify financial documents for automated ledger entry.</p>
        </div>
        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileUpload}
          className="w-full lg:w-1/3 bg-slate-100 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors group"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept="image/*"
          />
          <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
            <CloudUpload size={24} className="text-primary group-hover:text-white" />
          </div>
          <span className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">Drag & drop slip here</span>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">or click to browse</span>
        </div>
      </div>

      {/* Verification Mode Split View */}
      <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Left: Uploaded Slip Image */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-8 flex flex-col h-[650px] relative overflow-hidden shadow-sm border border-slate-200/50 dark:border-slate-800">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Source Document</h2>
              <div 
                onClick={() => setIsZoomed(true)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 cursor-pointer hover:bg-slate-200 transition-colors"
              >
                <ZoomIn size={14} />
                Zoom
              </div>
            </div>
            <div 
              onClick={() => setIsZoomed(true)}
              className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden relative group border border-slate-200/50 dark:border-slate-700 cursor-zoom-in"
            >
              <img 
                alt="Receipt Source" 
                className="w-full h-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" 
                src={ocrData.image}
              />
              {/* OCR Highlight Overlays */}
              <div className="absolute top-[20%] left-[10%] w-[40%] h-[5%] border-2 border-primary bg-primary/10 rounded animate-pulse"></div>
              <div className="absolute top-[35%] left-[10%] w-[25%] h-[5%] border-2 border-primary bg-primary/10 rounded animate-pulse delay-75"></div>
              <div className="absolute top-[50%] left-[60%] w-[30%] h-[8%] border-2 border-orange-500 bg-orange-500/10 rounded animate-pulse delay-150"></div>
            </div>
          </div>

          {/* Right: AI Extracted Data Form */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-10 flex flex-col justify-between shadow-sm border border-slate-200/50 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Extracted Data</h2>
                <div className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-primary rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} />
                  AI Confidence: {ocrData.confidence}
                </div>
              </div>
              
              <div className="space-y-8">
                {/* Vendor Field */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vendor / Payee</label>
                  <div className="relative">
                    <input 
                      disabled={!isEditing}
                      className={cn(
                        "w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-5 py-4 border-none focus:ring-2 focus:ring-primary/20 outline-none font-semibold transition-all",
                        isEditing && "ring-2 ring-primary/40 bg-white dark:bg-slate-900"
                      )}
                      type="text" 
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                    />
                    {!isEditing && <CheckCircle2 size={20} className="absolute right-4 top-4 text-green-500" />}
                  </div>
                </div>

                {/* Date Field */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Transaction Date</label>
                  <div className="relative">
                    <input 
                      disabled={!isEditing}
                      className={cn(
                        "w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-5 py-4 border-none focus:ring-2 focus:ring-primary/20 outline-none font-semibold transition-all",
                        isEditing && "ring-2 ring-primary/40 bg-white dark:bg-slate-900"
                      )}
                      type="text" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                    {!isEditing && <CheckCircle2 size={20} className="absolute right-4 top-4 text-green-500" />}
                  </div>
                </div>

                {/* Amount Field */}
                <div className="relative space-y-2">
                  <div className="absolute -left-10 top-0 bottom-0 w-2 bg-orange-500 rounded-r-sm h-full hidden lg:block"></div>
                  <label className="block text-[11px] font-bold text-orange-600 uppercase tracking-wider">Amount</label>
                  <div className="relative">
                    <span className="absolute left-5 top-4 text-slate-400 font-bold">Rp</span>
                    <input 
                      disabled={!isEditing}
                      className={cn(
                        "w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xl rounded-xl pl-14 pr-12 py-4 border-2 border-orange-500/20 focus:ring-2 focus:ring-primary/20 outline-none font-black transition-all",
                        isEditing && "ring-2 ring-primary/40 bg-white dark:bg-slate-900"
                      )}
                      type="text" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    {!isEditing && <AlertCircle size={22} className="absolute right-4 top-4.5 text-orange-500" />}
                  </div>
                  {!isEditing && <p className="text-[11px] text-orange-600 font-bold">Low confidence read. Please verify manually.</p>}
                </div>
                
                {/* Payment Method Field */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Method</label>
                  <select 
                    disabled={!isEditing}
                    className={cn(
                      "w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-5 py-4 border-none focus:ring-2 focus:ring-primary/20 outline-none font-semibold transition-all appearance-none cursor-pointer",
                      isEditing && "ring-2 ring-primary/40 bg-white dark:bg-slate-900"
                    )}
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="QRIS Dynamic">QRIS Dynamic</option>
                    <option value="E-Wallet Payment">E-Wallet Payment</option>
                    <option value="Vendor Payment">Vendor Payment</option>
                  </select>
                </div>

                {/* Reference No Field */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reference No</label>
                  <input 
                    disabled={!isEditing}
                    className={cn(
                      "w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-5 py-4 border-none focus:ring-2 focus:ring-primary/20 outline-none font-mono font-bold transition-all",
                      isEditing && "ring-2 ring-primary/40 bg-white dark:bg-slate-900"
                    )}
                    type="text" 
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="mt-12 flex gap-4">
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "flex-1 rounded-xl py-4 text-sm font-bold transition-all",
                  isEditing 
                    ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xl" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200"
                )}
              >
                {isEditing ? "Finish Editing" : "Edit Details"}
              </button>
              <button 
                onClick={handlePost}
                disabled={isPosting}
                className={cn(
                  "flex-[2] bg-gradient-to-r from-primary to-blue-700 text-white rounded-xl py-4 text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-blue-500/25",
                  isPosting && "opacity-50 cursor-not-allowed"
                )}
              >
                {isPosting ? "Posting..." : "Confirm & Post Entry"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isZoomed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto"
            onClick={() => setIsZoomed(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 40 }}
              className="relative max-w-4xl w-full flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Integrated Close Button */}
              <button 
                className="absolute -top-4 -right-4 w-12 h-12 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-full flex items-center justify-center shadow-xl border border-slate-200 dark:border-slate-700 hover:scale-110 transition-transform z-[110]"
                onClick={() => setIsZoomed(false)}
              >
                <X size={20} />
              </button>

              <img 
                src={ocrData.image} 
                className="w-auto max-h-[75vh] object-contain rounded-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] border-4 border-white/20"
                alt="Receipt Zoom"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent Transactions Table List */}
      <div className="space-y-6 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Recent Processed Slips</h2>
            <div className="relative group">
              <select
                value={selectedKeterangan}
                onChange={(e) => {
                  setSelectedKeterangan(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none pr-10 shadow-sm"
              >
                <option value="All">Semua Transaksi</option>
                <option value="pemasukan">Income (Pemasukan)</option>
                <option value="pengeluaran">Outcome (Pengeluaran)</option>
              </select>
              <FilterIcon size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-primary text-sm font-bold hover:underline flex items-center gap-1"
          >
            View All <ChevronRight size={16} />
          </button>
        </div>
        
        <div className="space-y-3">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-8 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-2">ID</div>
            <div className="col-span-2">Method</div>
            <div className="col-span-3 text-right">Amount</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-3 text-right">Timestamp</div>
          </div>

          {/* Transaction Rows */}
          {paginatedTransactions.map((trx, index) => (
            <motion.div 
              key={`${trx.id}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className={cn(
                "grid grid-cols-12 gap-4 bg-white dark:bg-slate-900 items-center px-8 py-5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer border border-slate-200/50 dark:border-slate-800 relative overflow-hidden shadow-sm",
                trx.isWarning && "border-orange-500/20"
              )}
            >
              {trx.isWarning && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500"></div>}
              
              <div className="col-span-2 text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                {trx.id}
              </div>
              <div className="col-span-2 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  {trx.type === 'qris' ? <QrCode size={18} className="text-primary" /> : <Building2 size={18} className="text-slate-500" />}
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{trx.method}</span>
              </div>
              <div className="col-span-3 text-right text-lg font-black text-slate-900 dark:text-slate-100">
                {trx.amount}
              </div>
              <div className="col-span-2 flex justify-center">
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                  trx.status === "Verified" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                )}>
                  {trx.status}
                </div>
              </div>
              <div className="col-span-3 text-right text-sm font-medium text-slate-500">
                {typeof trx.timestamp === 'object' ? trx.timestamp.toLocaleString('id-ID') : trx.timestamp}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 pt-4">
            <p className="text-sm font-medium text-slate-500">
              Showing <span className="text-slate-900 dark:text-slate-100 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-slate-100 font-bold">{Math.min(currentPage * itemsPerPage, filteredByKeterangan.length)}</span> of <span className="text-slate-900 dark:text-slate-100 font-bold">{filteredByKeterangan.length}</span> results
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={cn(
                  "p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 transition-all",
                  currentPage === 1 
                    ? "opacity-50 cursor-not-allowed text-slate-400" 
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                )}
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center gap-1.5">
                <input 
                  type="text"
                  key={`finance-page-${currentPage}`}
                  defaultValue={currentPage}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= totalPages) setCurrentPage(val);
                    else e.target.value = String(currentPage);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                  className="w-10 h-10 text-center rounded-xl text-sm font-bold bg-primary text-white shadow-lg shadow-primary/20 border-none outline-none"
                />
                <span className="text-xs font-bold text-slate-400">/ {totalPages}</span>
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className={cn(
                  "p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 transition-all",
                  currentPage === totalPages 
                    ? "opacity-50 cursor-not-allowed text-slate-400" 
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                )}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* View All - Section Contained Slider Panel */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="absolute inset-0 z-50 flex justify-end">
              {/* Backdrop - Contained */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[4px]"
              />
              
              {/* Drawer Panel - Contained */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="relative w-full max-w-xl h-full bg-white dark:bg-slate-900 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] flex flex-col border-l border-slate-200 dark:border-slate-800"
              >
                {/* Header Section - Condensed */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Full Transaction Log</h2>
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Search ID, method..."
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {/* Condensed List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {filteredTransactions.map((trx, index) => (
                      <div 
                        key={`${trx.id}-${index}`}
                        className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                            {trx.type === 'qris' ? <QrCode size={16} /> : <Building2 size={16} />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{trx.method}</p>
                            <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">{trx.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900 dark:text-slate-100">{trx.amount}</p>
                          <p className="text-[9px] font-medium text-slate-400">{trx.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-center">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors"
                  >
                    Back to Summary
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
