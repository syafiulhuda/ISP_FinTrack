"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

export function PwaUpdater() {
  const [showReload, setShowReload] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const onUpdateFound = (registration: ServiceWorkerRegistration) => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        // Ketika update sudah berhasil didownload dan menunggu untuk diaktifkan
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          setWaitingWorker(newWorker);
          setShowReload(true);
        }
      });
    };

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;

      // Cek apakah sudah ada worker yang menunggu sebelumnya
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
        setShowReload(true);
      }

      // Dengarkan jika ada versi baru yang terdeteksi
      registration.addEventListener("updatefound", () => onUpdateFound(registration));
    });

    // Ketika worker baru mengambil alih, otomatis reload halaman
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const reloadPage = () => {
    if (waitingWorker) {
      // Perintahkan worker baru untuk langsung mengambil alih (skip waiting)
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
    setShowReload(false);
  };

  return (
    <AnimatePresence>
      {showReload && (
        <m.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed bottom-6 right-6 left-6 md:left-auto z-[9999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 md:w-80"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-slate-900 dark:text-white font-black text-sm">Versi Baru Tersedia!</h4>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed font-medium">
                Pembaruan aplikasi telah diunduh. Muat ulang sekarang untuk menggunakan fitur terbaru.
              </p>
            </div>
            <button 
              onClick={() => setShowReload(false)} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors shrink-0"
              aria-label="Tutup notifikasi update"
            >
              <X size={14} />
            </button>
          </div>
          <button
            onClick={reloadPage}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
          >
            <RefreshCw size={14} />
            Muat Ulang Sekarang
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}
