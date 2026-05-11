import { ReactNode } from 'react';

// 60 seconds timeout for Vercel Free Tier (specifically for OCR in the Finance page)
export const maxDuration = 60;

export default function FinanceLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
