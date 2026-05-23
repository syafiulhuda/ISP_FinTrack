"use client";

import { useState, useEffect, useRef } from "react";
import { X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    snap: any;
  }
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  redirectUrl: string;
  orderId: string;
}

export function PaymentModal({ isOpen, onClose, token, redirectUrl, orderId }: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const snapInitialized = useRef(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleClose = () => {
    if (window.snap && typeof window.snap.hide === 'function') {
      try { window.snap.hide(); } catch (e) { }
    }
    snapInitialized.current = false;
    onClose();
  };

  useEffect(() => {
    if (!isOpen || !token) {
      snapInitialized.current = false;
      return;
    }

    setIsLoading(true);

    // Determine Sandbox vs Production script
    const isProd = redirectUrl.includes("app.midtrans.com");
    const scriptUrl = isProd
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

    // Check if script is already loaded
    let script = document.querySelector(`script[src="${scriptUrl}"]`) as HTMLScriptElement;

    const initializeSnap = () => {
      if (window.snap && !snapInitialized.current) {
        snapInitialized.current = true;
        try {
          // Clear container first to prevent double rendering
          const container = document.getElementById("snap-container");
          if (container) container.innerHTML = "";

          if (typeof window.snap.hide === 'function') {
            try { window.snap.hide(); } catch (e) { }
          }

          window.snap.embed(token, {
            embedId: "snap-container",
            onSuccess: function (result: any) {
              console.log("Payment success:", result);
              handleClose();
            },
            onPending: function (result: any) {
              console.log("Payment pending:", result);
              handleClose();
            },
            onError: function (result: any) {
              console.error("Payment error:", result);
              handleClose();
            },
            onClose: function () {
              console.log("Customer closed payment modal");
              handleClose();
            }
          });
        } catch (err) {
          console.error("Snap embed error:", err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (!script) {
      script = document.createElement("script");
      script.src = scriptUrl;
      script.onload = initializeSnap;
      script.onerror = () => {
        setIsLoading(false);
        snapInitialized.current = false;
        toast.error("Gagal memuat sistem pembayaran Midtrans. Cek koneksi Anda.");
        handleClose();
      };
      document.body.appendChild(script);
    } else {
      if (window.snap) {
        initializeSnap();
      } else {
        script.addEventListener("load", initializeSnap);
      }
    }

    return () => {
      if (script) {
        script.removeEventListener("load", initializeSnap);
      }
    };
  }, [isOpen, token, redirectUrl]); // Removed onClose from deps to prevent unnecessary re-runs

  if (!isOpen) return null;

  return (
    <div className="fixed top-16 bottom-0 left-0 lg:left-64 right-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 lg:p-6 animate-in fade-in duration-300">
      {/* UPDATE: Membatasi tinggi maksimum (max-h) dari modal agar tidak menembus layar bawah, 
          khususnya pada layar landscape/tablet, dan membiarkan konten di dalamnya yang melakukan scroll */}
      <div className="w-full h-full max-h-[85vh] lg:h-auto lg:max-w-[520px] bg-white dark:bg-slate-900 flex flex-col overflow-hidden rounded-2xl lg:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative">

        {/* Floating Close Button - TETAP */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-[60] w-8 h-8 flex items-center justify-center bg-slate-100/90 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full backdrop-blur-md shadow-sm transition-all"
          aria-label="Close payment modal"
        >
          <X size={18} />
        </button>

        {/* Embedded Container Area */}
        <div className="flex-1 w-full bg-slate-50 dark:bg-slate-950 relative overflow-y-auto overflow-x-hidden scrollable-area">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50/80 dark:bg-slate-950/80 z-10">
              <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading secure payment screen...</p>
            </div>
          )}
          <style dangerouslySetInnerHTML={{
            __html: `
            .scrollable-area::-webkit-scrollbar {
              width: 6px;
            }
            .scrollable-area::-webkit-scrollbar-track {
              background: transparent;
            }
            .scrollable-area::-webkit-scrollbar-thumb {
              background-color: #cbd5e1;
              border-radius: 10px;
            }
            .dark .scrollable-area::-webkit-scrollbar-thumb {
              background-color: #334155;
            }
            /* Menyesuaikan iframe midtrans agar tidak memaksa tinggi berlebih */
            #snap-container iframe {
              min-height: 500px !important;
            }
          `}} />

          {/* UPDATE: Menghapus min-h-[700px] yang menyebabkan ruang kosong besar di bagian bawah */}
          <div id="snap-container" className="w-full min-h-[500px] h-full" />
        </div>
      </div>
    </div>
  );
}