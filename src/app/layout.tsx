import type { Metadata, Viewport } from"next";
import { Inter } from"next/font/google";
import"./globals.css";
import { ClientLayout } from"@/components/layout/ClientLayout";
import { Toaster } from"sonner";
import { SpeedInsights } from"@vercel/speed-insights/next";
import Script from "next/script";

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
 icons: {
 icon: '/icon.svg',
 apple: '/icon.svg',
 },
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
  // Blocking inline script to prevent FOUC (Flash of Unstyled Content)
  // It reads localStorage synchronously and applies the theme variables and dark mode class before the first paint.
  const themeInitScript = `
    (function() {
      try {
        var settingsStr = localStorage.getItem("isp_fintrack_settings");
        var isDark = false;
        if (settingsStr) {
          var settings = JSON.parse(settingsStr);
          if (settings.darkModePreference === 'system') {
            isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          } else {
            isDark = !!settings.darkModeEnabled;
          }
        }
        
        var htmlElement = document.documentElement;
        if (isDark) {
          htmlElement.classList.add('dark');
        } else {
          htmlElement.classList.remove('dark');
        }

        var themeCss = localStorage.getItem("isp_fintrack_theme_css");
        if (themeCss) {
          htmlElement.style.cssText = themeCss;
        }
      } catch (e) {
        console.error('Theme initialization failed', e);
      }
    })();
  `;

  return (
  <html lang="en" className={`${inter.variable} h-full antialiased`} data-scroll-behavior="smooth" suppressHydrationWarning>
  <head>
    <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
  </head>
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
