import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string): string {
  const numericAmount = typeof amount === 'string' 
    ? parseInt(amount.replace(/[^0-9]/g, '')) || 0 
    : amount;
    
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount).replace('Rp', 'Rp ');
}

export function formatNumber(num: number | string): string {
  const numericNum = typeof num === 'string' ? parseInt(num) || 0 : num;
  return new Intl.NumberFormat('id-ID').format(numericNum);
}
