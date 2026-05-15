import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
});

import QueryProvider from "@/components/providers/QueryProvider";
import { FramerProvider } from "@/components/providers/FramerProvider";

export const metadata: Metadata = {
  title: "ISP-FinTrack - Financial Management for ISPs",
  description: "Enterprise finance, profitability analysis, and inventory management for ISPs.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.className} min-h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-x-hidden`}>
        <QueryProvider>
          <FramerProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </FramerProvider>
        </QueryProvider>
        <SpeedInsights />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
