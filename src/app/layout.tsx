import type { Metadata, Viewport } from"next";
import { Inter } from"next/font/google";
import"./globals.css";
import { ClientLayout } from"@/components/layout/ClientLayout";
import { Toaster } from"sonner";
import { SpeedInsights } from"@vercel/speed-insights/next";

const inter = Inter({
 variable:"--font-inter",
 subsets: ["latin"],
 display:'swap',
});

import QueryProvider from"@/components/providers/QueryProvider";
import { FramerProvider } from"@/components/providers/FramerProvider";

export const metadata: Metadata = {
 title:"ISP-FinTrack - Financial Management for ISPs",
 description:"Enterprise finance, profitability analysis, and inventory management for ISPs.",
 appleWebApp: {
 capable: true,
 statusBarStyle:'default',
 title:'ISP-FinTrack',
 },
 formatDetection: {
 telephone: false,
 },
};

export const viewport: Viewport = {
 width:"device-width",
 initialScale: 1,
 maximumScale: 1,
 userScalable: false,
 themeColor:"#0f172a",
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <html lang="en"className={`${inter.variable} h-full antialiased`} data-scroll-behavior="smooth"suppressHydrationWarning>
 <body suppressHydrationWarning className={`${inter.className} min-h-full bg-background text-foreground overflow-x-hidden`}>
 <QueryProvider>
 <FramerProvider>
 <ClientLayout>
 {children}
 </ClientLayout>
 </FramerProvider>
 </QueryProvider>
 <SpeedInsights />
 <Toaster position="top-right"richColors />
 </body>
 </html>
 );
}
