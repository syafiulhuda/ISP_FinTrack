"use client";

import { useState, useEffect, useRef } from "react";

import { m, AnimatePresence } from "framer-motion";
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
  Filter as FilterIcon,
  Download
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getTransactions, getOcrData, updateOcrData, postOcrEntry, checkTrxExists } from "@/actions/transactions";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { Transaction } from "@/types";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/exportUtils";
import Tesseract from 'tesseract.js';
import { LoadingState } from "@/components/LoadingState";

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
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Form States
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState("Bank Transfer");
  const [purchaseType, setPurchaseType] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [macNumber, setMacNumber] = useState("");
  const [location, setLocation] = useState("Warehouse Main");

  // Remove auto-sync useEffect to keep form empty with placeholders initially
  // We will only fill it if the user manually triggers or edits it

  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'pemasukan' | 'pengeluaran'>('pemasukan');

  // Auto-update reference when date or transaction type changes
  useEffect(() => {
    if (!date || typeof date !== 'string') return;

    // Parse DD/MM/YYYY or any recognizable date format
    const parsedDate = (() => {
      // Handle DD/MM/YYYY or DD-MM-YYYY
      const dmy = date.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (dmy) {
        const [, d, m, y] = dmy;
        const fullYear = y.length === 2 ? `20${y}` : y;
        return new Date(`${fullYear}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
      }
      // Handle DDMMYYYY
      const dmyPlain = date.match(/^(\d{2})(\d{2})(\d{4})$/);
      if (dmyPlain) {
        const [, d, m, y] = dmyPlain;
        return new Date(`${y}-${m}-${d}`);
      }
      const attempt = new Date(date);
      return isNaN(attempt.getTime()) ? null : attempt;
    })();

    if (!parsedDate || isNaN(parsedDate.getTime())) return;

    const yyyymmdd = parsedDate.getFullYear().toString() +
      String(parsedDate.getMonth() + 1).padStart(2, '0') +
      String(parsedDate.getDate()).padStart(2, '0');

    // Only sync if the date is reasonably complete (to avoid partial sync mess)
    if (date.length < 8) return;

    if (activeTab === 'pengeluaran') {
      setReference(`OUT-AUTO-${yyyymmdd}`);
    } else {
      setReference(prev => {
        // If the user hasn't typed anything meaningful yet or it's the default
        if (!prev || prev === 'TRX-XXXXX') return `TRX-MANUAL-${yyyymmdd}`;
        
        // Split the current reference to isolate the base from any date suffix
        const parts = prev.split('-');
        
        // If it looks like a standard format (Prefix-ID-Date or Prefix-Date)
        // We want to keep the "Base" and replace/append the date
        let base = "";
        if (parts.length >= 2) {
          // If the last part is a date (8 digits), remove it to get the base
          if (parts[parts.length-1].length === 8 && /^\d+$/.test(parts[parts.length-1])) {
            base = parts.slice(0, parts.length - 1).join('-');
          } else {
            // Otherwise, the whole thing is the base
            base = prev;
          }
        } else {
          base = prev;
        }

        const newRef = `${base}-${yyyymmdd}`;
        return newRef;
      });
    }
  }, [date, activeTab]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    e.preventDefault();
    let files: FileList | null = null;
    
    if ('dataTransfer' in e) {
      files = e.dataTransfer.files;
    } else if (e.target instanceof HTMLInputElement) {
      files = e.target.files;
    }

    if (files && files[0]) {
      const file = files[0];

      // Show preview immediately
      const previewUrl = URL.createObjectURL(file);
      setUploadedImageUrl(previewUrl);

      // Clear the file input value to prevent "InvalidStateError" 
      // if React or extensions try to restore the value
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Reset form states for new analysis
      setVendor("");
      setDate("");
      setAmount("");
      setReference("");
      setMethod("Bank Transfer");

      setIsScanning(true);
      setIsEditing(true);
      toast.success("File uploaded! Starting OCR analysis...", { duration: 3000 });

      try {
        const worker = await Tesseract.createWorker('eng');
        const ret = await worker.recognize(file);
        const text = ret.data.text;
        
        console.log("[OCR Raw Text]:", text); 
        // Temporary debug toast to see what Tesseract actually sees
        toast.info("Raw OCR snippet: " + text.substring(0, 100).replace(/\n/g, ' '), { duration: 5000 });

        // --- Indonesian Invoice Format (ISP-FinTrack) - REFINED VERSION ---
        
        // 0. Detect Type (Ket)
        let isExpense = activeTab === 'pengeluaran';
        const ketMatch = text.match(/Ket\s*[:\-\;\|\!\.\s]*\s*(Invoice|Pengeluaran)/i);
        if (ketMatch) {
          const type = ketMatch[1].toLowerCase();
          if (type === 'invoice') {
            setActiveTab('pemasukan');
            isExpense = false;
          }
          else if (type === 'pengeluaran') {
            setActiveTab('pengeluaran');
            isExpense = true;
          }
        }

        // 1. Tanggal Bayar / Pengeluaran
        const tanggalMatch = text.match(/(?:Tanggal|Tgl)\s*(?:Bayar|Pengeluaran)[^\d]*([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4})/i);
        
        // 2. Nama Pelanggan / Vendor
        let detectedVendor = "";
        const namaMatch = text.match(/Nama\s*Pelanggan\s*[:\-\;\|\!\.\s]*\s*([^\n\r]+)/i);
        if (namaMatch) {
          detectedVendor = namaMatch[1].trim();
        } else {
          // Look for vendor in header (line after ISP Fintrack)
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          const fintrackIdx = lines.findIndex(l => l.toLowerCase().includes('isp fintrack'));
          if (fintrackIdx !== -1 && lines[fintrackIdx + 1]) {
            detectedVendor = lines[fintrackIdx + 1];
          }
        }
        
        // 3. ID Pelanggan (Reference)
        // If expense, we use incremental ID from DB
        const idMatch = text.match(/(?:ID|1D|Id|lD)(?:\s*Pelanggan)?\s*[:\-\;\|\!\.\s]*\s*([A-Z]*\d+[A-Z0-9]*)/i);
        
        // 4. Pembayaran Via (Method)
        const metodePembayaranMatch = text.match(/Pembayaran\s*(?:Via|Melalui|Vla|Lewat)[^\s]*\s*[:\-\;\|\!\.\s]*\s*([^\n\r]+)/i);
        
        // 5. Nominal (Amount)
        const nominalMatch = text.match(/Nomin[^\d]*(\d[\d\.,]*)/i);

        // --- Fallbacks ---
        const amountFallback = text.match(/\b(?:Rp|IDR|Total|Amount|Amt)\b\s*[:\-\;\|\!.]?\s*([\d\.,]+)/i);
        const dateFallback   = text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
        const refFallback    = text.match(/\b(?:TRX|Ref|Reff|Reference)\b\s*[:\-\;\|\!#]?\s*([A-Za-z0-9\-]{5,})/i);
        const custIdPattern  = text.match(/\b([A-Z]{1,3}\d{1,4})\b/i);

        // Apply
        let finalDate = "";
        if (tanggalMatch) {
          finalDate = tanggalMatch[1];
        } else if (dateFallback) {
          finalDate = dateFallback[0];
        }

        // Format Date Suffix (YYYYMMDD)
        let dateSuffix = "";
        let rawDateSuffix = "";
        if (finalDate) {
          const dParts = finalDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
          if (dParts) {
            const day = dParts[1].padStart(2, '0');
            const month = dParts[2].padStart(2, '0');
            let year = dParts[3];
            if (year.length === 2) year = "20" + year;
            dateSuffix = `-${year}${month}${day}`;
            rawDateSuffix = `${year}${month}${day}`;
          }
        }

        // 6. Expense Specific Fields (Jenis Pembelian & SN)
        const jenisMatch = text.match(/Jenis\s*Pembelian\s*[:\-\;\|\!\.\s]*\s*([^\n\r]+)/i);
        const snMatch = text.match(/Serial\s*Number\s*[:\-\;\|\!\.\s]*\s*([^\n\r]+)/i);
        const macMatch = text.match(/MAC\s*Number\s*[:\-\;\|\!\.\s]*\s*([^\n\r]+)/i);
        const locMatch = text.match(/Location\s*[:\-\;\|\!\.\s]*\s*([^\n\r]+)/i);

        const extractedConfidence = ret.data.confidence.toFixed(0) + "%";

        // Capture values into variables for immediate DB save (since state updates are async)
        const finalVendor = detectedVendor || "";
        const finalAmountVal = (nominalMatch ? nominalMatch[1].replace(/[^0-9]/g, '') : (amountFallback ? amountFallback[1].replace(/[^0-9]/g, '') : "0"));
        
        let finalReference = "";
        if (isExpense) {
          finalReference = `OUT-AUTO-${rawDateSuffix}`;
        } else {
          if (idMatch) finalReference = `TRX-${idMatch[1].trim().toUpperCase()}${dateSuffix}`;
          else if (custIdPattern) finalReference = `TRX-${custIdPattern[1].toUpperCase()}${dateSuffix}`;
          else if (refFallback) {
            const ref = refFallback[1].toUpperCase();
            const baseRef = ref.startsWith('TRX-') ? ref : `TRX-${ref}`;
            finalReference = `${baseRef}${dateSuffix}`;
          }
        }

        // Apply to state for UI
        setVendor(finalVendor);
        setAmount(finalAmountVal);
        setReference(finalReference);
        if (finalDate) setDate(finalDate);

        if (jenisMatch) setPurchaseType(jenisMatch[1].trim());
        if (snMatch) setSerialNumber(snMatch[1].trim());
        if (macMatch) setMacNumber(macMatch[1].trim());
        if (locMatch) setLocation(locMatch[1].trim());

        await worker.terminate();

        // PERSIST TO DB IMMEDIATELY WITH INPUTTER
        if (ocrData?.id) {
          await updateOcrData(ocrData.id, {
            vendor: finalVendor,
            amount: finalAmountVal,
            date: finalDate || date,
            reference: finalReference,
            confidence: extractedConfidence
          });
        }

        toast.success("OCR complete. Data saved and verified!");
      } catch (err) {
        console.error(err);
        toast.error("OCR failed. Please enter data manually.");
      } finally {
        setIsScanning(false);
      }
    }
  };

  const handleSave = async () => {
    if (!ocrData?.id) return;
    const res = await updateOcrData(ocrData.id, { vendor, date, amount, reference });
    if (res) {
      setIsEditing(false);
    } else {
      toast.error("Failed to update OCR data");
    }
  };

  // Saves OCR data AND posts the transaction in one go
  const handleSaveAndPost = async (force: boolean = false) => {
    if (!amount || Number(amount.replace(/[^0-9.-]+/g, '')) === 0) {
      toast.error("Please enter a valid amount before posting.");
      return;
    }
    // Save OCR data first (silently)
    if (ocrData?.id) {
      await updateOcrData(ocrData.id, { vendor, date, amount, reference });
    }
    setIsEditing(false);
    // Then post the transaction
    await handlePost(force);
  };

  const handlePost = async (force: boolean = false) => {
    if (!ocrData?.id) return;
    
    // Check for duplicates first if not forcing
    if (!force) {
      const exists = await checkTrxExists(reference);
      if (exists) {
        setShowDuplicateWarning(true);
        return;
      }
    }

    setIsPosting(true);
    const res = await postOcrEntry(ocrData.id, { 
      vendor, 
      amount, 
      date, 
      reference, 
      method, 
      keterangan: activeTab,
      purchaseType,
      serialNumber,
      macNumber,
      location
    });
    if (res?.success) {
      toast.success(`Transaction ${res.trxId} posted successfully!`);
      setShowDuplicateWarning(false);
    } else {
      toast.error(res?.error || "Failed to post transaction");
    }
    setIsPosting(false);
  };

  const handleCancel = () => {
    if (ocrData) {
      setVendor(ocrData.vendor || "");
      setDate(ocrData.date || "");
      setAmount(ocrData.amount || "");
      setReference(ocrData.reference || "");
    }
    setUploadedImageUrl(null);
    setIsEditing(false);
  };

  const filteredByKeterangan = transactions.filter(trx => {
    if (selectedKeterangan === "All") return true;
    return trx.keterangan?.toLowerCase() === selectedKeterangan.toLowerCase();
  }).sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

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
    return <LoadingState message="Menganalisis data keuangan..." />;
  }

  return (
    <div className="space-y-10">
      {/* Header & Drop Zone */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100 mb-2">Receipt OCR</h1>
          <p className="text-xl font-medium text-slate-500 max-w-2xl">Upload and verify financial documents for automated ledger entry.</p>
        </div>
        <div className="flex-1 flex flex-row gap-2 md:gap-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileUpload}
            className="flex-1 bg-slate-100 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 border-dashed rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors group"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*"
            />
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center mb-2 md:mb-3 group-hover:bg-primary group-hover:text-white transition-colors shadow-sm shrink-0">
              <CloudUpload size={18} className="md:w-[20px] md:h-[20px] text-primary group-hover:text-white" />
            </div>
            <span className="text-[11px] md:text-sm font-semibold text-slate-900 dark:text-slate-100">Drag & drop slip here</span>
          </div>
          
          <button 
            onClick={() => {
              setVendor("");
              setDate("");
              setAmount("");
              setReference("TRX-XXXXX");
              setUploadedImageUrl(null);
              setIsEditing(true);
            }}
            className="flex-1 px-4 md:px-8 py-4 md:py-6 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all group"
          >
            <Sparkles size={20} className="md:w-[24px] md:h-[24px] text-blue-500 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-500 text-center">Input Manual</span>
          </button>
        </div>
      </div>

      {/* Verification Mode Split View */}
      <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Left: Uploaded Slip Image */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-8 flex flex-col relative overflow-hidden shadow-sm border border-slate-200/50 dark:border-slate-800">
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
              className="min-h-[450px] flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl overflow-hidden relative group border border-slate-200/50 dark:border-slate-700 cursor-zoom-in flex items-center justify-center"
            >
              <img 
                alt="Receipt Source" 
                className="w-full h-full object-contain opacity-90 transition-transform duration-500 group-hover:scale-105" 
                src={uploadedImageUrl || 'https://plus.unsplash.com/premium_photo-1679923814036-8febf10a04c0?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'}
              />
              {/* Scanning overlay */}
              {isScanning && (
                <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-white text-xs font-black uppercase tracking-widest">Scanning...</p>
                </div>
              )}
              {/* OCR Highlight Overlays removed as requested */}
              {!isScanning && uploadedImageUrl && (
                <>
                </>
              )}
            </div>
          </div>

          {/* Right: AI Extracted Data Form */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 md:p-10 flex flex-col justify-between shadow-sm border border-slate-200/50 dark:border-slate-800">
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">Extracted Data</h2>
                <div className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-primary rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} />
                  AI Confidence: {ocrData.confidence}
                </div>
              </div>

              {/* Income / Expense Tabs */}
              <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl md:p-1.5 md:rounded-2xl mb-8 md:mb-10 relative">
                <m.div 
                  className={cn(
                    "absolute h-[calc(100%-12px)] top-1.5 rounded-xl shadow-sm z-0",
                    activeTab === 'pemasukan' ? "bg-primary" : "bg-orange-500"
                  )}
                  animate={{ 
                    x: activeTab === 'pemasukan' ? 0 : '100%',
                    width: '50%'
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
                <button 
                  onClick={() => setActiveTab('pemasukan')}
                  className={cn(
                    "flex-1 py-1.5 md:py-2 flex flex-col items-center justify-center gap-0.5 text-[8px] sm:text-[10px] font-black uppercase tracking-wider md:tracking-widest relative z-10 transition-colors duration-300",
                    activeTab === 'pemasukan' ? "text-white" : "text-slate-400"
                  )}
                >
                  <span>Income</span>
                  <span className="opacity-70">(Pemasukan)</span>
                </button>
                <button 
                  onClick={() => setActiveTab('pengeluaran')}
                  className={cn(
                    "flex-1 py-1.5 md:py-2 flex flex-col items-center justify-center gap-0.5 text-[8px] sm:text-[10px] font-black uppercase tracking-wider md:tracking-widest relative z-10 transition-colors duration-300",
                    activeTab === 'pengeluaran' ? "text-white" : "text-slate-400"
                  )}
                >
                  <span>Expense</span>
                  <span className="opacity-70">(Pengeluaran)</span>
                </button>
              </div>
              
              <div className="space-y-8">
                {/* Vendor Field */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vendor / Payee</label>
                  <div className="relative">
                    <input 
                      disabled={!isEditing && uploadedImageUrl !== null}
                      className={cn(
                        "w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-5 py-4 border-none focus:ring-2 focus:ring-primary/20 outline-none font-semibold transition-all",
                        (isEditing || uploadedImageUrl === null) && "ring-2 ring-primary/40 bg-white dark:bg-slate-900"
                      )}
                      placeholder="e.g. PT Mega Indah"
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
                      disabled={!isEditing && uploadedImageUrl !== null}
                      className={cn(
                        "w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-5 py-4 border-none focus:ring-2 focus:ring-primary/20 outline-none font-semibold transition-all",
                        (isEditing || uploadedImageUrl === null) && "ring-2 ring-primary/40 bg-white dark:bg-slate-900"
                      )}
                      placeholder="DD/MM/YYYY"
                      type="text" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                    {!isEditing && <CheckCircle2 size={20} className="absolute right-4 top-4 text-green-500" />}
                  </div>
                </div>

                {/* Amount Field */}
                <div className="relative space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount</label>
                  <div className="relative">
                    <span className="absolute left-5 top-4 text-slate-400 font-bold">Rp</span>
                    <input 
                      disabled={!isEditing && uploadedImageUrl !== null}
                      placeholder="0"
                      className={cn(
                        "w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-xl rounded-xl pl-14 pr-12 py-4 border-none focus:ring-2 focus:ring-primary/20 outline-none font-black transition-all",
                        (isEditing || uploadedImageUrl === null) && "ring-2 ring-primary/40 bg-white dark:bg-slate-900"
                      )}
                      type="text" 
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    {!isEditing && <CheckCircle2 size={20} className="absolute right-4 top-4 text-green-500" />}
                  </div>
                </div>
                
                {/* Payment Method Field */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Payment Method</label>
                  <select 
                    disabled={!isEditing && uploadedImageUrl !== null}
                    className={cn(
                      "w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-5 py-4 border-none focus:ring-2 focus:ring-primary/20 outline-none font-semibold transition-all appearance-none cursor-pointer",
                      (isEditing || uploadedImageUrl === null) && "ring-2 ring-primary/40 bg-white dark:bg-slate-900"
                    )}
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash / Tunai</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                    <option value="QRIS Dynamic">QRIS Dynamic</option>
                    <option value="E-Wallet Payment">E-Wallet Payment</option>
                    <option value="Vendor Payment">Vendor Payment</option>
                  </select>
                </div>

                {/* Reference No Field - Read Only because it's generated from DB logic */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reference No</label>
                  <input 
                    disabled={!isEditing && uploadedImageUrl !== null}
                    placeholder="TRX-XXXXX"
                    className={cn(
                      "w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-5 py-4 border-none outline-none font-mono font-bold transition-all",
                      (!isEditing && uploadedImageUrl !== null) && "text-slate-400 dark:text-slate-500 cursor-not-allowed",
                      (isEditing || uploadedImageUrl === null) && "ring-2 ring-primary/40 bg-white dark:bg-slate-900"
                    )}
                    type="text" 
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 font-medium px-1">Auto-generated based on system sequence.</p>
                </div>
              </div>
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
                className={cn(
                  "w-full sm:flex-1 rounded-xl py-4 px-4 text-sm font-bold transition-all",
                  isEditing 
                    ? "bg-red-500 text-white shadow-xl hover:bg-red-600" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200"
                )}
              >
                {isEditing ? "Cancel" : "Edit Details"}
              </button>
              <button 
                onClick={() => isEditing ? handleSaveAndPost() : handlePost()}
                disabled={isPosting}
                className={cn(
                  "w-full sm:flex-[2] text-white rounded-xl py-4 px-4 text-sm font-bold transition-all shadow-lg",
                  isEditing 
                    ? "bg-green-500 hover:bg-green-600 shadow-green-500/20" 
                    : "bg-gradient-to-r from-primary to-blue-700 hover:opacity-90 shadow-blue-500/25",
                  isPosting && "opacity-50 cursor-not-allowed"
                )}
              >
                {isPosting ? "Processing..." : (isEditing ? "Save & Post Entry ✓" : "Confirm & Post Entry")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isZoomed && (
          <m.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto"
            onClick={() => setIsZoomed(false)}
          >
            <m.div
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
                src={uploadedImageUrl || 'https://plus.unsplash.com/premium_photo-1679923814036-8febf10a04c0?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'} 
                className="w-auto max-h-[75vh] object-contain rounded-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] border-4 border-white/20"
                alt="Receipt Zoom"
              />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Recent Transactions Table List */}
      <div className="space-y-6 relative overflow-hidden">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">Recent Processed Slips</h2>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 md:gap-6 w-full md:w-auto">
              <div className="relative shrink-0 flex-1 sm:flex-none min-w-[140px]">
                <select
                  value={selectedKeterangan}
                  onChange={(e) => {
                    setSelectedKeterangan(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-3 pr-10 md:px-5 py-2.5 md:py-2 text-[11px] md:text-xs font-bold text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none shadow-sm"
                >
                  <option value="All">Semua Transaksi</option>
                  <option value="pemasukan">Income (Pemasukan)</option>
                  <option value="pengeluaran">Outcome (Pengeluaran)</option>
                </select>
                <FilterIcon size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              
              <button 
                onClick={() => exportToExcel(filteredByKeterangan, 'finance_report.xlsx')}
                className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-2.5 md:p-2.5 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 transition-all flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 shadow-sm border border-slate-200/50 dark:border-slate-800 shrink-0 flex-1 sm:flex-none"
                title="Export to Excel"
              >
                <Download size={14} className="md:w-[18px] md:h-[18px]" />
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Export Excel</span>
              </button>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="text-primary text-[11px] md:text-sm font-bold hover:underline flex items-center gap-1 shrink-0 whitespace-nowrap"
            >
              View All <ChevronRight size={14} className="md:w-[16px] md:h-[16px]" />
            </button>
          </div>
        </div>
        
        <div id="finance-table" className="space-y-3 bg-slate-50 dark:bg-slate-950 p-2 md:p-4 rounded-2xl w-full overflow-hidden">
          {/* Table Header (Hidden on Mobile) */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-8 py-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 dark:border-slate-800 mb-1">
            <div className="col-span-1">LNK-ID</div>
            <div className="col-span-2">TRX-ID</div>
            <div className="col-span-2">Method</div>
            <div className="col-span-1 text-center">Type</div>
            <div className="col-span-1 text-center">City</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1 text-center">Status</div>
            <div className="col-span-2 text-right">Timestamp</div>
          </div>

          {/* Transaction Rows */}
          {paginatedTransactions.map((trx, index) => (
            <m.div 
              key={`${trx.id}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className={cn(
                "flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 bg-white dark:bg-slate-900 md:items-center px-4 md:px-8 py-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer border border-slate-200/50 dark:border-slate-800 relative overflow-hidden shadow-sm",
                trx.isWarning && "border-orange-500/20"
              )}
            >
              {trx.isWarning && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
              
              {/* --- MOBILE VIEW (Card Layout) --- */}
              <div className="flex flex-col md:hidden w-full gap-3">
                {/* Header: ID & Status */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[12px] font-mono font-bold text-slate-900 dark:text-slate-100">{trx.id}</p>
                    <p className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">LNK: {trx.linked_id || "-"}</p>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0",
                    trx.status === "Verified" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                  )}>
                    {trx.status}
                  </div>
                </div>

                {/* Details Group Box */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg mt-1">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block uppercase mb-0.5">Method</span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{trx.method}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase mb-0.5">Type</span>
                    <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                      {trx.type}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block uppercase mb-0.5">City</span>
                    <span className="text-[11px] font-medium text-slate-500 truncate block">{trx.city || "-"}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase mb-0.5">Amount</span>
                    <span className="text-base font-black text-slate-900 dark:text-slate-100">
                      {String(trx.amount).startsWith('Rp') ? trx.amount : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(String(trx.amount).replace(/[^0-9]/g, '')))}
                    </span>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-1">
                  <span className="text-[10px] font-medium text-slate-400 font-mono">
                    {typeof trx.timestamp === 'object' ? trx.timestamp.toLocaleString('id-ID') : trx.timestamp}
                  </span>
                </div>
              </div>

              {/* --- DESKTOP VIEW (Grid Layout) --- */}
              <div className="hidden md:block col-span-1 text-[10px] font-mono font-bold text-slate-400">
                {trx.linked_id || "-"}
              </div>
              <div className="hidden md:block col-span-2 text-[11px] font-mono font-bold text-slate-900 dark:text-slate-100 truncate">
                {trx.id}
              </div>
              <div className="hidden md:block col-span-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                {trx.method}
              </div>
              <div className="hidden md:block col-span-1 text-center">
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                  {trx.type}
                </span>
              </div>
              <div className="hidden md:block col-span-1 text-center text-[10px] font-medium text-slate-500 truncate">
                {trx.city || "-"}
              </div>
              <div className="hidden md:block col-span-2 text-right text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                {trx.amount}
              </div>
              <div className="hidden md:flex col-span-1 justify-center">
                <div className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                  trx.status === "Verified" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                )}>
                  {trx.status}
                </div>
              </div>
              <div className="hidden md:block col-span-2 text-right text-[11px] font-medium text-slate-500 font-mono truncate">
                {typeof trx.timestamp === 'object' ? trx.timestamp.toLocaleString('id-ID') : trx.timestamp}
              </div>
            </m.div>
          ))}
        </div>

        {/* Pagination Controls */}
        {filteredByKeterangan.length > 0 && (
          <div className="p-4 sm:p-6 lg:p-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30 dark:bg-white/5">
            <p className="text-xs font-bold text-slate-400 text-center sm:text-left">
              Showing <span className="text-slate-900 dark:text-white">{(currentPage-1)*itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(currentPage*itemsPerPage, filteredByKeterangan.length)}</span> of <span className="text-slate-900 dark:text-white">{filteredByKeterangan.length}</span> results
            </p>
            <div className="flex flex-wrap justify-center items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300"
              >
                Previous
              </button>
              <div className="flex flex-wrap justify-center items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum = currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i);
                  if (pageNum <= 0 || pageNum > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                        currentPage === pageNum ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-300"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* View All - Section Contained Slider Panel */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="absolute inset-0 z-50 flex justify-end">
              {/* Backdrop - Contained */}
              <m.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[4px]"
              />
              
              {/* Drawer Panel - Contained */}
              <m.div
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
                          <p className="text-[9px] font-medium text-slate-400">
                            {typeof trx.timestamp === 'object' && trx.timestamp !== null ? (trx.timestamp as Date).toLocaleString('id-ID') : trx.timestamp}
                          </p>
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
              </m.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showDuplicateWarning && (
          <m.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none"
          >
            <m.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-12 max-w-md w-full shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-slate-800 text-center relative overflow-hidden pointer-events-auto"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-orange-500"></div>
              <div className="w-16 h-16 bg-orange-50 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-12">
                <AlertCircle size={32} className="text-orange-500 -rotate-12" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-3 tracking-tight">DUPLICATE DETECTED</h3>
              <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed px-4">
                Reference <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{reference}</span> is already in use. Please verify to avoid double bookkeeping.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handlePost(true)}
                  className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl py-4 text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                >
                  Post Anyway
                </button>
                <button 
                  onClick={() => setShowDuplicateWarning(false)}
                  className="w-full bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl py-4 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                >
                  Edit Reference
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
