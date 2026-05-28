"use client";

import { useState, useEffect, useRef } from"react";
import Image from"next/image";

import { m, AnimatePresence } from"framer-motion";
import {
 CloudUpload,
 ZoomIn,
 Sparkles,
 CheckCircle2,
 AlertCircle,
 QrCode,
 Building2,
 ChevronRight,
 ChevronDown,
 X,
 Search,
 Filter as FilterIcon,
 Download
} from"lucide-react";
import { useQuery } from"@tanstack/react-query";
import { getTransactions, getOcrData, updateOcrData, postOcrEntry, checkTrxExists } from"@/actions/transactions";
import { getAdminProfile } from"@/actions/admin";
import { cn, formatCurrency, formatNumber } from"@/lib/utils";
import { Transaction } from"@/types";
import { toast } from"sonner";
import { exportToExcel } from"@/lib/exportUtils";
import Tesseract from'tesseract.js';
import { LoadingState } from"@/components/LoadingState";

const SKELETON_ROWS = Array.from({ length: 5 });

export default function FinancePage() {
 const { data: transactions = [], isLoading: loadingTx } = useQuery({
 queryKey: ['transactions'],
 queryFn: () => getTransactions(),
 refetchInterval: 60000
 });
 const { data: ocrData, isLoading: loadingOcr } = useQuery({ queryKey: ['ocrData'], queryFn: getOcrData });

 const { data: profile } = useQuery({
 queryKey: ['adminProfile'],
 queryFn: getAdminProfile
 });
 const isTimLapangan = profile?.role ==='Tim Lapangan'|| profile?.role ==='Pekerja';

 const [currentPage, setCurrentPage] = useState(1);
 const [selectedKeterangan, setSelectedKeterangan] = useState("All");
 const itemsPerPage = 5;
 const [expandedTransactions, setExpandedTransactions] = useState<Record<string, boolean>>({});

 const toggleTransactionExpand = (transactionId: string) => {
 setExpandedTransactions(prev => ({
 ...prev,
 [transactionId]: !prev[transactionId]
 }));
 };

 const formatTimestamp = (ts: any) => {
 if (!ts) return"-";
 const str = ts instanceof Date ? ts.toISOString() : String(ts);
 if (str.includes('T')) {
 return str.substring(0, 19).replace('T','');
 }
 return str;
 };

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
 const [confidence, setConfidence] = useState("");

 // Remove auto-sync useEffect to keep form empty with placeholders initially
 // We will only fill it if the user manually triggers or edits it

 const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
 const isInitialState = !isEditing && uploadedImageUrl === null;
 const [isScanning, setIsScanning] = useState(false);
 const [activeTab, setActiveTab] = useState<'pemasukan'|'pengeluaran'>('pemasukan');

 // Auto-update reference when date or transaction type changes
 useEffect(() => {
 if (!date || typeof date !=='string') return;

 // Parse DD/MM/YYYY or any recognizable date format
 const parsedDate = (() => {
 // Handle DD/MM/YYYY or DD-MM-YYYY
 const dmy = date.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
 if (dmy) {
 const [, d, m, y] = dmy;
 const fullYear = y.length === 2 ?`20${y}`: y;
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
 String(parsedDate.getMonth() + 1).padStart(2,'0') +
 String(parsedDate.getDate()).padStart(2,'0');

 // Only sync if the date is reasonably complete (to avoid partial sync mess)
 if (date.length < 8) return;

 if (activeTab ==='pengeluaran') {
 setReference(`OUT-AUTO-${yyyymmdd}`);
 } else {
 setReference(prev => {
 // If the user hasn't typed anything meaningful yet or it's the default
 if (!prev || prev ==='TRX-XXXXX') return`TRX-MANUAL-${yyyymmdd}`;

 // Split the current reference to isolate the base from any date suffix
 const parts = prev.split('-');

 // If it looks like a standard format (Prefix-ID-Date or Prefix-Date)
 // We want to keep the"Base"and replace/append the date
 let base ="";
 if (parts.length >= 2) {
 // If the last part is a date (8 digits), remove it to get the base
 if (parts[parts.length - 1].length === 8 && /^\d+$/.test(parts[parts.length - 1])) {
 base = parts.slice(0, parts.length - 1).join('-');
 } else {
 // Otherwise, the whole thing is the base
 base = prev;
 }
 } else {
 base = prev;
 }

 const newRef =`${base}-${yyyymmdd}`;
 return newRef;
 });
 }
 }, [date, activeTab]);

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
 e.preventDefault();
 let files: FileList | null = null;

 if ('dataTransfer'in e) {
 files = e.dataTransfer.files;
 } else if (e.target instanceof HTMLInputElement) {
 files = e.target.files;
 }

 if (files && files[0]) {
 const file = files[0];

 // Show preview immediately
 const previewUrl = URL.createObjectURL(file);
 setUploadedImageUrl(previewUrl);



 // Reset form states for new analysis
 setVendor("");
 setDate("");
 setAmount("");
 setReference("");
 setMethod("Bank Transfer");
 setConfidence("");

 setIsScanning(true);
 setIsEditing(true);
 toast.success("File uploaded! Starting OCR analysis...", { duration: 3000 });

 try {
 console.log("Starting OCR with Tesseract CDN...");
 const worker = await Tesseract.createWorker('eng', 1, {
 logger: m => console.log("OCR:", m),
 });
 const ret = await worker.recognize(file);
 const text = ret.data.text;

 if (process.env.NODE_ENV ==='development') console.log("[OCR Raw Text]:", text);
 // Temporary debug toast to see what Tesseract actually sees
 toast.info("Raw OCR snippet:"+ text.substring(0, 100).replace(/\n/g,''), { duration: 5000 });

 // --- Indonesian Invoice Format (ISP-FinTrack) - REFINED VERSION ---

 // 0. Detect Type (Ket)
 let isExpense = activeTab ==='pengeluaran';
 const ketMatch = text.match(/Ket\s*[:\-\;\|\!\.\s]*\s*(Invoice|Pengeluaran)/i);
 if (ketMatch) {
 const type = ketMatch[1].toLowerCase();
 if (type ==='invoice') {
 setActiveTab('pemasukan');
 isExpense = false;
 }
 else if (type ==='pengeluaran') {
 setActiveTab('pengeluaran');
 isExpense = true;
 }
 }

 // 1. Tanggal Bayar / Pengeluaran
 const tanggalMatch = text.match(/(?:Tanggal|Tgl)\s*(?:Bayar|Pengeluaran)[^\d]*([\d]{1,2}[\/\-][\d]{1,2}[\/\-][\d]{2,4})/i);

 // 2. Nama Pelanggan / Vendor
 let detectedVendor ="";
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
 const dateFallback = text.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
 const refFallback = text.match(/\b(?:TRX|Ref|Reff|Reference)\b\s*[:\-\;\|\!#]?\s*([A-Za-z0-9\-]{5,})/i);
 const custIdPattern = text.match(/\b([A-Z]{1,3}\d{1,4})\b/i);

 // Apply
 let finalDate ="";
 if (tanggalMatch) {
 finalDate = tanggalMatch[1];
 } else if (dateFallback) {
 finalDate = dateFallback[0];
 }

 // Format Date Suffix (YYYYMMDD)
 let dateSuffix ="";
 let rawDateSuffix ="";
 if (finalDate) {
 const dParts = finalDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
 if (dParts) {
 const day = dParts[1].padStart(2,'0');
 const month = dParts[2].padStart(2,'0');
 let year = dParts[3];
 if (year.length === 2) year ="20"+ year;
 dateSuffix =`-${year}${month}${day}`;
 rawDateSuffix =`${year}${month}${day}`;
 }
 }

 // 6. Expense Specific Fields (Jenis Pembelian & SN)
 const jenisMatch = text.match(/Jenis\s*Pembelian\s*[:\-\;\|\!\.\s]*\s*([^\n\r]+)/i);
 const snMatch = text.match(/Serial\s*Number\s*[:\-\;\|\!\.\s]*\s*([^\n\r]+)/i);
 const macMatch = text.match(/MAC\s*Number\s*[:\-\;\|\!\.\s]*\s*([^\n\r]+)/i);
 const locMatch = text.match(/Location\s*[:\-\;\|\!\.\s]*\s*([^\n\r]+)/i);

 const extractedConfidence = ret.data.confidence.toFixed(0) +"%";
 setConfidence(extractedConfidence);

 // Capture values into variables for immediate DB save (since state updates are async)
 const finalVendor = detectedVendor ||"";
 const finalAmountVal = (nominalMatch ? nominalMatch[1].replace(/[^0-9]/g,'') : (amountFallback ? amountFallback[1].replace(/[^0-9]/g,'') :"0"));

 let finalReference ="";
 if (isExpense) {
 finalReference =`OUT-AUTO-${rawDateSuffix}`;
 } else {
 if (idMatch) finalReference =`TRX-${idMatch[1].trim().toUpperCase()}${dateSuffix}`;
 else if (custIdPattern) finalReference =`TRX-${custIdPattern[1].toUpperCase()}${dateSuffix}`;
 else if (refFallback) {
 const ref = refFallback[1].toUpperCase();
 const baseRef = ref.startsWith('TRX-') ? ref :`TRX-${ref}`;
 finalReference =`${baseRef}${dateSuffix}`;
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
      toast.error(`OCR failed: ${err instanceof Error ? err.message : String(err)}`);
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
 if (!amount || Number(amount.replace(/[^0-9.-]+/g,'')) === 0) {
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
 handleCancel();
 } else {
 toast.error(res?.error ||"Failed to post transaction");
 }
 setIsPosting(false);
 };

 const handleCancel = () => {
 setVendor("");
 setDate("");
 setAmount("");
 setReference("");
 setMethod("Bank Transfer");
 setConfidence("");

 setUploadedImageUrl(null);
 setIsEditing(false);
 };

 const filteredByKeterangan = transactions.filter(trx => {
 if (selectedKeterangan ==="All") return true;
 return trx.keterangan?.toLowerCase() === selectedKeterangan.toLowerCase();
 }).sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

 const totalPages = Math.ceil(filteredByKeterangan.length / itemsPerPage);
 const paginatedTransactions = filteredByKeterangan.slice(
 (currentPage - 1) * itemsPerPage,
 currentPage * itemsPerPage
 );


 const filteredTransactions = filteredByKeterangan.filter(trx =>
 (trx.id?.toLowerCase() ||"").includes(modalSearch.toLowerCase()) ||
 (trx.method?.toLowerCase() ||"").includes(modalSearch.toLowerCase()) ||
 (trx.status?.toLowerCase() ||"").includes(modalSearch.toLowerCase())
 );



 return (
 <div className="pt-4 space-y-10">
 {!isTimLapangan && (
 <>
 {/* Header & Drop Zone */}
 <div className="flex flex-col lg:flex-row gap-8 items-start">
 <div className="flex-1">
 <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight text-foreground mb-2">Receipt OCR</h1>
 <p className="text-xl font-medium text-muted-foreground max-w-2xl">Upload and verify financial documents for automated ledger entry.</p>
 </div>
 <div className="w-full lg:flex-1 flex flex-row gap-2 md:gap-4">
 <div
 onClick={() => {
 const input = document.createElement('input');
 input.type ='file';
 input.accept ='image/*';
 input.onchange = (e) => {
 handleFileUpload(e as unknown as React.ChangeEvent<HTMLInputElement>);
 };
 input.click();
 }}
 onDragOver={(e) => e.preventDefault()}
 onDrop={handleFileUpload}
 className="flex-1 bg-muted/50 border-2 border-border border-dashed rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted dark:hover:bg-muted transition-colors group"
 >
 <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-card flex items-center justify-center mb-2 md:mb-3 group-hover:bg-primary group-hover:text-white transition-colors shadow-sm shrink-0">
 <CloudUpload size={18} className="md:w-[20px] md:h-[20px] text-primary group-hover:text-white"/>
 </div>
 <span className="text-[11px] md:text-sm font-semibold text-foreground">Drag & drop slip here</span>
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
 className="flex-1 px-4 md:px-8 py-4 md:py-6 bg-muted/50 border border-border rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-muted transition-all group"
 >
 <Sparkles size={20} className="md:w-[24px] md:h-[24px] text-blue-500 group-hover:scale-110 transition-transform shrink-0"/>
 <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-muted-foreground text-center">Input Manual</span>
 </button>
 </div>
 </div>

 {/* Verification Mode Split View */}
 <div className="bg-muted/50 rounded-2xl p-3">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
 {/* Left: Uploaded Slip Image */}
 <div className="bg-card rounded-xl p-8 flex flex-col relative overflow-hidden shadow-sm border border-border/50">
 <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
 <div className="flex items-center justify-between mb-6">
 <h2 className="text-xl font-bold text-foreground">Source Document</h2>
 <div
 onClick={() => setIsZoomed(true)}
 className="px-3 py-1.5 bg-muted rounded-full text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 cursor-pointer hover:bg-muted transition-colors"
 >
 <ZoomIn size={14} />
 Zoom
 </div>
 </div>
 <div
 onClick={() => setIsZoomed(true)}
 className="w-full flex-1 min-h-[300px] md:min-h-[400px] bg-muted rounded-xl overflow-hidden relative group border border-border/50 cursor-zoom-in flex items-center justify-center"
 >
 <Image
 unoptimized
 fill
 src={uploadedImageUrl ||'/images/expense.svg'}
 alt="Receipt Source"
 fetchPriority="high"
 loading="eager"
 className="object-contain opacity-90 transition-transform duration-500 group-hover:scale-105 p-4"
 />
 {/* Scanning overlay */}
 {isScanning && (
 <div className="absolute inset-0 bg-card/60 flex flex-col items-center justify-center gap-3">
 <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/>
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
 <div className="bg-card rounded-xl p-4 md:p-10 flex flex-col justify-between shadow-sm border border-border/50">
 <div>
 <div className="flex flex-row items-center justify-between gap-2 mb-6 md:mb-8">
 <h2 className="text-xl md:text-2xl font-bold text-foreground whitespace-nowrap">Extracted Data</h2>
 </div>

 <fieldset disabled={isInitialState} className={cn("transition-opacity duration-500", isInitialState &&"opacity-50 grayscale-[25%]")}>
 {/* Income / Expense Tabs */}
 <div className="flex bg-muted/50 p-1 rounded-xl md:p-1.5 md:rounded-2xl mb-8 md:mb-10 relative">
 <m.div
 className={cn(
"absolute h-[calc(100%-12px)] top-1.5 rounded-xl shadow-sm z-0",
 activeTab ==='pemasukan'?"bg-primary":"bg-orange-500"
 )}
 animate={{
 x: activeTab ==='pemasukan'? 0 :'100%',
 width:'50%'
 }}
 transition={{ type:"spring", stiffness: 350, damping: 30 }}
 />
 <button
 onClick={() => setActiveTab('pemasukan')}
 className={cn(
"flex-1 py-1.5 md:py-2 flex flex-col items-center justify-center gap-0.5 text-[8px] sm:text-[10px] font-black uppercase tracking-wider md:tracking-widest relative z-10 transition-colors duration-300",
 activeTab ==='pemasukan'?"text-white":"text-muted-foreground"
 )}
 >
 <span>Income</span>
 <span className="opacity-70">(Pemasukan)</span>
 </button>
 <button
 onClick={() => setActiveTab('pengeluaran')}
 className={cn(
"flex-1 py-1.5 md:py-2 flex flex-col items-center justify-center gap-0.5 text-[8px] sm:text-[10px] font-black uppercase tracking-wider md:tracking-widest relative z-10 transition-colors duration-300",
 activeTab ==='pengeluaran'?"text-white":"text-muted-foreground"
 )}
 >
 <span>Expense</span>
 <span className="opacity-70">(Pengeluaran)</span>
 </button>
 </div>

 <div className="space-y-8">
 {/* Vendor Field */}
 <div className="space-y-2">
 <label htmlFor="vendor"className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Vendor / Payee</label>
 <div className="relative">
 <input
 id="vendor"
 className={cn(
"w-full bg-muted text-foreground text-sm rounded-xl px-5 py-4 border-none focus:ring-2 focus:ring-primary/20 outline-none font-semibold transition-all",
 !isInitialState &&"ring-2 ring-primary/40 bg-card"
 )}
 placeholder="e.g. PT Mega Indah"
 type="text"
 value={vendor}
 onChange={(e) => setVendor(e.target.value)}
 />
 </div>
 </div>

 {/* Date Field */}
 <div className="space-y-2">
 <label htmlFor="date"className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Transaction Date</label>
 <div className="relative">
 <input
 id="date"
 className={cn(
"w-full bg-muted text-foreground text-sm rounded-xl px-5 py-4 border-none focus:ring-2 focus:ring-primary/20 outline-none font-semibold transition-all",
 !isInitialState &&"ring-2 ring-primary/40 bg-card"
 )}
 placeholder="DD/MM/YYYY"
 type="text"
 value={date}
 onChange={(e) => {
 const newDate = e.target.value;
 setDate(newDate);

 // Fix for Reference number formatting inconsistency
 if (newDate) {
 const dParts = newDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
 if (dParts) {
 const day = dParts[1].padStart(2,'0');
 const month = dParts[2].padStart(2,'0');
 let year = dParts[3];
 if (year.length === 2) year ="20"+ year;

 setReference(prev => {
 if (!prev) return prev;

 if (activeTab ==='pengeluaran') {
 return`OUT-AUTO-${year}${month}${day}`;
 } else {
 // For income, reference is usually TRX-ID-YYYYMMDD
 const parts = prev.split('-');
 if (parts.length >= 2 && parts[0] ==='TRX') {
 const idPart = parts[1];
 // Just in case there are multiple dashes in the ID, but usually it's TRX-CUSTID-YYYYMMDD
 // Find if the last part is a date (starts with 20)
 const base = prev.replace(/-\d{8}$/,'');
 return`${base}-${year}${month}${day}`;
 }
 return prev;
 }
 });
 }
 }
 }}
 />
 </div>
 </div>

 {/* Amount Field */}
 <div className="relative space-y-2">
 <label htmlFor="amount"className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Amount</label>
 <div className="relative">
 <span className="absolute left-5 top-4 text-muted-foreground font-bold">Rp</span>
 <input
 id="amount"
 placeholder="0"
 className={cn(
"w-full bg-muted text-foreground text-xl rounded-xl pl-14 pr-12 py-4 border-none focus:ring-2 focus:ring-primary/20 outline-none font-black transition-all",
 !isInitialState &&"ring-2 ring-primary/40 bg-card"
 )}
 type="text"
 value={amount}
 onChange={(e) => setAmount(e.target.value)}
 />
 </div>
 </div>

 {/* Payment Method Field */}
 <div className="space-y-2">
 <label htmlFor="method"className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Payment Method</label>
 <select
 id="method"
 className={cn(
"w-full bg-muted text-foreground text-sm rounded-xl px-5 py-4 appearance-none border-none focus:ring-2 focus:ring-primary/20 outline-none font-semibold transition-all cursor-pointer",
 !isInitialState &&"ring-2 ring-primary/40 bg-card"
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
 <label htmlFor="reference"className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Reference No</label>
 <input
 id="reference"
 disabled={!isEditing && uploadedImageUrl !== null}
 placeholder="TRX-XXXXX"
 className={cn(
"w-full bg-muted text-foreground text-sm rounded-xl px-5 py-4 border-none outline-none font-mono font-bold transition-all",
 (!isEditing && uploadedImageUrl !== null) &&"text-muted-foreground cursor-not-allowed",
 !isInitialState &&"ring-2 ring-primary/40 bg-card"
 )}
 type="text"
 value={reference}
 onChange={(e) => setReference(e.target.value)}
 />
 <p className="text-[10px] text-muted-foreground font-medium px-1">Auto-generated based on system sequence.</p>
 </div>
 </div>

 <div className="mt-12 flex flex-col sm:flex-row gap-4">
 <button
 onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
 className="w-full sm:flex-1 rounded-xl py-4 px-4 text-sm font-bold transition-all bg-muted text-foreground hover:bg-muted"
 >
 {isEditing ?"Cancel":"Edit Details"}
 </button>
 <button
 onClick={() => isEditing ? handleSaveAndPost() : handlePost()}
 disabled={isPosting}
 className={cn(
 "w-full sm:flex-[2] text-white rounded-xl py-4 px-4 text-sm font-bold transition-all shadow-lg bg-primary hover:opacity-90 shadow-primary/25",
 isPosting && "opacity-50 cursor-not-allowed"
 )}
 >
 {isPosting ? "Processing..." : (isEditing ? "Save & Post Entry ✓" : "Confirm & Post Entry")}
 </button>
 </div>
 </fieldset>
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
 aria-label="Close Zoom"
 className="absolute -top-4 -right-4 w-12 h-12 bg-white text-foreground rounded-full flex items-center justify-center shadow-xl border border-border hover:scale-110 transition-transform z-[110]"
 onClick={() => setIsZoomed(false)}
 >
 <X size={20} />
 </button>

 <Image
 unoptimized
 width={800}
 height={800}
 src={uploadedImageUrl ||'/images/expense.svg'}
 className="w-auto max-h-[75vh] object-contain rounded-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] border-4 border-white/20"
 alt="Receipt Zoom"
 />
 </m.div>
 </m.div>
 )}
 </AnimatePresence>
 </>
 )}

 {/* Recent Transactions Table List */}
 <div className="space-y-6 relative overflow-hidden">
 <div className="flex flex-col gap-4">
 <div className="flex items-center justify-between">
 <h2 className="text-2xl md:text-3xl font-bold text-foreground">Recent Processed Slips</h2>
 <button
 onClick={() => setIsModalOpen(true)}
 className="text-primary text-[10px] md:text-sm font-bold hover:underline flex items-center gap-1 shrink-0 whitespace-nowrap"
 >
 View All <ChevronRight size={14} className="md:w-[16px] md:h-[16px]"/>
 </button>
 </div>

 <div className="flex flex-row items-center gap-2 md:gap-4 w-full md:w-auto">
 <div className="relative flex-1 sm:flex-none min-w-[120px] sm:min-w-[160px]">
 <select
 aria-label="Filter by Type"
 value={selectedKeterangan}
 onChange={(e) => {
 setSelectedKeterangan(e.target.value);
 setCurrentPage(1);
 }}
 className="w-full bg-muted border-none rounded-xl pl-3 pr-8 md:px-5 py-2.5 md:py-2 text-[10px] md:text-xs font-bold text-muted-foreground focus:ring-4 focus:ring-primary/10 transition-all outline-none appearance-none shadow-sm"
 >
 <option value="All">Semua Transaksi</option>
 <option value="pemasukan">Income (Pemasukan)</option>
 <option value="pengeluaran">Outcome (Pengeluaran)</option>
 </select>
 <FilterIcon size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
 </div>

 <button
 onClick={() => exportToExcel(filteredByKeterangan,'finance_report.xlsx')}
 className="bg-muted text-muted-foreground p-2.5 md:p-2.5 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 transition-all flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-4 shadow-sm border border-border/50 flex-1 sm:flex-none whitespace-nowrap"
 title="Export to Excel"
 >
 <Download size={14} className="md:w-[18px] md:h-[18px]"/>
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">Export Excel</span>
              </button>
            </div>
          </div>

          <div id="finance-table" className="bg-card border border-border/50 rounded-2xl w-full overflow-hidden">
 {/* Table Header (Hidden on Mobile) */}
 <div className="hidden md:grid grid-cols-12 gap-2 px-8 py-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border mb-1">
 <div className="col-span-1">LNK-ID</div>
 <div className="col-span-4">TRX-ID & Method</div>
 <div className="col-span-2">City</div>
 <div className="col-span-2 text-left">Amount</div>
 <div className="col-span-1 text-center">Status</div>
 <div className="col-span-2 text-right">Timestamp</div>
 </div>

 {/* Transaction Rows */}
 {loadingTx ? (
 SKELETON_ROWS.map((_, index) => (
 <div
 key={index}
 className="h-20 md:h-[72px] bg-card rounded-xl border border-border/50 shadow-sm animate-pulse"
 />
 ))
 ) : paginatedTransactions.length === 0 ? (
 <div className="text-center py-10 text-muted-foreground font-medium">No transactions found.</div>
 ) : (
 paginatedTransactions.map((trx, index) => {
 const isExpanded = !!expandedTransactions[trx.id];
 return (
 <m.div
 key={`${trx.id}-${index}`}
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: 0.3 + index * 0.1 }}
 className={cn(
"flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 md:items-center px-4 md:px-8 py-4 hover:bg-muted dark:hover:bg-muted/50 transition-all cursor-pointer border-b border-border/50 last:border-b-0 relative overflow-hidden",
 trx.isWarning &&"border-orange-500/20"
 )}
 >
 {trx.isWarning && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}

 {/* --- MOBILE VIEW (Card Layout) --- */}
 <div className="flex flex-col md:hidden w-full gap-3">
 {/* Collapsed Header Click Container */}
 <div
 onClick={() => toggleTransactionExpand(trx.id)}
 className="flex items-center justify-between cursor-pointer gap-2"
 >
 {/* Left: ID, LNK & Amount */}
 <div className="flex-1 min-w-0">
 <p className="text-[12px] font-mono font-black text-foreground truncate">{trx.id}</p>
 <div className="flex items-center gap-1.5 mt-1">
 <p className="text-[10px] font-mono font-bold text-muted-foreground">LNK: {trx.linked_id ||"-"}</p>
 <span className="text-[10px] text-slate-200 dark:text-foreground">|</span>
 <span className="text-[11px] font-black text-primary dark:text-blue-400">
 {String(trx.amount).startsWith('Rp') ? trx.amount : new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits: 0 }).format(Number(String(trx.amount).replace(/[^0-9]/g,'')))}
 </span>
 </div>
 </div>

 {/* Right: Status Pill & Chevron Icon */}
 <div className="flex items-center gap-2 shrink-0">
 <div className={cn(
"px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider",
 trx.status ==="Verified"?"bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400 ring-1 ring-green-500/20":"bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 ring-1 ring-orange-500/20"
 )}>
 {trx.status}
 </div>

 {/* Chevron Container */}
 <div
 className={cn(
"w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center transition-all duration-300",
 isExpanded &&"bg-primary/10 text-primary dark:text-blue-400 rotate-180"
 )}
 >
 <ChevronDown size={14} />
 </div>
 </div>
 </div>

 {/* Collapsible Accordion Block */}
 <AnimatePresence initial={false}>
 {isExpanded && (
 <m.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height:"auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 transition={{ duration: 0.2 }}
 className="overflow-hidden"
 >
 <div className="pt-3 mt-2 border-t border-border space-y-3">
 <div className="grid grid-cols-2 gap-3 bg-muted p-3 rounded-xl">
 <div>
 <span className="text-[9px] font-bold text-muted-foreground block uppercase mb-0.5">Method</span>
 <span className="text-[11px] font-bold text-foreground">{trx.method}</span>
 </div>
 <div className="text-right">
 <span className="text-[9px] font-bold text-muted-foreground block uppercase mb-0.5">Type</span>
 <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
 {trx.type}
 </span>
 </div>

 <div>
 <span className="text-[9px] font-bold text-muted-foreground block uppercase mb-0.5">City</span>
 <span className="text-[11px] font-medium text-muted-foreground truncate block">{trx.city ||"-"}</span>
 </div>
 <div className="text-right">
 <span className="text-[9px] font-bold text-muted-foreground block uppercase mb-0.5">Amount</span>
 <span className="text-sm font-black text-foreground">
 {String(trx.amount).startsWith('Rp') ? trx.amount : new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits: 0 }).format(Number(String(trx.amount).replace(/[^0-9]/g,'')))}
 </span>
 </div>
 </div>

 {/* Timestamp */}
 <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground font-mono pt-1"style={{ fontFamily:'monospace'}}>
 <span>Timestamp</span>
 <span>
 {formatTimestamp(trx.timestamp)}
 </span>
 </div>
 </div>
 </m.div>
 )}
 </AnimatePresence>
 </div>

 {/* --- DESKTOP VIEW (Grid Layout) --- */}
 {/* 1. Linked ID (Customer) - Subtle Text */}
 <div className="hidden md:block col-span-1 text-[11px] font-medium text-muted-foreground truncate">
 {trx.linked_id ||"-"}
 </div>

 {/* 2. Transaction ID & Details - Clean Tag & Subtext */}
 <div className="hidden md:flex flex-col gap-1 items-start justify-center col-span-4 overflow-hidden pr-4">
 <div className="font-mono text-[11px] font-bold text-foreground bg-muted/60 px-2 py-1 rounded-md border border-border/50 /50 truncate max-w-full">
 {trx.id}
 </div>
 <div className="flex items-center gap-1.5 text-[10px] font-semibold">
 <span className="text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
 {trx.type}
 </span>
 <span className="text-muted-foreground dark:text-muted-foreground">•</span>
 <span className="text-muted-foreground">
 {trx.method}
 </span>
 </div>
 </div>

 {/* 3. City - Medium Text */}
 {/* UPDATE: Hapus kelas"justify"yang salah */}
 <div className="hidden md:block col-span-2 text-xs font-medium text-muted-foreground truncate">
 {trx.city ||"-"}
 </div>

 {/* 4. Amount - Focal Point (Emerald) */}
 {/* UPDATE: Ganti"justify"menjadi"text-right"*/}
 <div className="hidden md:block col-span-2 text-left text-sm font-black text-emerald-600 dark:text-emerald-400 truncate">
 {trx.amount}
 </div>

 {/* 5. Status - Modern Pastel Badge */}
 <div className="hidden md:flex col-span-1 justify-center">
 <div className={cn(
"px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest",
 trx.status ==="Verified"
 ?"bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
 :"bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
 )}>
 {trx.status}
 </div>
 </div>

 {/* 6. Timestamp - Subtle Monospace */}
 <div className="hidden md:block col-span-2 text-right text-[11px] font-medium text-muted-foreground truncate">
 {formatTimestamp(trx.timestamp)}
 </div>
 </m.div>
 );
 })
 )}
 </div>        {/* Pagination Controls */}
        {filteredByKeterangan.length > 0 && (
          <div className="p-3 sm:p-6 lg:p-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 bg-muted/30 dark:bg-white/5 rounded-b-[2.5rem]">
            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground text-center sm:text-left hidden sm:block">
              Showing <span className="text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-foreground">{Math.min(currentPage * itemsPerPage, filteredByKeterangan.length)}</span> of <span className="text-foreground">{filteredByKeterangan.length}</span> results
            </p>
            <div className="flex items-center gap-2 sm:gap-2 w-full sm:w-auto justify-center sm:justify-end">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-xl border border-border text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-muted transition-all text-muted-foreground shrink-0"
              >
                Previous
              </button>
              
              {/* Desktop Numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum = currentPage <= 3 ? i + 1 : (currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i);
                  if (pageNum <= 0 || pageNum > totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                        currentPage === pageNum ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground dark:hover:text-white"
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Mobile Compact Text */}
              <div className="flex sm:hidden items-center justify-center px-1">
                 <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest bg-muted dark:bg-white/5 px-3 py-1.5 rounded-lg">
                   {currentPage} / {totalPages}
                 </span>
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-xl border border-border text-[10px] sm:text-xs font-bold disabled:opacity-50 hover:bg-white dark:hover:bg-muted transition-all text-muted-foreground shrink-0"
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
              className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Drawer Panel - Contained */}
            <m.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="relative w-full max-w-xl h-full bg-white dark:bg-slate-950 shadow-2xl flex flex-col border-l border-border"
            >
              {/* Header Section - Condensed */}
              <div className="p-6 border-b border-border bg-white dark:bg-slate-950 sticky top-0 z-20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-black text-foreground tracking-tight">Full Transaction Log</h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-muted dark:hover:bg-slate-800 rounded-xl text-muted-foreground transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

 {/* Search Bar */}
 <div className="relative">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"size={16} />
 <input
 type="text"
 placeholder="Search ID, method..."
 value={modalSearch}
 onChange={(e) => setModalSearch(e.target.value)}
 className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
 />
 </div>
 </div>

 {/* Condensed List */}
 <div className="flex-1 overflow-y-auto custom-scrollbar">
 <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
 {filteredTransactions.map((trx, index) => (
 <div
 key={`${trx.id}-${index}`}
 className="flex items-center justify-between px-6 py-4 hover:bg-muted dark:hover:bg-muted/30 transition-all cursor-pointer"
 >
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-muted text-muted-foreground">
 {trx.type ==='qris'? <QrCode size={16} /> : <Building2 size={16} />}
 </div>
 <div>
 <p className="text-xs font-bold text-foreground">{trx.method}</p>
 <p className="text-[9px] font-mono font-bold text-muted-foreground mt-0.5">{trx.id}</p>
 </div>
 </div>
 <div className="text-right">
 <p className="text-sm font-black text-foreground">{trx.amount}</p>
 <p className="text-[9px] font-medium text-muted-foreground">
 {typeof trx.timestamp ==='object'&& trx.timestamp !== null ? (trx.timestamp as Date).toLocaleString('id-ID') : trx.timestamp}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Footer */}
 <div className="p-4 border-t border-border bg-muted/50 text-center">
 <button
 onClick={() => setIsModalOpen(false)}
 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
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
 className="bg-card rounded-[2.5rem] p-12 max-w-md w-full shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] border border-border text-center relative overflow-hidden pointer-events-auto"
 >
 <div className="absolute top-0 left-0 right-0 h-2 bg-orange-500"></div>
 <div className="w-16 h-16 bg-orange-50 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-8 rotate-12">
 <AlertCircle size={32} className="text-orange-500 -rotate-12"/>
 </div>
 <h3 className="text-2xl font-black text-foreground mb-3 tracking-tight">DUPLICATE DETECTED</h3>
 <p className="text-muted-foreground text-sm font-medium mb-10 leading-relaxed px-4">
 Reference <span className="font-mono font-bold text-foreground bg-muted px-1.5 py-0.5 rounded">{reference}</span> is already in use. Please verify to avoid double bookkeeping.
 </p>
 <div className="flex flex-col gap-3">
 <button
 onClick={() => handlePost(true)}
 className="w-full bg-card dark:bg-muted text-white dark:text-foreground rounded-2xl py-4 text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
 >
 Post Anyway
 </button>
 <button
 onClick={() => setShowDuplicateWarning(false)}
 className="w-full bg-muted text-muted-foreground rounded-2xl py-4 text-xs font-black uppercase tracking-widest hover:bg-muted transition-all"
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