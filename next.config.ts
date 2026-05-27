import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: false, // Diaktifkan agar bisa testing PWA Install di local
  register: true,
  workboxOptions: {
    skipWaiting: false,
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
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://app.sandbox.midtrans.com https://app.midtrans.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://ui-avatars.com https://images.unsplash.com https://plus.unsplash.com https://app.sandbox.midtrans.com https://app.midtrans.com; connect-src 'self' https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://app.sandbox.midtrans.com https://app.midtrans.com https://api.sandbox.midtrans.com https://api.midtrans.com; font-src 'self' data:; frame-src 'self' https://app.sandbox.midtrans.com https://app.midtrans.com; frame-ancestors 'none'; worker-src 'self';"
          }
        ]
      }
    ];
  }
};

export default withPWA(nextConfig);