'use client';

import { useEffect } from'react';
import { logger } from'@/lib/logger';
import { AlertCircle, RotateCcw } from'lucide-react';

export default function ErrorPage({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 useEffect(() => {
 // Log the error to our centralized logger
 logger.error({
 message:'Route Error Exception',
 error: error,
 path: window.location.pathname,
 context: { digest: error.digest }
 });
 }, [error]);

 return (
 <div className="min-h-[70vh] flex items-center justify-center p-4">
 <div className="max-w-md w-full bg-card rounded-3xl p-8 shadow-sm border border-border text-center space-y-6">
 <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
 <AlertCircle size={32} />
 </div>
 
 <div className="space-y-2">
 <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Something went wrong</h2>
 <p className="text-sm font-medium text-muted-foreground">
 An unexpected error occurred on this page. We have logged this issue.
 </p>
 </div>

 <button
 onClick={() => reset()}
 className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20"
 >
 <RotateCcw size={16} /> Try Again
 </button>
 </div>
 </div>
 );
}
