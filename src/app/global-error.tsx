'use client';

import { useEffect } from'react';
import { logger } from'@/lib/logger';
import { AlertCircle, RotateCcw } from'lucide-react';

export default function GlobalError({
 error,
 reset,
}: {
 error: Error & { digest?: string };
 reset: () => void;
}) {
 useEffect(() => {
 // Log the error to our centralized logger
 logger.error({
 message:'Global Uncaught Exception',
 error: error,
 path:'global',
 context: { digest: error.digest }
 });
 }, [error]);

 return (
 <html>
 <body>
 <div className="min-h-screen bg-muted flex items-center justify-center p-4">
 <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center space-y-6">
 <div className="w-16 h-16 bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
 <AlertCircle size={32} />
 </div>
 
 <div className="space-y-2">
 <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Critical Error</h2>
 <p className="text-sm font-medium text-muted-foreground">
 A fatal error occurred. We have been notified and are looking into it.
 </p>
 </div>

 <button
 onClick={() => reset()}
 className="w-full py-4 bg-card text-white rounded-2xl font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
 >
 <RotateCcw size={16} /> Try Again
 </button>
 </div>
 </div>
 </body>
 </html>
 );
}
