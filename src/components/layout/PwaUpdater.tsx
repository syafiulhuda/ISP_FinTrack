"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, X, Download } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

export function PwaUpdater() {
  const [showReload, setShowReload] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const promptUpdate = useCallback((worker: ServiceWorker) => {
    setWaitingWorker(worker);
    setShowReload(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // ── Deteksi update dari worker yang baru di-install ──
    const onUpdateFound = (registration: ServiceWorkerRegistration) => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", () => {
        // Worker baru sudah didownload & menunggu aktivasi
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          promptUpdate(newWorker);
        }
      });
    };

    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;

      // Cek apakah sudah ada worker yang menunggu (misal dari tab lain)
      if (registration.waiting && navigator.serviceWorker.controller) {
        promptUpdate(registration.waiting);
      }

      // Dengarkan update baru
      registration.addEventListener("updatefound", () => onUpdateFound(registration));

      // ── Polling: cek update setiap 30 menit ──
      // Penting untuk long-lived tabs (tab tidak ditutup berhari-hari)
      const POLL_INTERVAL_MS = 30 * 60 * 1000;
      const pollInterval = setInterval(() => {
        registration.update().catch(() => {
          // Silently ignore — offline atau network error
        });
      }, POLL_INTERVAL_MS);

      return () => clearInterval(pollInterval);
    });

    // ── Auto-reload setelah SW baru mengambil kontrol ──
    let refreshing = false;
    const onControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, [promptUpdate]);

  const handleUpdate = () => {
    if (!waitingWorker) return;
    setIsUpdating(true);
    // Perintahkan SW baru untuk langsung aktif (trigger skipWaiting)
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    // Controllerchange event akan trigger auto-reload di atas
    setShowReload(false);
  };

  return (
    <AnimatePresence>
      {showReload && (
        <m.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="fixed bottom-6 right-6 left-6 md:left-auto z-[9999] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden md:w-80"
          role="alert"
          aria-live="polite"
        >
          {/* Accent bar top */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-500 to-cyan-400" />

          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Download size={15} />
                </div>
                <div>
                  <h4 className="text-foreground font-black text-sm">Pembaruan Tersedia</h4>
                  <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed font-medium">
                    Silakan refresh/muat ulang halaman. Ini akan memperbarui aplikasi PWA secara otomatis ke versi terbaru.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReload(false)}
                className="text-muted-foreground hover:text-foreground p-1 bg-muted hover:bg-muted/80 rounded-lg transition-colors shrink-0"
                aria-label="Tutup notifikasi update"
              >
                <X size={14} />
              </button>
            </div>

            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-70"
            >
              <RefreshCw size={14} className={isUpdating ? "animate-spin" : ""} />
              {isUpdating ? "Memperbarui..." : "Muat Ulang Sekarang"}
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
