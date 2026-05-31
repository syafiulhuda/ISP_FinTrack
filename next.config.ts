import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: false,
  register: true,
  // File custom kita di-inject ke dalam sw.js yang di-generate Workbox
  customWorkerSrc: "sw-custom.js",
  // SW baru langsung aktif tanpa menunggu semua tab ditutup
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: [],
  turbopack: {},
  // Membuka akses HMR (Hot Reloading) untuk IP HP Anda
  allowedDevOrigins: ['10.203.217.55'],
  async headers() {
    return [
      {
        // Service Worker harus selalu fresh — jangan di-cache oleh HTTP layer
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ]
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on"
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin"
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://app.sandbox.midtrans.com https://app.midtrans.com https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://ui-avatars.com https://images.unsplash.com https://plus.unsplash.com https://app.sandbox.midtrans.com https://app.midtrans.com; connect-src 'self' https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://app.sandbox.midtrans.com https://app.midtrans.com https://api.sandbox.midtrans.com https://api.midtrans.com https://tessdata.projectnaptha.com https://unpkg.com https://cdn.jsdelivr.net; font-src 'self' data:; frame-src 'self' https://app.sandbox.midtrans.com https://app.midtrans.com; frame-ancestors 'none'; worker-src 'self' blob:;"
          }
        ]
      }
    ];
  }
};

export default withPWA(nextConfig);