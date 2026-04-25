import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

import QueryProvider from "@/components/providers/QueryProvider";

export const metadata: Metadata = {
  title: "ISP-FinTrack - Financial Management for ISPs",
  description: "Enterprise finance, profitability analysis, and inventory management for ISPs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300`}>
        <QueryProvider>
          <ClientLayout>
            {children}
            <Toaster position="top-right" richColors />
          </ClientLayout>
        </QueryProvider>
      </body>
    </html>
  );
}
