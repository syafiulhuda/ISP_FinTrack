"use client";

import { useState, useEffect } from "react";
import { Download, Share, PlusSquare } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

export function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Detect if already installed (standalone mode)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone || document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    // Listen for Android install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSPrompt(true);
      return;
    }
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // If already installed, hide the button
  if (isStandalone) return null; 
  
  // Only show if we have an install prompt (Android/Desktop) or if it's iOS (where we show instructions)
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="group w-full flex items-center space-x-3 px-4 py-2 mt-4 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-xl transition-all border border-indigo-100 dark:border-indigo-500/20"
      >
        <Download size={20} className="group-hover:scale-110 transition-transform shrink-0" />
        <span className="text-[12px] font-bold truncate min-w-0">Install App (PWA)</span>
      </button>

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIOSPrompt && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowIOSPrompt(false)}>
            <m.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-800"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-black text-xl mb-6 text-center tracking-tight">Install on iOS</h3>
              <div className="flex flex-col items-center space-y-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                <p className="text-center w-full mb-2 text-slate-500">To install this app on your iPhone or iPad, follow these simple steps:</p>
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 px-5 py-4 rounded-2xl w-full border border-slate-100 dark:border-slate-800">
                  <span className="bg-white dark:bg-slate-700 shadow-sm text-slate-700 dark:text-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-black shrink-0">1</span>
                  <span>Tap the <Share size={20} className="inline mx-1 text-blue-500" /> <strong>Share</strong> icon on the Safari bottom bar.</span>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 px-5 py-4 rounded-2xl w-full border border-slate-100 dark:border-slate-800">
                  <span className="bg-white dark:bg-slate-700 shadow-sm text-slate-700 dark:text-slate-200 w-8 h-8 rounded-full flex items-center justify-center font-black shrink-0">2</span>
                  <span>Scroll down and select <strong>"Add to Home Screen"</strong> <PlusSquare size={18} className="inline mx-1 text-slate-400" /></span>
                </div>
                <button 
                  onClick={() => setShowIOSPrompt(false)}
                  className="w-full mt-6 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:opacity-90 transition-opacity"
                >
                  I Understand
                </button>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
