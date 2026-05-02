import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  /** Teks yang muncul di bawah spinner. Default: "Memuat data..." */
  message?: string;
  /** Ukuran spinner. Default: "md" */
  size?: "sm" | "md" | "lg";
  /** Tinggi minimum container. Default: "60vh" */
  minHeight?: string;
}

export function LoadingState({
  message = "Memuat data...",
  size = "md",
  minHeight = "60vh",
}: LoadingStateProps) {
  const sizeMap = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 w-full"
      style={{ minHeight }}
    >
      <div className="relative flex items-center justify-center">
        <Loader2
          className={`animate-spin text-primary ${sizeMap[size]}`}
        />
        <div className={`absolute inset-0 border-4 border-primary/10 rounded-full ${sizeMap[size]}`} />
      </div>
      {message && (
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
